import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.cache import _memory_cache, cache_delete_pattern
from app.api.deps import require_admin
from app.models.user import User
from app.models.movie import Movie, Genre, MovieGenre
from app.models.rating import Rating
from app.models.watchlist import Watchlist
from app.services.recommendation_service import train_ml_recommender

router = APIRouter(prefix="/admin", tags=["Administration"])


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminUserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(USER|CRITIC|MODERATOR|ADMIN)$")


class AdminMovieCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    overview: str = Field(..., min_length=10)
    release_date: Optional[str] = None
    runtime_minutes: Optional[int] = 120
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    vote_average: Optional[float] = 7.5
    genre_ids: List[int] = Field(default_factory=list)


@router.post("/login")
async def admin_login(data: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.lower().strip(), User.deleted_at.is_(None)))
    user = result.scalars().first()

    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials.")

    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User does not have Administrator privileges.",
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
        extra_claims={"email": user.email, "username": user.username},
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
        },
    }


@router.get("/stats")
async def get_admin_stats(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_movies = await db.scalar(select(func.count(Movie.id)))
    total_users = await db.scalar(select(func.count(User.id)).where(User.deleted_at.is_(None)))
    total_ratings = await db.scalar(select(func.count(Rating.id)))
    total_watchlists = await db.scalar(select(func.count(Watchlist.id)))
    total_genres = await db.scalar(select(func.count(Genre.id)))

    # Compute average rating
    avg_rating = await db.scalar(select(func.avg(Rating.rating_value))) or 0.0

    return {
        "total_movies": total_movies or 0,
        "total_users": total_users or 0,
        "total_ratings": total_ratings or 0,
        "total_watchlists": total_watchlists or 0,
        "total_genres": total_genres or 0,
        "average_community_rating": round(float(avg_rating), 2),
        "cache_entries_count": len(_memory_cache),
        "ml_model_status": "Operational (Factorized Feature Model)",
    }


@router.get("/users")
async def list_admin_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.deleted_at.is_(None))
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            func.lower(User.email).like(term) |
            func.lower(User.username).like(term) |
            func.lower(User.display_name).like(term)
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0

    stmt = stmt.order_by(desc(User.created_at)).offset((page - 1) * limit).limit(limit)
    users = (await db.execute(stmt)).scalars().all()

    items = []
    for u in users:
        # Count user ratings
        rating_count = await db.scalar(select(func.count(Rating.id)).where(Rating.user_id == u.id)) or 0
        items.append({
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "display_name": u.display_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "ratings_count": rating_count,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    data: AdminUserRoleUpdate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if str(user_id) == str(admin_user.id) and data.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote your own active Administrator account.",
        )

    target_user = await db.get(User, user_id)
    if not target_user or target_user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    target_user.role = data.role
    await db.commit()
    await db.refresh(target_user)

    return {
        "id": str(target_user.id),
        "email": target_user.email,
        "username": target_user.username,
        "role": target_user.role,
    }


@router.get("/movies")
async def list_admin_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Movie)
        .options(selectinload(Movie.genres).selectinload(MovieGenre.genre))
    )

    if search:
        stmt = stmt.where(func.lower(Movie.title).like(f"%{search.strip().lower()}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0

    stmt = stmt.order_by(desc(Movie.created_at)).offset((page - 1) * limit).limit(limit)
    movies = (await db.execute(stmt)).scalars().all()

    items = []
    for m in movies:
        genre_names = [mg.genre.name for mg in m.genres if mg.genre] if m.genres else []
        items.append({
            "id": str(m.id),
            "tmdb_id": m.tmdb_id,
            "title": m.title,
            "release_date": m.release_date.isoformat() if m.release_date else None,
            "runtime_minutes": m.runtime_minutes,
            "vote_average": float(m.vote_average),
            "vote_count": m.vote_count,
            "popularity_score": float(m.popularity_score),
            "poster_path": m.poster_path,
            "genres": genre_names,
        })

    return {"items": items, "total": total, "page": page, "limit": limit}


@router.post("/movies", status_code=status.HTTP_201_CREATED)
async def create_admin_movie(
    data: AdminMovieCreate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    import random
    from datetime import date

    # Generate synthetic TMDB ID if custom
    synthetic_tmdb = random.randint(900000, 999999)

    parsed_date = None
    if data.release_date:
        try:
            parsed_date = date.fromisoformat(data.release_date)
        except ValueError:
            pass

    movie = Movie(
        tmdb_id=synthetic_tmdb,
        title=data.title.strip(),
        overview=data.overview.strip(),
        release_date=parsed_date,
        runtime_minutes=data.runtime_minutes or 120,
        poster_path=data.poster_path.strip() if data.poster_path else None,
        backdrop_path=data.backdrop_path.strip() if data.backdrop_path else None,
        vote_average=data.vote_average or 7.5,
        vote_count=1,
        popularity_score=85.0,
    )
    db.add(movie)
    await db.flush()

    # Associate genres
    if data.genre_ids:
        for gid in data.genre_ids:
            # find genre
            g_res = await db.execute(select(Genre).where((Genre.tmdb_id == gid) | (Genre.id == gid)))
            g_obj = g_res.scalars().first()
            if g_obj:
                db.add(MovieGenre(movie_id=movie.id, genre_id=g_obj.id))

    await db.commit()
    await db.refresh(movie)

    # Invalidate catalog & recommendations caches
    await cache_delete_pattern("catalog:*")
    await cache_delete_pattern("recs:*")

    return {
        "id": str(movie.id),
        "title": movie.title,
        "message": "Movie successfully added to catalog.",
    }


@router.delete("/movies/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_movie(
    movie_id: uuid.UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    movie = await db.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    await db.delete(movie)
    await db.commit()

    await cache_delete_pattern("catalog:*")
    await cache_delete_pattern("recs:*")
    return None


@router.get("/reviews")
async def list_admin_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Rating)
        .options(selectinload(Rating.user), selectinload(Rating.movie))
        .order_by(desc(Rating.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    total_stmt = select(func.count(Rating.id))
    total = await db.scalar(total_stmt) or 0

    reviews = (await db.execute(stmt)).scalars().all()
    items = []
    for r in reviews:
        items.append({
            "id": str(r.id),
            "user_id": str(r.user_id),
            "username": r.user.username if r.user else "Anonymous",
            "display_name": r.user.display_name if r.user else "Anonymous",
            "movie_id": str(r.movie_id),
            "movie_title": r.movie.title if r.movie else "Unknown Movie",
            "rating_value": r.rating_value,
            "review_title": r.review_title,
            "review_body": r.review_body,
            "is_spoiler": r.is_spoiler,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"items": items, "total": total, "page": page, "limit": limit}


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_review(
    review_id: uuid.UUID,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    review = await db.get(Rating, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")

    await db.delete(review)
    await db.commit()
    return None


@router.post("/retrain-ml")
async def retrain_ml_model(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Train / re-calibrate Custom ML Recommender
    ml_model, _ = await train_ml_recommender(db)
    await cache_delete_pattern("recs:*")

    return {
        "status": "success",
        "message": "Custom Factorized Feature ML Model recalibrated successfully.",
        "indexed_movies_count": len(ml_model.movie_features),
    }

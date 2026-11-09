import uuid
from typing import List, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rating import Rating
from app.models.movie import Movie
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingResponse
from app.core.cache import cache_delete


async def submit_rating(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: RatingCreate,
) -> RatingResponse:
    # 1. Verify movie exists
    movie_res = await db.execute(select(Movie).where(Movie.id == data.movie_id))
    movie = movie_res.scalars().first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    # 2. Check if rating already exists for this user and movie
    existing_res = await db.execute(
        select(Rating).where(
            Rating.user_id == user_id,
            Rating.movie_id == data.movie_id,
        )
    )
    rating = existing_res.scalars().first()

    if rating:
        # Update existing rating
        rating.rating_value = data.rating_value
        rating.review_title = data.review_title
        rating.review_body = data.review_body
        rating.is_spoiler = data.is_spoiler
    else:
        # Create new rating
        rating = Rating(
            user_id=user_id,
            movie_id=data.movie_id,
            rating_value=data.rating_value,
            review_title=data.review_title,
            review_body=data.review_body,
            is_spoiler=data.is_spoiler,
        )
        db.add(rating)

    await db.flush()

    # 3. Recalculate movie's vote_average and vote_count
    agg_res = await db.execute(
        select(
            func.avg(Rating.rating_value).label("avg_rating"),
            func.count(Rating.id).label("count_rating"),
        ).where(Rating.movie_id == data.movie_id)
    )
    agg = agg_res.first()
    if agg:
        movie.vote_average = round(float(agg.avg_rating or 0.0), 2)
        movie.vote_count = int(agg.count_rating or 0)

    await db.commit()
    await db.refresh(rating)

    # Invalidate recommendation cache for this user
    await cache_delete(f"recs:user:{user_id}")
    await cache_delete(f"movie:detail:{data.movie_id}")

    # Fetch user for display
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()

    return RatingResponse(
        id=rating.id,
        movie_id=rating.movie_id,
        user_id=rating.user_id,
        rating_value=rating.rating_value,
        review_title=rating.review_title,
        review_body=rating.review_body,
        is_spoiler=rating.is_spoiler,
        helpful_votes=rating.helpful_votes,
        created_at=rating.created_at,
        user_display_name=user.display_name if user else "Anonymous",
        user_avatar_url=user.avatar_url if user else None,
    )


async def delete_rating(
    db: AsyncSession,
    user_id: uuid.UUID,
    movie_id: uuid.UUID,
) -> bool:
    rating_res = await db.execute(
        select(Rating).where(
            Rating.user_id == user_id,
            Rating.movie_id == movie_id,
        )
    )
    rating = rating_res.scalars().first()
    if not rating:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found.")

    await db.delete(rating)
    await db.flush()

    # Recalculate movie statistics
    agg_res = await db.execute(
        select(
            func.avg(Rating.rating_value).label("avg_rating"),
            func.count(Rating.id).label("count_rating"),
        ).where(Rating.movie_id == movie_id)
    )
    agg = agg_res.first()
    movie_res = await db.execute(select(Movie).where(Movie.id == movie_id))
    movie = movie_res.scalars().first()
    if movie and agg:
        movie.vote_average = round(float(agg.avg_rating or 0.0), 2)
        movie.vote_count = int(agg.count_rating or 0)

    await db.commit()
    await cache_delete(f"recs:user:{user_id}")
    return True


async def get_movie_ratings(
    db: AsyncSession,
    movie_id: uuid.UUID,
    page: int = 1,
    limit: int = 10,
) -> Tuple[List[RatingResponse], int]:
    offset = (page - 1) * limit

    count_res = await db.execute(
        select(func.count(Rating.id)).where(Rating.movie_id == movie_id)
    )
    total = count_res.scalar() or 0

    query = (
        select(Rating)
        .where(Rating.movie_id == movie_id)
        .order_by(Rating.helpful_votes.desc(), Rating.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    ratings = result.scalars().all()

    items = []
    for r in ratings:
        items.append(
            RatingResponse(
                id=r.id,
                movie_id=r.movie_id,
                user_id=r.user_id,
                rating_value=r.rating_value,
                review_title=r.review_title,
                review_body=r.review_body,
                is_spoiler=r.is_spoiler,
                helpful_votes=r.helpful_votes,
                created_at=r.created_at,
                user_display_name=r.user.display_name if r.user else "Anonymous",
                user_avatar_url=r.user.avatar_url if r.user else None,
            )
        )
    return items, total


async def get_user_ratings(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    limit: int = 10,
) -> Tuple[List[RatingResponse], int]:
    offset = (page - 1) * limit

    count_res = await db.execute(
        select(func.count(Rating.id)).where(Rating.user_id == user_id)
    )
    total = count_res.scalar() or 0

    query = (
        select(Rating)
        .where(Rating.user_id == user_id)
        .order_by(Rating.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    ratings = result.scalars().all()

    items = []
    for r in ratings:
        items.append(
            RatingResponse(
                id=r.id,
                movie_id=r.movie_id,
                user_id=r.user_id,
                rating_value=r.rating_value,
                review_title=r.review_title,
                review_body=r.review_body,
                is_spoiler=r.is_spoiler,
                helpful_votes=r.helpful_votes,
                created_at=r.created_at,
                user_display_name=r.user.display_name if r.user else "Anonymous",
                user_avatar_url=r.user.avatar_url if r.user else None,
            )
        )
    return items, total


import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_optional_user
from app.models.user import User
from app.schemas.movie import MovieSummary, MovieDetail, PaginatedMovies, GenreResponse
from app.services.movie_service import get_movies, get_movie_by_id, get_trending_movies, get_genres

router = APIRouter(prefix="/movies", tags=["Movies & Catalog"])


@router.get("", response_model=PaginatedMovies)
async def list_movies(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    genre: Optional[int] = Query(None, description="Genre ID to filter by"),
    search: Optional[str] = Query(None, description="Search keyword"),
    sort: str = Query("popularity", description="Sort by: popularity, popularity_asc, release_date, release_date_asc, vote_average, vote_average_asc, title, title_desc"),
    db: AsyncSession = Depends(get_db),
):
    return await get_movies(
        db=db,
        page=page,
        limit=limit,
        genre_id=genre,
        search=search,
        sort_by=sort,
    )


@router.get("/trending", response_model=List[MovieSummary])
async def trending_movies(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await get_trending_movies(db=db, limit=limit)


@router.get("/genres", response_model=List[GenreResponse])
async def list_genres(db: AsyncSession = Depends(get_db)):
    return await get_genres(db=db)


@router.get("/{id}", response_model=MovieDetail)
async def get_movie(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    user_id = current_user.id if current_user else None
    return await get_movie_by_id(db=db, movie_id=id, user_id=user_id)


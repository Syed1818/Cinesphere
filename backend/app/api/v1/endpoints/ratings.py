import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingResponse
from app.services.rating_service import submit_rating, delete_rating, get_movie_ratings, get_user_ratings

router = APIRouter(prefix="/ratings", tags=["Ratings & Reviews"])


@router.get("/me")
async def list_my_ratings(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_user_ratings(db=db, user_id=current_user.id, page=page, limit=limit)
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def rate_movie(
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await submit_rating(db=db, user_id=current_user.id, data=data)


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_rating(
    movie_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_rating(db=db, user_id=current_user.id, movie_id=movie_id)
    return None


@router.get("/movie/{movie_id}")
async def list_movie_reviews(
    movie_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    items, total = await get_movie_ratings(db=db, movie_id=movie_id, page=page, limit=limit)
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
    }


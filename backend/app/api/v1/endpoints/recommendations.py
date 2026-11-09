import uuid
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.recommendation import RecommendationFeedResponse, RecommendationItem
from app.services.recommendation_service import get_hybrid_recommendations, get_similar_movies

router = APIRouter(prefix="/recommendations", tags=["Recommendations Engine"])


@router.get("/feed", response_model=RecommendationFeedResponse)
async def get_my_recommendations(
    limit: int = Query(24, ge=1, le=50, description="Number of recommendations"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns personalized hybrid recommendation feed for authenticated user.
    Combines pgvector Cosine Distance + iALS Matrix Factorization + Wilson-score trending.
    """
    return await get_hybrid_recommendations(db=db, user_id=current_user.id, limit=limit)


@router.get("/similar/{movie_id}", response_model=List[RecommendationItem])
async def get_similar(
    movie_id: uuid.UUID,
    limit: int = Query(12, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns item-to-item content-based recommendations using pgvector HNSW cosine distance.
    """
    return await get_similar_movies(db=db, movie_id=movie_id, limit=limit)


@router.get("/{user_id}", response_model=RecommendationFeedResponse)
async def get_user_recommendations(
    user_id: uuid.UUID,
    limit: int = Query(24, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint per prompt specification: expose /recommendations/:userId
    """
    return await get_hybrid_recommendations(db=db, user_id=user_id, limit=limit)


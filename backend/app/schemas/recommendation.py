from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.movie import MovieSummary


class RecommendationItem(MovieSummary):
    similarity_score: float = Field(..., description="Normalized affinity/recommendation score between 0.0 and 1.0")
    algorithm: str = Field(..., description="CONTENT_BASED, COLLABORATIVE, HYBRID, or TRENDING")
    explanation: str = Field(..., description="Human-interpretable recommendation justification")


class RecommendationFeedResponse(BaseModel):
    user_id: Optional[str] = None
    feed_title: str
    algorithm: str
    items: List[RecommendationItem] = Field(default_factory=list)


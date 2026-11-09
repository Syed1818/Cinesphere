import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class RatingCreate(BaseModel):
    movie_id: uuid.UUID
    rating_value: int = Field(..., ge=1, le=10, description="Rating from 1 to 10")
    review_title: Optional[str] = Field(None, max_length=150)
    review_body: Optional[str] = None
    is_spoiler: bool = False


class RatingResponse(BaseModel):
    id: uuid.UUID
    movie_id: uuid.UUID
    user_id: uuid.UUID
    rating_value: int
    review_title: Optional[str] = None
    review_body: Optional[str] = None
    is_spoiler: bool
    helpful_votes: int
    created_at: datetime
    user_display_name: Optional[str] = None
    user_avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


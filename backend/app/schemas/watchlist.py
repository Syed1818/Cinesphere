import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.movie import MovieSummary


class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_private: bool = False


class WatchlistItemAdd(BaseModel):
    movie_id: uuid.UUID
    priority: int = 0


class WatchlistItemResponse(BaseModel):
    id: uuid.UUID
    movie_id: uuid.UUID
    priority: int
    added_at: datetime
    movie: Optional[MovieSummary] = None

    model_config = ConfigDict(from_attributes=True)


class WatchlistResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str] = None
    is_private: bool
    is_default: bool
    created_at: datetime
    items_count: int = 0
    items: List[WatchlistItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


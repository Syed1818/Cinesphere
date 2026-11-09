import uuid
from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class GenreResponse(BaseModel):
    id: int
    tmdb_id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class CastMemberResponse(BaseModel):
    id: uuid.UUID
    name: str
    character_name: Optional[str] = None
    profile_path: Optional[str] = None
    order_index: int = 0


class MovieSummary(BaseModel):
    id: uuid.UUID
    tmdb_id: int
    imdb_id: Optional[str] = None
    title: str
    original_title: str
    release_date: date
    runtime_minutes: int
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    vote_average: float
    vote_count: int
    popularity_score: float
    genres: List[GenreResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MovieDetail(MovieSummary):
    tagline: Optional[str] = None
    overview: str
    status: str
    original_language: str
    director: Optional[str] = None
    top_cast: List[CastMemberResponse] = Field(default_factory=list)
    user_rating: Optional[int] = None
    is_in_watchlist: bool = False


class PaginatedMovies(BaseModel):
    items: List[MovieSummary]
    total: int
    page: int
    limit: int
    total_pages: int


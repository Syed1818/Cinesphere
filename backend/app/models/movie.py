import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, ForeignKey,
    Integer, Numeric, String, Text, Float
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from app.core.database import Base


class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tmdb_id = Column(Integer, unique=True, nullable=False)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(60), unique=True, nullable=False)

    movies = relationship("Movie", secondary="movie_genres", back_populates="genres")


class MovieGenre(Base):
    __tablename__ = "movie_genres"

    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True)
    genre_id = Column(Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True)


class Movie(Base):
    __tablename__ = "movies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tmdb_id = Column(Integer, unique=True, nullable=False, index=True)
    imdb_id = Column(String(20), unique=True, nullable=True)
    title = Column(String(255), nullable=False, index=True)
    original_title = Column(String(255), nullable=False)
    tagline = Column(Text, nullable=True)
    overview = Column(Text, nullable=False)
    release_date = Column(Date, nullable=False, index=True)
    runtime_minutes = Column(Integer, default=0, nullable=False)
    status = Column(String(30), default="Released", nullable=False)
    original_language = Column(String(10), default="en", nullable=False)
    poster_path = Column(String(255), nullable=True)
    backdrop_path = Column(String(255), nullable=True)
    budget = Column(BigInteger, default=0, nullable=False)
    revenue = Column(BigInteger, default=0, nullable=False)
    popularity_score = Column(Numeric(10, 4), default=0.0000, nullable=False, index=True)
    vote_average = Column(Numeric(3, 2), default=0.00, nullable=False)
    vote_count = Column(Integer, default=0, nullable=False)
    is_adult = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    genres = relationship("Genre", secondary="movie_genres", back_populates="movies", lazy="selectin")
    credits = relationship("MovieCredit", back_populates="movie", cascade="all, delete-orphan", lazy="selectin")
    embedding = relationship("MovieEmbedding", back_populates="movie", uselist=False, cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="movie", cascade="all, delete-orphan")
    watchlist_items = relationship("WatchlistItem", back_populates="movie", cascade="all, delete-orphan")


class Person(Base):
    __tablename__ = "people"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tmdb_id = Column(Integer, unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    profile_path = Column(String(255), nullable=True)
    known_for_department = Column(String(50), nullable=True)

    credits = relationship("MovieCredit", back_populates="person")


class MovieCredit(Base):
    __tablename__ = "movie_credits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    person_id = Column(UUID(as_uuid=True), ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    role_type = Column(
        PG_ENUM("CAST", "DIRECTOR", "WRITER", "PRODUCER", name="credit_role", create_type=False),
        nullable=False,
    )
    character_name = Column(String(255), nullable=True)
    order_index = Column(Integer, default=0, nullable=False)

    movie = relationship("Movie", back_populates="credits")
    person = relationship("Person", back_populates="credits", lazy="joined")


class MovieEmbedding(Base):
    __tablename__ = "movie_embeddings"

    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id", ondelete="CASCADE"), primary_key=True)
    embedding = Column(ARRAY(Float), nullable=False)
    model_version = Column(String(50), default="text-embedding-004", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    movie = relationship("Movie", back_populates="embedding")


class UserPreferenceEmbedding(Base):
    __tablename__ = "user_preference_embeddings"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    embedding = Column(ARRAY(Float), nullable=False)
    weight_total = Column(Numeric(10, 4), default=1.0, nullable=False)
    last_computed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="preference_embedding")


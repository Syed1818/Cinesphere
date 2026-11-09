import uuid
from typing import List, Optional
from sqlalchemy import func, select, desc, asc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.movie import Movie, Genre, MovieGenre, MovieCredit
from app.models.rating import Rating
from app.models.watchlist import Watchlist, WatchlistItem
from app.schemas.movie import (
    MovieSummary, MovieDetail, PaginatedMovies, GenreResponse, CastMemberResponse
)
from app.core.cache import cache_get, cache_set


async def get_movies(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    genre_id: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: str = "popularity",
) -> PaginatedMovies:
    offset = (page - 1) * limit
    cache_key = f"movies:catalog:p{page}:l{limit}:g{genre_id}:s{search}:sort{sort_by}"
    cached = await cache_get(cache_key)
    if cached:
        return PaginatedMovies(**cached)

    query = select(Movie)

    # Filter by Genre (matches TMDB ID or DB ID)
    if genre_id is not None:
        query = (
            query.join(MovieGenre, Movie.id == MovieGenre.movie_id)
            .join(Genre, MovieGenre.genre_id == Genre.id)
            .where(or_(Genre.tmdb_id == genre_id, Genre.id == genre_id))
        )

    # Search query
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Movie.title.ilike(term),
                Movie.original_title.ilike(term),
                Movie.tagline.ilike(term),
                Movie.overview.ilike(term),
            )
        )

    query = query.distinct()

    # Total Count
    count_query = select(func.count()).select_from(query.order_by(None).subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting options
    s = (sort_by or "popularity").lower().strip()
    if s in ("release_date", "release_date_desc", "newest"):
        query = query.order_by(desc(Movie.release_date), desc(Movie.popularity_score))
    elif s in ("release_date_asc", "oldest"):
        query = query.order_by(asc(Movie.release_date), desc(Movie.popularity_score))
    elif s in ("vote_average", "vote_average_desc", "rating", "rating_desc", "highest_rated"):
        query = query.order_by(desc(Movie.vote_average), desc(Movie.vote_count))
    elif s in ("vote_average_asc", "rating_asc", "lowest_rated"):
        query = query.order_by(asc(Movie.vote_average), desc(Movie.vote_count))
    elif s in ("title", "title_asc"):
        query = query.order_by(asc(Movie.title))
    elif s in ("title_desc", "title_z_a"):
        query = query.order_by(desc(Movie.title))
    elif s in ("popularity_asc", "least_popular"):
        query = query.order_by(asc(Movie.popularity_score))
    else:  # default: popularity / popularity_desc
        query = query.order_by(desc(Movie.popularity_score))

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    movies = result.scalars().all()

    items = []
    for m in movies:
        items.append(
            MovieSummary(
                id=m.id,
                tmdb_id=m.tmdb_id,
                imdb_id=m.imdb_id,
                title=m.title,
                original_title=m.original_title,
                release_date=m.release_date,
                runtime_minutes=m.runtime_minutes,
                poster_path=m.poster_path,
                backdrop_path=m.backdrop_path,
                vote_average=float(m.vote_average),
                vote_count=m.vote_count,
                popularity_score=float(m.popularity_score),
                genres=[GenreResponse.model_validate(g) for g in m.genres],
            )
        )

    total_pages = (total + limit - 1) // limit if total > 0 else 1
    response = PaginatedMovies(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
    # Cache for 10 minutes
    await cache_set(cache_key, response.model_dump(mode="json"), ttl_seconds=600)
    return response


async def get_movie_by_id(
    db: AsyncSession,
    movie_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = None,
) -> MovieDetail:
    result = await db.execute(select(Movie).where(Movie.id == movie_id))
    movie = result.scalars().first()
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    # Fetch credits (director + cast)
    director_name = None
    cast_list: List[CastMemberResponse] = []

    credits_res = await db.execute(
        select(MovieCredit)
        .where(MovieCredit.movie_id == movie_id)
        .order_by(MovieCredit.order_index.asc())
    )
    credits = credits_res.scalars().all()

    for c in credits:
        if c.role_type == "DIRECTOR" and not director_name:
            director_name = c.person.name
        elif c.role_type == "CAST" and len(cast_list) < 10:
            cast_list.append(
                CastMemberResponse(
                    id=c.person.id,
                    name=c.person.name,
                    character_name=c.character_name,
                    profile_path=c.person.profile_path,
                    order_index=c.order_index,
                )
            )

    # Check if user rated this movie or has it in watchlist
    user_rating = None
    is_in_watchlist = False

    if user_id:
        # Check rating
        rating_res = await db.execute(
            select(Rating.rating_value).where(
                Rating.movie_id == movie_id, Rating.user_id == user_id
            )
        )
        user_rating = rating_res.scalar_one_or_none()

        # Check watchlist
        watchlist_res = await db.execute(
            select(WatchlistItem.id)
            .join(Watchlist)
            .where(
                Watchlist.user_id == user_id,
                WatchlistItem.movie_id == movie_id,
            )
        )
        is_in_watchlist = bool(watchlist_res.scalar_one_or_none())

    return MovieDetail(
        id=movie.id,
        tmdb_id=movie.tmdb_id,
        imdb_id=movie.imdb_id,
        title=movie.title,
        original_title=movie.original_title,
        tagline=movie.tagline,
        overview=movie.overview,
        release_date=movie.release_date,
        runtime_minutes=movie.runtime_minutes,
        status=movie.status,
        original_language=movie.original_language,
        poster_path=movie.poster_path,
        backdrop_path=movie.backdrop_path,
        vote_average=float(movie.vote_average),
        vote_count=movie.vote_count,
        popularity_score=float(movie.popularity_score),
        genres=[GenreResponse.model_validate(g) for g in movie.genres],
        director=director_name,
        top_cast=cast_list,
        user_rating=user_rating,
        is_in_watchlist=is_in_watchlist,
    )


async def get_trending_movies(db: AsyncSession, limit: int = 20) -> List[MovieSummary]:
    cache_key = f"movies:trending:limit{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return [MovieSummary(**item) for item in cached]

    # Trending query combining popularity and high ratings
    result = await db.execute(
        select(Movie)
        .order_by(desc(Movie.popularity_score), desc(Movie.vote_average))
        .limit(limit)
    )
    movies = result.scalars().all()

    items = [
        MovieSummary(
            id=m.id,
            tmdb_id=m.tmdb_id,
            imdb_id=m.imdb_id,
            title=m.title,
            original_title=m.original_title,
            release_date=m.release_date,
            runtime_minutes=m.runtime_minutes,
            poster_path=m.poster_path,
            backdrop_path=m.backdrop_path,
            vote_average=float(m.vote_average),
            vote_count=m.vote_count,
            popularity_score=float(m.popularity_score),
            genres=[GenreResponse.model_validate(g) for g in m.genres],
        )
        for m in movies
    ]

    await cache_set(cache_key, [item.model_dump(mode="json") for item in items], ttl_seconds=300)
    return items


async def get_genres(db: AsyncSession) -> List[GenreResponse]:
    cache_key = "movies:genres:all"
    cached = await cache_get(cache_key)
    if cached:
        return [GenreResponse(**g) for g in cached]

    result = await db.execute(select(Genre).order_by(Genre.name.asc()))
    genres = result.scalars().all()
    items = [GenreResponse.model_validate(g) for g in genres]
    await cache_set(cache_key, [item.model_dump(mode="json") for item in items], ttl_seconds=86400)
    return items


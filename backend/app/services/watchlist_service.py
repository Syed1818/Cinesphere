import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.watchlist import Watchlist, WatchlistItem
from app.models.movie import Movie
from app.schemas.watchlist import WatchlistCreate, WatchlistResponse, WatchlistItemResponse
from app.schemas.movie import MovieSummary, GenreResponse


async def get_user_watchlists(db: AsyncSession, user_id: uuid.UUID) -> List[WatchlistResponse]:
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == user_id)
        .order_by(Watchlist.is_default.desc(), Watchlist.created_at.desc())
    )
    watchlists = result.scalars().all()

    responses = []
    for wl in watchlists:
        item_responses = []
        for item in wl.items:
            m = item.movie
            movie_summary = None
            if m:
                movie_summary = MovieSummary(
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
            item_responses.append(
                WatchlistItemResponse(
                    id=item.id,
                    movie_id=item.movie_id,
                    priority=item.priority,
                    added_at=item.added_at,
                    movie=movie_summary,
                )
            )

        responses.append(
            WatchlistResponse(
                id=wl.id,
                user_id=wl.user_id,
                name=wl.name,
                description=wl.description,
                is_private=wl.is_private,
                is_default=wl.is_default,
                created_at=wl.created_at,
                items_count=len(wl.items),
                items=item_responses,
            )
        )
    return responses


async def create_watchlist(db: AsyncSession, user_id: uuid.UUID, data: WatchlistCreate) -> WatchlistResponse:
    wl = Watchlist(
        user_id=user_id,
        name=data.name,
        description=data.description,
        is_private=data.is_private,
        is_default=False,
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return WatchlistResponse(
        id=wl.id,
        user_id=wl.user_id,
        name=wl.name,
        description=wl.description,
        is_private=wl.is_private,
        is_default=wl.is_default,
        created_at=wl.created_at,
        items_count=0,
        items=[],
    )


async def add_to_watchlist(
    db: AsyncSession,
    user_id: uuid.UUID,
    movie_id: uuid.UUID,
    watchlist_id: Optional[uuid.UUID] = None,
    priority: int = 0,
) -> bool:
    # If no watchlist_id provided, default to the user's primary/default watchlist
    if not watchlist_id:
        wl_res = await db.execute(
            select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.is_default.is_(True))
        )
        wl = wl_res.scalars().first()
        if not wl:
            # Fallback to any user watchlist
            wl_res = await db.execute(select(Watchlist).where(Watchlist.user_id == user_id))
            wl = wl_res.scalars().first()
        if not wl:
            wl = Watchlist(user_id=user_id, name="Watch Later", is_default=True)
            db.add(wl)
            await db.flush()
        watchlist_id = wl.id

    # Verify movie exists
    m_res = await db.execute(select(Movie.id).where(Movie.id == movie_id))
    if not m_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found.")

    # Check for duplicate
    existing = await db.execute(
        select(WatchlistItem.id).where(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.movie_id == movie_id,
        )
    )
    if existing.scalar_one_or_none():
        return True  # Already added

    item = WatchlistItem(
        watchlist_id=watchlist_id,
        movie_id=movie_id,
        priority=priority,
    )
    db.add(item)
    await db.commit()
    return True


async def remove_from_watchlist(
    db: AsyncSession,
    user_id: uuid.UUID,
    movie_id: uuid.UUID,
    watchlist_id: Optional[uuid.UUID] = None,
) -> bool:
    query = (
        select(WatchlistItem)
        .join(Watchlist)
        .where(
            Watchlist.user_id == user_id,
            WatchlistItem.movie_id == movie_id,
        )
    )
    if watchlist_id:
        query = query.where(WatchlistItem.watchlist_id == watchlist_id)

    result = await db.execute(query)
    items = result.scalars().all()
    for item in items:
        await db.delete(item)
    await db.commit()
    return True


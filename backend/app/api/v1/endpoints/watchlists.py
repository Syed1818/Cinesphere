import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.watchlist import WatchlistCreate, WatchlistResponse, WatchlistItemAdd
from app.services.watchlist_service import (
    get_user_watchlists, create_watchlist, add_to_watchlist, remove_from_watchlist
)

router = APIRouter(prefix="/watchlists", tags=["Watchlists"])


@router.get("", response_model=List[WatchlistResponse])
async def list_watchlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_watchlists(db=db, user_id=current_user.id)


@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_new_watchlist(
    data: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_watchlist(db=db, user_id=current_user.id, data=data)


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def add_item(
    data: WatchlistItemAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await add_to_watchlist(
        db=db,
        user_id=current_user.id,
        movie_id=data.movie_id,
        priority=data.priority,
    )
    return {"status": "success", "message": "Added to watchlist"}


@router.delete("/items/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    movie_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await remove_from_watchlist(
        db=db,
        user_id=current_user.id,
        movie_id=movie_id,
    )
    return None


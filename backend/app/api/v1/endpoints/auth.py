from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse, UserProfileUpdate
from app.services.auth_service import register_user, authenticate_user, refresh_user_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, response: Response, db: AsyncSession = Depends(get_db)):
    token = await register_user(db, data)
    return token


@router.post("/login", response_model=Token)
async def login(data: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    token = await authenticate_user(db, data)
    return token


@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    return await refresh_user_token(db, refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        bio=current_user.profile.bio if current_user.profile else None,
        preferred_genres=current_user.profile.preferred_genres if current_user.profile else [],
        created_at=current_user.created_at,
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.display_name is not None and data.display_name.strip():
        current_user.display_name = data.display_name.strip()

    if current_user.profile is None:
        from app.models.user import UserProfile
        current_user.profile = UserProfile(user_id=current_user.id)
        db.add(current_user.profile)

    if data.bio is not None:
        current_user.profile.bio = data.bio.strip()
    if data.preferred_genres is not None:
        current_user.profile.preferred_genres = data.preferred_genres
        current_user.profile.onboarding_completed = True

    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        bio=current_user.profile.bio if current_user.profile else None,
        preferred_genres=current_user.profile.preferred_genres if current_user.profile else [],
        created_at=current_user.created_at,
    )


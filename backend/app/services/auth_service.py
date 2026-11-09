import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserProfile
from app.models.watchlist import Watchlist
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse


async def register_user(db: AsyncSession, data: UserRegister) -> Token:
    # 1. Check for existing email or username
    existing_email = await db.execute(select(User).where(User.email == data.email))
    if existing_email.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    existing_username = await db.execute(select(User).where(User.username == data.username))
    if existing_username.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken.",
        )

    # 2. Create User record with Argon2id/bcrypt hashed password
    user = User(
        email=data.email,
        username=data.username,
        display_name=data.display_name,
        password_hash=get_password_hash(data.password),
        role="USER",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # 3. Create UserProfile with onboarding genre preferences
    profile = UserProfile(
        user_id=user.id,
        preferred_genres=data.preferred_genres or [],
        onboarding_completed=bool(data.preferred_genres),
    )
    db.add(profile)

    # 4. Create default "Watch Later" Watchlist
    default_watchlist = Watchlist(
        user_id=user.id,
        name="Watch Later",
        description="Your default watchlist for movies to see next",
        is_default=True,
        is_private=True,
    )
    db.add(default_watchlist)

    await db.commit()
    await db.refresh(user)

    # 5. Issue JWT Tokens
    access_token = create_access_token(user.id, role=user.role, extra_claims={"email": user.email})
    refresh_token = create_refresh_token(user.id)

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        role=user.role,
        preferred_genres=profile.preferred_genres,
        created_at=user.created_at,
    )
    return Token(access_token=access_token, token_type="bearer", user=user_resp)


async def authenticate_user(db: AsyncSession, data: UserLogin) -> Token:
    result = await db.execute(
        select(User).where(User.email == data.email, User.deleted_at.is_(None))
    )
    user = result.scalars().first()

    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Fetch user profile preferences
    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    profile = profile_result.scalars().first()

    access_token = create_access_token(user.id, role=user.role, extra_claims={"email": user.email})

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        role=user.role,
        preferred_genres=profile.preferred_genres if profile else [],
        created_at=user.created_at,
    )
    return Token(access_token=access_token, token_type="bearer", user=user_resp)


async def refresh_user_token(db: AsyncSession, refresh_token: str) -> Token:
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id), User.deleted_at.is_(None)))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    new_access_token = create_access_token(user.id, role=user.role, extra_claims={"email": user.email})
    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == user.id))
    profile = profile_result.scalars().first()

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        role=user.role,
        preferred_genres=profile.preferred_genres if profile else [],
        created_at=user.created_at,
    )
    return Token(access_token=new_access_token, token_type="bearer", user=user_resp)


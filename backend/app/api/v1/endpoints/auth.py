from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_random_token,
    hash_token,
)
from app.models.user import User
from app.models.auth_token import EmailVerificationToken, RefreshToken
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    VerifyEmailRequest,
    RefreshTokenRequest,
    ResendVerificationRequest,
    MessageResponse,
)
from app.schemas.user import UserRead
from app.services.email_service import email_service
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    # Check if email already registered
    existing_user = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    # Create user
    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
        bio=data.bio,
        adhd_preferences=data.adhd_preferences.model_dump() if data.adhd_preferences else {
            "cleaning_style": "sprint",
            "tags": ["silent_body_doubling", "laundry_hater", "20min_burst"],
            "preferred_duration": 20
        },
        is_verified=False
    )
    db.add(user)
    await db.flush()

    # Generate verification token
    raw_token = generate_random_token()
    token_obj = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFY_TOKEN_EXPIRE_HOURS)
    )
    db.add(token_obj)
    await db.commit()

    # Dispatch email
    await email_service.send_verification_email(user.email, raw_token)

    return MessageResponse(
        message="Registration successful! Please check your email to verify your account."
    )

@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    token_hashed = hash_token(data.token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(EmailVerificationToken).where(
            and_(
                EmailVerificationToken.token_hash == token_hashed,
                EmailVerificationToken.used_at.is_(None),
                EmailVerificationToken.expires_at > now
            )
        )
    )
    token_record = result.scalar_one_or_none()
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    # Mark token used
    token_record.used_at = now

    # Verify user
    user_res = await db.execute(select(User).where(User.id == token_record.user_id))
    user = user_res.scalar_one()
    user.is_verified = True

    await db.commit()
    return MessageResponse(message="Email successfully verified! You can now log in.")

@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        # Avoid user enumeration
        return MessageResponse(message="If an account exists, a new verification link was sent.")

    if user.is_verified:
        return MessageResponse(message="Account is already verified. Please log in.")

    raw_token = generate_random_token()
    token_obj = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFY_TOKEN_EXPIRE_HOURS)
    )
    db.add(token_obj)
    await db.commit()

    await email_service.send_verification_email(user.email, raw_token)
    return MessageResponse(message="If an account exists, a new verification link was sent.")

@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    # Generate JWT Access Token
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"email": user.email, "display_name": user.display_name}
    )

    # Generate Refresh Token
    raw_refresh = generate_random_token()
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_record)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserRead.model_validate(user)
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    token_hash = hash_token(data.refresh_token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked.is_(False),
                RefreshToken.expires_at > now
            )
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Revoke old refresh token (Token rotation)
    record.is_revoked = True

    # Fetch user
    user_res = await db.execute(select(User).where(User.id == record.user_id))
    user = user_res.scalar_one()

    # Generate new access token
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"email": user.email, "display_name": user.display_name}
    )

    # Generate new refresh token
    new_raw_refresh = generate_random_token()
    new_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(new_raw_refresh),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_record)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserRead.model_validate(user)
    )

@router.post("/logout", response_model=MessageResponse)
async def logout(
    data: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    token_hash = hash_token(data.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.token_hash == token_hash,
                RefreshToken.user_id == current_user.id
            )
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.is_revoked = True
        await db.commit()

    return MessageResponse(message="Successfully logged out")

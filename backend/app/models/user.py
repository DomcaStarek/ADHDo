import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    display_name: Mapped[str] = mapped_column(
        String(80),
        nullable=False
    )
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True
    )
    adhd_preferences: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "cleaning_style": "sprint",
            "tags": ["silent_body_doubling", "laundry_hater", "20min_burst"],
            "preferred_duration": 20
        },
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationships
    cleaning_tasks: Mapped[List["CleaningTask"]] = relationship(
        "CleaningTask",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    email_verifications: Mapped[List["EmailVerificationToken"]] = relationship(
        "EmailVerificationToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )

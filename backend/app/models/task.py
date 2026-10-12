import uuid
from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class CleaningTask(Base, TimestampMixin):
    __tablename__ = "cleaning_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    photo_url: Mapped[str] = mapped_column(
        String(512),
        nullable=False
    )
    estimated_duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=20,
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",  # active, completed, archived
        nullable=False,
        index=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="cleaning_tasks")

    __table_args__ = (
        Index("ix_cleaning_tasks_user_status", "user_id", "status"),
    )

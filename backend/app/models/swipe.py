import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, UniqueConstraint, Index, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Swipe(Base):
    __tablename__ = "swipes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )
    swiper_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    target_task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cleaning_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    target_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    action: Mapped[str] = mapped_column(
        String(10),  # 'like' or 'pass'
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    swiper: Mapped["User"] = relationship("User", foreign_keys=[swiper_id])
    target_user: Mapped["User"] = relationship("User", foreign_keys=[target_user_id])
    target_task: Mapped["CleaningTask"] = relationship("CleaningTask", foreign_keys=[target_task_id])

    __table_args__ = (
        UniqueConstraint("swiper_id", "target_user_id", name="uq_swipes_swiper_target_user"),
        Index("ix_swipes_reciprocal", "target_user_id", "swiper_id", "action"),
    )

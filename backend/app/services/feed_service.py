from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, not_
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.task import CleaningTask
from app.models.swipe import Swipe
from app.models.moderation import BlockAndReport
from app.schemas.task import TaskFeedItem
from app.schemas.user import UserPublicProfile

class FeedService:
    @staticmethod
    async def get_feed(
        db: AsyncSession,
        current_user: User,
        limit: int = 20,
        offset: int = 0
    ) -> List[TaskFeedItem]:
        # Subquery: Users already swiped on by current_user
        swiped_user_ids = select(Swipe.target_user_id).where(
            Swipe.swiper_id == current_user.id
        )

        # Subquery: Users blocked by or blocking current_user
        blocked_by_me = select(BlockAndReport.reported_id).where(
            BlockAndReport.reporter_id == current_user.id
        )
        blocking_me = select(BlockAndReport.reporter_id).where(
            BlockAndReport.reported_id == current_user.id
        )

        # Query active cleaning tasks
        query = (
            select(CleaningTask)
            .options(selectinload(CleaningTask.user))
            .where(
                and_(
                    CleaningTask.status == "active",
                    CleaningTask.user_id != current_user.id,
                    CleaningTask.user_id.not_in(swiped_user_ids),
                    CleaningTask.user_id.not_in(blocked_by_me),
                    CleaningTask.user_id.not_in(blocking_me)
                )
            )
            .order_by(CleaningTask.created_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(query)
        tasks = result.scalars().all()

        feed_items = []
        for t in tasks:
            if not t.user or not t.user.is_active:
                continue
            feed_items.append(
                TaskFeedItem(
                    task_id=t.id,
                    title=t.title,
                    description=t.description,
                    photo_url=t.photo_url,
                    estimated_duration_minutes=t.estimated_duration_minutes,
                    created_at=t.created_at,
                    user=UserPublicProfile.model_validate(t.user)
                )
            )

        return feed_items

feed_service = FeedService()

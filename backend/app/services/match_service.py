import uuid
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.user import User
from app.models.task import CleaningTask
from app.models.swipe import Swipe
from app.models.match import Match
from app.schemas.swipe import SwipeResponse, MatchData
from app.schemas.user import UserPublicProfile
from app.schemas.task import TaskRead

class MatchService:
    @staticmethod
    async def process_swipe(
        db: AsyncSession,
        current_user: User,
        target_task_id: uuid.UUID,
        action: str
    ) -> SwipeResponse:
        # 1. Fetch target task and owner
        result = await db.execute(
            select(CleaningTask).where(CleaningTask.id == target_task_id)
        )
        target_task = result.scalar_one_or_none()
        if not target_task:
            raise ValueError("Target task not found")

        if target_task.user_id == current_user.id:
            raise ValueError("You cannot swipe on your own task")

        target_user_id = target_task.user_id

        # 2. Check if current user already swiped on this target user
        existing_swipe_res = await db.execute(
            select(Swipe).where(
                and_(
                    Swipe.swiper_id == current_user.id,
                    Swipe.target_user_id == target_user_id
                )
            )
        )
        existing_swipe = existing_swipe_res.scalar_one_or_none()

        if existing_swipe:
            # Update action if previously swiped
            existing_swipe.action = action
            existing_swipe.target_task_id = target_task_id
        else:
            new_swipe = Swipe(
                swiper_id=current_user.id,
                target_user_id=target_user_id,
                target_task_id=target_task_id,
                action=action
            )
            db.add(new_swipe)

        await db.flush()

        # If it was a pass, no match is possible
        if action != "like":
            await db.commit()
            return SwipeResponse(is_match=False)

        # 3. Check for reciprocal like
        reciprocal_res = await db.execute(
            select(Swipe).where(
                and_(
                    Swipe.swiper_id == target_user_id,
                    Swipe.target_user_id == current_user.id,
                    Swipe.action == "like"
                )
            )
        )
        reciprocal_swipe = reciprocal_res.scalar_one_or_none()

        if not reciprocal_swipe:
            await db.commit()
            return SwipeResponse(is_match=False)

        # 4. Reciprocal like exists -> CREATE OR RE-ACTIVATE MATCH
        user1_id, user2_id = (
            (current_user.id, target_user_id)
            if current_user.id < target_user_id
            else (target_user_id, current_user.id)
        )

        match_res = await db.execute(
            select(Match).where(
                and_(
                    Match.user1_id == user1_id,
                    Match.user2_id == user2_id
                )
            )
        )
        match = match_res.scalar_one_or_none()

        # Get current user active task
        my_active_task_res = await db.execute(
            select(CleaningTask).where(
                and_(
                    CleaningTask.user_id == current_user.id,
                    CleaningTask.status == "active"
                )
            ).order_by(CleaningTask.created_at.desc()).limit(1)
        )
        my_active_task = my_active_task_res.scalar_one_or_none()

        task1_id = my_active_task.id if (current_user.id == user1_id and my_active_task) else target_task.id
        task2_id = target_task.id if (current_user.id == user1_id) else (my_active_task.id if my_active_task else None)

        if not match:
            match = Match(
                user1_id=user1_id,
                user2_id=user2_id,
                task1_id=task1_id,
                task2_id=task2_id,
                is_active=True
            )
            db.add(match)
        else:
            match.is_active = True
            match.unmatcher_id = None
            if current_user.id == user1_id and my_active_task:
                match.task1_id = my_active_task.id
            elif current_user.id == user2_id and my_active_task:
                match.task2_id = my_active_task.id

        await db.commit()
        await db.refresh(match)

        # Fetch other user details
        other_user_res = await db.execute(select(User).where(User.id == target_user_id))
        other_user = other_user_res.scalar_one()

        return SwipeResponse(
            is_match=True,
            match_data=MatchData(
                match_id=match.id,
                matched_with=UserPublicProfile.model_validate(other_user),
                their_task=TaskRead.model_validate(target_task) if target_task else None,
                matched_at=match.created_at
            )
        )

match_service = MatchService()

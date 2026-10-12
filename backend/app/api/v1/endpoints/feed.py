from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.task import TaskFeedItem
from app.api.v1.deps import get_current_user
from app.services.feed_service import feed_service

router = APIRouter(prefix="/feed", tags=["Discovery Feed"])

@router.get("", response_model=List[TaskFeedItem])
@router.get("/", response_model=List[TaskFeedItem])
async def get_swipe_feed(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns active cleaning tasks from other users.
    Excludes self, previously swiped profiles, and blocked users.
    """
    return await feed_service.get_feed(
        db=db,
        current_user=current_user,
        limit=limit,
        offset=offset
    )

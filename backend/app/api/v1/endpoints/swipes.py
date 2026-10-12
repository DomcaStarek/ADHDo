from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.swipe import SwipeCreate, SwipeResponse
from app.api.v1.deps import get_current_user
from app.services.match_service import match_service

router = APIRouter(prefix="/swipes", tags=["Swipes"])

@router.post("", response_model=SwipeResponse)
@router.post("/", response_model=SwipeResponse)
async def record_swipe(
    data: SwipeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        response = await match_service.process_swipe(
            db=db,
            current_user=current_user,
            target_task_id=data.target_task_id,
            action=data.action
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

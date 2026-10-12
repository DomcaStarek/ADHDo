from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.core.database import get_db
from app.models.user import User
from app.models.moderation import BlockAndReport
from app.models.match import Match
from app.schemas.moderation import BlockCreate, ReportCreate, ModerationResponse
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/moderation", tags=["Moderation & Safety"])

@router.post("/block", response_model=ModerationResponse)
async def block_user(
    data: BlockCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block yourself"
        )

    # Record block
    block_entry = BlockAndReport(
        reporter_id=current_user.id,
        reported_id=data.user_id,
        action_type="block",
        reason=data.reason or "Blocked by user"
    )
    db.add(block_entry)

    # Deactivate any active match between these users
    match_res = await db.execute(
        select(Match).where(
            and_(
                Match.is_active == True,
                or_(
                    and_(Match.user1_id == current_user.id, Match.user2_id == data.user_id),
                    and_(Match.user1_id == data.user_id, Match.user2_id == current_user.id),
                )
            )
        )
    )
    match = match_res.scalar_one_or_none()
    if match:
        match.is_active = False
        match.unmatcher_id = current_user.id

    await db.commit()
    return ModerationResponse(message="User has been blocked and removed from your matches.")

@router.post("/report", response_model=ModerationResponse)
async def report_user(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report yourself"
        )

    report_entry = BlockAndReport(
        reporter_id=current_user.id,
        reported_id=data.user_id,
        action_type="report",
        reason=data.reason,
        details=data.details
    )
    db.add(report_entry)
    await db.commit()

    return ModerationResponse(message="Thank you for your report. Our safety team will review it.")

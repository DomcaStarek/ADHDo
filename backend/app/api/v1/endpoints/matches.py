import uuid
import json
from typing import List, Dict, Set
from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_access_token
from app.models.user import User
from app.models.task import CleaningTask
from app.models.match import Match
from app.models.message import Message
from app.schemas.match import MatchSummary, MatchDetail
from app.schemas.message import MessageCreate, MessageRead, MessageListResponse
from app.schemas.user import UserPublicProfile
from app.schemas.task import TaskRead
from app.api.v1.deps import get_current_user

router = APIRouter(tags=["Matches & Chat"])

# WebSocket Connection Manager
class ChatConnectionManager:
    def __init__(self):
        # match_id -> set of active WebSockets
        self.active_rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, match_id: str, websocket: WebSocket):
        await websocket.accept()
        if match_id not in self.active_rooms:
            self.active_rooms[match_id] = set()
        self.active_rooms[match_id].add(websocket)

    def disconnect(self, match_id: str, websocket: WebSocket):
        if match_id in self.active_rooms:
            self.active_rooms[match_id].discard(websocket)
            if not self.active_rooms[match_id]:
                del self.active_rooms[match_id]

    async def broadcast(self, match_id: str, message: dict):
        if match_id in self.active_rooms:
            payload = json.dumps(message)
            for connection in list(self.active_rooms[match_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    self.disconnect(match_id, connection)

manager = ChatConnectionManager()


@router.get("/matches", response_model=List[MatchSummary])
async def list_matches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Match)
        .options(
            selectinload(Match.user1),
            selectinload(Match.user2),
            selectinload(Match.task1),
            selectinload(Match.task2),
        )
        .where(
            and_(
                or_(
                    Match.user1_id == current_user.id,
                    Match.user2_id == current_user.id
                ),
                Match.is_active == True
            )
        )
        .order_by(Match.created_at.desc())
    )
    result = await db.execute(query)
    matches = result.scalars().all()

    summaries = []
    for m in matches:
        is_user1 = (m.user1_id == current_user.id)
        other_user = m.user2 if is_user1 else m.user1
        my_task = m.task1 if is_user1 else m.task2
        other_user_task = m.task2 if is_user1 else m.task1

        # Fetch last message
        last_msg_res = await db.execute(
            select(Message)
            .where(Message.match_id == m.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_res.scalar_one_or_none()

        # Unread count
        unread_res = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.match_id == m.id,
                    Message.sender_id != current_user.id,
                    Message.is_read == False
                )
            )
        )
        unread_count = unread_res.scalar() or 0

        summaries.append(
            MatchSummary(
                match_id=m.id,
                matched_user=UserPublicProfile.model_validate(other_user),
                matched_user_task=TaskRead.model_validate(other_user_task) if other_user_task else None,
                my_task=TaskRead.model_validate(my_task) if my_task else None,
                last_message=MessageRead.model_validate(last_msg) if last_msg else None,
                unread_count=unread_count,
                is_active=m.is_active,
                created_at=m.created_at
            )
        )

    return summaries


@router.get("/matches/{match_id}", response_model=MatchDetail)
async def get_match_detail(
    match_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Match)
        .options(
            selectinload(Match.user1),
            selectinload(Match.user2),
            selectinload(Match.task1),
            selectinload(Match.task2),
        )
        .where(
            and_(
                Match.id == match_id,
                or_(
                    Match.user1_id == current_user.id,
                    Match.user2_id == current_user.id
                )
            )
        )
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

    is_user1 = (match.user1_id == current_user.id)
    other_user = match.user2 if is_user1 else match.user1
    my_task = match.task1 if is_user1 else match.task2
    other_user_task = match.task2 if is_user1 else match.task1

    return MatchDetail(
        id=match.id,
        is_active=match.is_active,
        matched_at=match.created_at,
        other_user=UserPublicProfile.model_validate(other_user),
        other_user_task=TaskRead.model_validate(other_user_task) if other_user_task else None,
        my_task=TaskRead.model_validate(my_task) if my_task else None
    )


@router.post("/matches/{match_id}/unmatch")
async def unmatch(
    match_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Match).where(
            and_(
                Match.id == match_id,
                or_(
                    Match.user1_id == current_user.id,
                    Match.user2_id == current_user.id
                )
            )
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

    match.is_active = False
    match.unmatcher_id = current_user.id
    await db.commit()

    # Broadcast unmatch to room
    await manager.broadcast(str(match_id), {
        "type": "unmatch",
        "match_id": str(match_id),
        "unmatched_by": str(current_user.id)
    })

    return {"message": "Successfully unmatched", "match_id": match_id}


@router.get("/matches/{match_id}/messages", response_model=MessageListResponse)
async def get_messages(
    match_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify access
    match_res = await db.execute(
        select(Match).where(
            and_(
                Match.id == match_id,
                or_(
                    Match.user1_id == current_user.id,
                    Match.user2_id == current_user.id
                )
            )
        )
    )
    if not match_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

    # Fetch messages
    result = await db.execute(
        select(Message)
        .where(Message.match_id == match_id)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()

    # Mark other user's unread messages as read
    for m in messages:
        if m.sender_id != current_user.id and not m.is_read:
            m.is_read = True
    await db.commit()

    count_res = await db.execute(
        select(func.count(Message.id)).where(Message.match_id == match_id)
    )
    total = count_res.scalar() or 0

    return MessageListResponse(
        items=[MessageRead.model_validate(m) for m in messages],
        total=total
    )


@router.post("/matches/{match_id}/messages", response_model=MessageRead)
async def send_message(
    match_id: uuid.UUID,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    match_res = await db.execute(
        select(Match).where(
            and_(
                Match.id == match_id,
                Match.is_active == True,
                or_(
                    Match.user1_id == current_user.id,
                    Match.user2_id == current_user.id
                )
            )
        )
    )
    match = match_res.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active match not found")

    message = Message(
        match_id=match_id,
        sender_id=current_user.id,
        content=data.content.strip(),
        is_read=False
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    msg_read = MessageRead.model_validate(message)

    # Broadcast via WebSocket
    await manager.broadcast(str(match_id), {
        "type": "new_message",
        "data": json.loads(msg_read.model_dump_json())
    })

    return msg_read


@router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    match_id: str = Query(...)
):
    """
    WebSocket for 1-on-1 real-time body doubling chat & sprint timer synchronization.
    """
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id_str = payload.get("sub")
    if not user_id_str:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_uuid = uuid.UUID(user_id_str)
        match_uuid = uuid.UUID(match_id)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify user is a member of this active match
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(Match).where(
                and_(
                    Match.id == match_uuid,
                    Match.is_active == True,
                    or_(
                        Match.user1_id == user_uuid,
                        Match.user2_id == user_uuid
                    )
                )
            )
        )
        match = res.scalar_one_or_none()
        if not match:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect(match_id, websocket)

    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            event_type = data.get("type", "message")

            if event_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                async with AsyncSessionLocal() as session:
                    new_msg = Message(
                        match_id=match_uuid,
                        sender_id=user_uuid,
                        content=content,
                        is_read=False
                    )
                    session.add(new_msg)
                    await session.commit()
                    await session.refresh(new_msg)
                    msg_read = MessageRead.model_validate(new_msg)

                await manager.broadcast(match_id, {
                    "type": "new_message",
                    "data": json.loads(msg_read.model_dump_json())
                })

            elif event_type == "typing":
                # Broadcast typing indicator to partner
                await manager.broadcast(match_id, {
                    "type": "typing",
                    "user_id": str(user_uuid),
                    "is_typing": bool(data.get("is_typing", True))
                })

            elif event_type == "start_sprint":
                # Body doubling synchronized sprint timer! (e.g. 20 min)
                duration = data.get("duration_minutes", 20)
                await manager.broadcast(match_id, {
                    "type": "sprint_started",
                    "started_by": str(user_uuid),
                    "duration_minutes": duration,
                    "started_at": datetime.now(timezone.utc).isoformat()
                })

    except WebSocketDisconnect:
        manager.disconnect(match_id, websocket)
    except Exception:
        manager.disconnect(match_id, websocket)

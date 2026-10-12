from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserPublicProfile
from app.schemas.task import TaskRead
from app.schemas.message import MessageRead

class MatchSummary(BaseModel):
    match_id: uuid.UUID
    matched_user: UserPublicProfile
    matched_user_task: Optional[TaskRead] = None
    my_task: Optional[TaskRead] = None
    last_message: Optional[MessageRead] = None
    unread_count: int = 0
    is_active: bool
    created_at: datetime

class MatchDetail(BaseModel):
    id: uuid.UUID
    is_active: bool
    matched_at: datetime
    other_user: UserPublicProfile
    other_user_task: Optional[TaskRead] = None
    my_task: Optional[TaskRead] = None

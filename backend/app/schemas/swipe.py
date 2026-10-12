from typing import Optional, Literal
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserPublicProfile
from app.schemas.task import TaskRead

class SwipeCreate(BaseModel):
    target_task_id: uuid.UUID
    action: Literal["like", "pass"]

class MatchData(BaseModel):
    match_id: uuid.UUID
    matched_with: UserPublicProfile
    their_task: Optional[TaskRead] = None
    matched_at: datetime

class SwipeResponse(BaseModel):
    is_match: bool
    match_data: Optional[MatchData] = None

from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserPublicProfile

class TaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    estimated_duration_minutes: int = Field(default=20, ge=5, le=180)

class TaskCreate(TaskBase):
    photo_url: str

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = None
    estimated_duration_minutes: Optional[int] = Field(None, ge=5, le=180)
    status: Optional[str] = Field(None, pattern="^(active|completed|archived)$")
    photo_url: Optional[str] = None

class TaskRead(TaskBase):
    id: uuid.UUID
    user_id: uuid.UUID
    photo_url: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TaskFeedItem(BaseModel):
    task_id: uuid.UUID
    title: str
    description: Optional[str] = None
    photo_url: str
    estimated_duration_minutes: int
    created_at: datetime
    user: UserPublicProfile

    model_config = ConfigDict(from_attributes=True)

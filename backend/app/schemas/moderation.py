from typing import Optional
import uuid
from pydantic import BaseModel, Field

class BlockCreate(BaseModel):
    user_id: uuid.UUID
    reason: Optional[str] = Field(default="User blocked", max_length=100)

class ReportCreate(BaseModel):
    user_id: uuid.UUID
    reason: str = Field(..., min_length=3, max_length=100)
    details: Optional[str] = Field(None, max_length=1000)

class ModerationResponse(BaseModel):
    success: bool = True
    message: str

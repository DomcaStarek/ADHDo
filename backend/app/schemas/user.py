from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class ADHDPreferences(BaseModel):
    cleaning_style: str = Field(default="sprint", description="e.g. sprint, pomodoro, relaxed")
    tags: List[str] = Field(
        default_factory=lambda: ["silent_body_doubling", "laundry_hater", "20min_burst"],
        description="ADHD personality & task tags"
    )
    preferred_duration: int = Field(default=20, ge=5, le=180, description="Preferred sprint duration in minutes")

class UserBase(BaseModel):
    email: EmailStr
    display_name: str = Field(..., min_length=2, max_length=80)
    bio: Optional[str] = Field(None, max_length=300)
    avatar_url: Optional[str] = None
    adhd_preferences: ADHDPreferences = Field(default_factory=ADHDPreferences)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=80)
    bio: Optional[str] = Field(None, max_length=300)
    avatar_url: Optional[str] = None
    adhd_preferences: Optional[ADHDPreferences] = None

class UserRead(UserBase):
    id: uuid.UUID
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserPublicProfile(BaseModel):
    id: uuid.UUID
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    adhd_preferences: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

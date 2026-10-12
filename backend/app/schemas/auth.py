from typing import Optional
import uuid
from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserRead, ADHDPreferences

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=2, max_length=80)
    bio: Optional[str] = Field(None, max_length=300)
    adhd_preferences: Optional[ADHDPreferences] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class MessageResponse(BaseModel):
    message: str
    success: bool = True

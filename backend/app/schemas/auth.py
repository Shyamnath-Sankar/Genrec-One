from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


# Base Response
class ResponseBase(BaseModel):
    success: bool = True
    message: Optional[str] = None


class DataResponse(ResponseBase):
    data: Any = None


class PaginatedResponse(ResponseBase):
    data: List[Any] = []
    total: int = 0
    page: int = 1
    limit: int = 10
    total_pages: int = 0


# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    id: str
    must_change_password: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

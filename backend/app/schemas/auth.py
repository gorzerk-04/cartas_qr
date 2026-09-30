from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole


class UserLogin(BaseModel):
    username: str
    password: str


class RestaurantSummary(BaseModel):
    id: UUID
    name: str
    slug: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    is_superadmin: bool
    role: UserRole = UserRole.RESTAURANT_OWNER
    must_change_password: bool = False
    # Solo se llena en /auth/me. Para el admin va vacía (ve todo).
    restaurants: Optional[List[RestaurantSummary]] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str


class TokenResponseData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenResponse(BaseModel):
    data: TokenResponseData


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

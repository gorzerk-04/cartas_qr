from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole
from app.schemas.auth import RestaurantSummary


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    role: UserRole = UserRole.RESTAURANT_OWNER
    restaurant_ids: List[UUID] = []


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)


class UserRestaurantsUpdate(BaseModel):
    restaurant_ids: List[UUID]


class UserAdminResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    must_change_password: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    restaurants: List[RestaurantSummary] = []

    class Config:
        from_attributes = True


class UserWithTempPassword(UserAdminResponse):
    # Se devuelve UNA sola vez; en la base solo se guarda el hash.
    temp_password: str


class UserListResponse(BaseModel):
    data: List[UserAdminResponse]
    meta: Dict[str, Any]

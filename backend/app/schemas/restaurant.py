from pydantic import BaseModel, Field, EmailStr
from typing import Literal, Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class RestaurantBase(BaseModel):
    name: str = Field(..., max_length=200)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = None
    primary_color: str = Field("#FF6B35", max_length=7)
    secondary_color: str = Field("#2C3E50", max_length=7)
    accent_color: str = Field("#F7C59F", max_length=7)
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Perú"
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    is_active: bool = True
    is_published: bool = False


class RestaurantCreate(RestaurantBase):
    pass


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None


class RestaurantResponse(RestaurantBase):
    id: UUID
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    qr_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class RestaurantListResponse(BaseModel):
    data: List[RestaurantResponse]
    meta: dict


class QRGenerateRequest(BaseModel):
    format: Literal["png", "svg"] = "png"
    with_logo: bool = True
    foreground_color: str = Field("#000000", max_length=7)
    background_color: str = Field("#FFFFFF", max_length=7)
    size_px: int = Field(1024, ge=256, le=2048)

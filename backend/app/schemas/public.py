from pydantic import BaseModel, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import time
from decimal import Decimal
from app.models.product import ProductStatus
from app.models.restaurant_social import SocialPlatform


class PublicScheduleItem(BaseModel):
    day_of_week: int  # 0=Lunes ... 6=Domingo
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    is_closed: bool

    @field_validator("open_time", "close_time", mode="before")
    @classmethod
    def format_time(cls, value):
        if isinstance(value, time):
            return value.strftime("%H:%M")
        return value

    class Config:
        from_attributes = True


class PublicSocialItem(BaseModel):
    platform: SocialPlatform
    url: str

    class Config:
        from_attributes = True


class PublicProductItem(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    price: Decimal
    original_price: Optional[Decimal] = None
    image_url: Optional[str] = None
    status: ProductStatus
    is_featured: bool
    tags: List[str] = []
    allergens: List[str] = []

    class Config:
        from_attributes = True


class PublicCategoryItem(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int
    products: List[PublicProductItem]

    class Config:
        from_attributes = True


class PublicRestaurantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    cover_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    accent_color: str
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str
    is_open_now: bool
    schedules: List[PublicScheduleItem]
    socials: List[PublicSocialItem]
    categories: List[PublicCategoryItem]

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from app.models.restaurant_social import SocialPlatform


class RestaurantSocialBase(BaseModel):
    platform: SocialPlatform
    url: str = Field(..., max_length=500)


class RestaurantSocialCreate(RestaurantSocialBase):
    pass


class RestaurantSocialUpdate(BaseModel):
    url: Optional[str] = Field(None, max_length=500)


class RestaurantSocialResponse(RestaurantSocialBase):
    id: UUID
    restaurant_id: UUID
    display_order: int

    class Config:
        from_attributes = True

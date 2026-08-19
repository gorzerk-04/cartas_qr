from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from app.models.restaurant_social import SocialPlatform

# El enlace se renderiza como href en la carta pública. El input del panel es type="url"
# pero vive fuera de un <form> (para no anidar formularios), así que la validación nativa
# del navegador nunca se dispara: sin esta comprobación se guardaba cualquier texto.
ALLOWED_URL_SCHEMES = ("http://", "https://")


def validate_social_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value
    cleaned = value.strip()
    if not cleaned.lower().startswith(ALLOWED_URL_SCHEMES):
        raise ValueError("El enlace debe ser una URL que empiece con http:// o https://")
    return cleaned


class RestaurantSocialBase(BaseModel):
    platform: SocialPlatform
    url: str = Field(..., max_length=500)


class RestaurantSocialCreate(RestaurantSocialBase):
    _validate_url = field_validator("url")(validate_social_url)


class RestaurantSocialUpdate(BaseModel):
    url: Optional[str] = Field(None, max_length=500)

    _validate_url = field_validator("url")(validate_social_url)


class RestaurantSocialResponse(RestaurantSocialBase):
    id: UUID
    restaurant_id: UUID
    display_order: int

    class Config:
        from_attributes = True

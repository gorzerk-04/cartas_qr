from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Literal, Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal
import re

# Los colores de marca se inyectan tal cual como CSS custom properties en la carta
# pública (ver menu/[slug]/layout.tsx). Sin validar el formato, un valor cualquiera
# ("rojo", un typo) se guardaba con 200 y rompía silenciosamente el color de la marca.
HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def validate_hex_color(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value
    if not HEX_COLOR_RE.match(value):
        raise ValueError(
            "El color debe estar en formato hexadecimal, por ejemplo #FF6B35"
        )
    return value


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
    # Solo se valida en la entrada: RestaurantResponse también hereda de RestaurantBase,
    # y validar ahí convertiría cualquier color inválido ya guardado en la base en un
    # error 500 al leerlo, en vez de dejar que se pueda corregir desde el panel.
    _validate_colors = field_validator(
        "primary_color", "secondary_color", "accent_color"
    )(validate_hex_color)


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

    _validate_colors = field_validator(
        "primary_color", "secondary_color", "accent_color"
    )(validate_hex_color)


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

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.core.google_review import normalize_google_review_url


class GoogleReviewResolveRequest(BaseModel):
    maps_url: str = Field(..., max_length=2000)


class GoogleReviewResolveResponse(BaseModel):
    nombre: Optional[str] = None
    ftid: str
    review_url: str


class GoogleReviewSettingsUpdate(BaseModel):
    # Ambos opcionales. null (o "") quita el valor; un campo ausente no se toca.
    # El review_url NO se acepta del cliente: se genera en el servidor desde google_maps_url.
    google_maps_url: Optional[str] = Field(None, max_length=2000)
    google_review_url_override: Optional[str] = None

    # InvalidGoogleReviewUrlError hereda de ValueError: Pydantic lo convierte en 422
    _validate_override = field_validator("google_review_url_override")(normalize_google_review_url)


class GoogleReviewSettingsResponse(BaseModel):
    google_maps_url: Optional[str] = None
    google_place_ftid: Optional[str] = None
    google_review_url: Optional[str] = None
    google_review_url_override: Optional[str] = None

    class Config:
        from_attributes = True

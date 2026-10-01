"""Reseñas de Google: herramienta y asignación por restaurante. Solo admin de plataforma.

Un dueño (o cualquier rol que no sea platform_admin) recibe 403 en todos estos endpoints.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_platform_admin
from app.core.errors import api_error
from app.core.limiter import limiter
from app.repositories.restaurant import restaurant_repository
from app.schemas.google_review import (
    GoogleReviewResolveRequest,
    GoogleReviewResolveResponse,
    GoogleReviewSettingsResponse,
    GoogleReviewSettingsUpdate,
)
from app.services import google_reviews
from app.services.google_reviews import ReviewLinkError

router = APIRouter(dependencies=[Depends(require_platform_admin)])


def _error(exc: ReviewLinkError):
    return api_error(exc.status_code, exc.code, exc.message)


def _get_restaurant_or_404(db: Session, id: UUID):
    restaurant = restaurant_repository.get(db, id=id)
    if not restaurant:
        raise api_error(404, "RESTAURANT_NOT_FOUND", "Restaurante no encontrado")
    return restaurant


@router.post("/google-review/resolve", response_model=GoogleReviewResolveResponse)
@limiter.limit("10/minute")
def resolve_google_review(request: Request, body: GoogleReviewResolveRequest):
    """Convierte el enlace de Google Maps de un local en el enlace para dejar reseña. No guarda nada."""
    try:
        return google_reviews.resolve_review_link(body.maps_url)
    except ReviewLinkError as exc:
        raise _error(exc)


@router.get("/restaurants/{id}/google-review", response_model=GoogleReviewSettingsResponse)
def get_google_review_settings(id: UUID, db: Session = Depends(get_db)):
    return _get_restaurant_or_404(db, id)


@router.put("/restaurants/{id}/google-review", response_model=GoogleReviewSettingsResponse)
@limiter.limit("10/minute")
def update_google_review_settings(
    request: Request,
    id: UUID,
    body: GoogleReviewSettingsUpdate,
    db: Session = Depends(get_db),
):
    """Guarda el enlace de Maps (y lo resuelve en el servidor si cambió) y el enlace oficial.

    Mandar ambos en null quita el enlace de la carta.
    """
    restaurant = _get_restaurant_or_404(db, id)
    sent = body.model_dump(exclude_unset=True)
    changes = {}

    if "google_maps_url" in sent:
        maps_url = (sent["google_maps_url"] or "").strip() or None
        if maps_url is None:
            changes.update(google_maps_url=None, google_place_ftid=None, google_review_url=None)
        elif maps_url != restaurant.google_maps_url or not restaurant.google_review_url:
            try:
                resolved = google_reviews.resolve_review_link(maps_url)
            except ReviewLinkError as exc:
                raise _error(exc)
            changes.update(
                google_maps_url=maps_url,
                google_place_ftid=resolved["ftid"],
                google_review_url=resolved["review_url"],
            )

    if "google_review_url_override" in sent:
        changes["google_review_url_override"] = sent["google_review_url_override"]

    if changes:
        restaurant = restaurant_repository.update(db, db_obj=restaurant, obj_in=changes)
    return restaurant

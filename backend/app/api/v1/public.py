from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.limiter import limiter
from app.schemas.public import PublicRestaurantResponse
from app.services.public import public_service

router = APIRouter()


@router.get("/restaurants/{slug}", response_model=PublicRestaurantResponse)
@limiter.limit("100/minute")
def get_public_restaurant(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Carta pública de un restaurante. Sin autenticación. Usado por el SSR de Next.js.
    """
    return public_service.get_restaurant_by_slug(db, slug)

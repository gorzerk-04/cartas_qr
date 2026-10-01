from typing import List
from uuid import UUID
from datetime import time as dt_time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, accessible_restaurant, ensure_platform_admin
from app.models.restaurant import Restaurant
from app.models.user import User
from app.repositories.restaurant import restaurant_repository
from app.repositories.operating_hour import operating_hour_repository
from app.schemas.operating_hour import (
    OperatingHourResponse,
    OperatingHoursBulkUpdate,
)

router = APIRouter()


def _parse_time(time_str: str | None) -> dt_time | None:
    """Parse 'HH:MM' string to datetime.time, or return None."""
    if not time_str:
        return None
    try:
        parts = time_str.split(":")
        return dt_time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return None


@router.get("/{restaurant_id}/hours", response_model=List[OperatingHourResponse])
def get_operating_hours(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    current_user: User = Depends(get_current_user),
):
    """
    Obtener los horarios de atención de un restaurante.
    """
    restaurant = restaurant_repository.get(db, id=restaurant_id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )
    return operating_hour_repository.get_by_restaurant(db, restaurant_id=restaurant_id)


@router.put("/{restaurant_id}/hours", response_model=List[OperatingHourResponse])
def update_operating_hours(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    body: OperatingHoursBulkUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Actualizar todos los horarios de atención de un restaurante (7 días).
    Reemplaza los horarios existentes con los nuevos datos proporcionados.
    """
    ensure_platform_admin(current_user)
    restaurant = restaurant_repository.get(db, id=restaurant_id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )

    # Validate days: should be 0-6
    for h in body.hours:
        if h.day_of_week < 0 or h.day_of_week > 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"day_of_week inválido: {h.day_of_week}. Debe ser entre 0 (Lunes) y 6 (Domingo).",
            )

    hours_data = []
    for h in body.hours:
        hours_data.append({
            "day_of_week": h.day_of_week,
            "open_time": _parse_time(h.open_time),
            "close_time": _parse_time(h.close_time),
            "is_closed": h.is_closed,
        })

    return operating_hour_repository.upsert_hours(
        db, restaurant_id=restaurant_id, hours_data=hours_data
    )

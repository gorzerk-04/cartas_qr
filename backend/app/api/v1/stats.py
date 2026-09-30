from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, accessible_restaurant_ids
from app.models.user import User
from app.schemas.stats import AdminStats
from app.services.stats import stats_service

router = APIRouter()


@router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return stats_service.get_admin_stats(db, accessible_restaurant_ids(db, current_user))

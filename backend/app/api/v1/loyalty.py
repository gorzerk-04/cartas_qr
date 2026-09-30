from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.api.deps import accessible_restaurant, get_current_user, get_db
from app.core.errors import api_error
from app.core.limiter import limiter
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.loyalty import (
    CheckInRequest,
    CheckInResponse,
    ProgramResponse,
    ProgramUpsert,
    RedemptionListResponse,
    RedemptionResponse,
    VisitListResponse,
    VisitResponse,
    VoidRequest,
)
from app.services.customers import customer_service
from app.services.loyalty import loyalty_service

router = APIRouter()


# ---------------------------------------------------------------- programa
@router.get("/{restaurant_id}/loyalty/program", response_model=ProgramResponse)
def get_program(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    current_user: User = Depends(get_current_user),
):
    program = loyalty_service.get_program(db, restaurant.id)
    if program is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "PROGRAM_NOT_FOUND", "El restaurante aún no configuró su programa")
    return program


@router.put("/{restaurant_id}/loyalty/program", response_model=ProgramResponse)
def upsert_program(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    obj_in: ProgramUpsert,
    current_user: User = Depends(get_current_user),
):
    """Crea o actualiza el programa. La carta pública se revalida desde el frontend."""
    return loyalty_service.upsert_program(db, restaurant, obj_in)


# ---------------------------------------------------------------- check-in
@router.post(
    "/{restaurant_id}/loyalty/check-in",
    response_model=CheckInResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("60/minute")
def check_in(
    request: Request,
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    body: CheckInRequest,
    current_user: User = Depends(get_current_user),
):
    """Flujo rápido de caja: registra la visita (y crea al comensal si es nuevo)."""
    return loyalty_service.check_in(db, restaurant, current_user, body)


# ---------------------------------------------------------------- visitas
@router.get("/{restaurant_id}/customers/{customer_id}/visits", response_model=VisitListResponse)
def list_visits(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
):
    return VisitListResponse(data=loyalty_service.list_visits(db, restaurant.id, customer_id))


@router.post(
    "/{restaurant_id}/customers/{customer_id}/visits",
    response_model=VisitResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_visit(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Registro manual de una visita (mismas reglas que el check-in)."""
    now = datetime.utcnow()
    visit, program = loyalty_service.register_visit(db, restaurant, customer_id, current_user, now=now)
    return loyalty_service.visit_response(visit, program, now, username=current_user.username)


@router.post("/{restaurant_id}/loyalty/visits/{visit_id}/void", response_model=VisitResponse)
def void_visit(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    visit_id: UUID,
    body: VoidRequest,
    current_user: User = Depends(get_current_user),
):
    visit = loyalty_service.void_visit(db, restaurant.id, visit_id, body.reason, current_user)
    return loyalty_service.visit_response(
        visit, loyalty_service.get_program(db, restaurant.id), datetime.utcnow()
    )


# ---------------------------------------------------------------- canjes
@router.get("/{restaurant_id}/customers/{customer_id}/redemptions", response_model=RedemptionListResponse)
def list_redemptions(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
):
    return RedemptionListResponse(data=loyalty_service.list_redemptions(db, restaurant.id, customer_id))


@router.post(
    "/{restaurant_id}/customers/{customer_id}/redemptions",
    response_model=RedemptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def redeem(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Canjea la recompensa: consume las N visitas elegibles más antiguas."""
    # Confirma que el comensal es de este restaurante antes de tocar nada
    customer_service.get_or_404(db, restaurant.id, customer_id)
    return loyalty_service.redeem(db, restaurant, customer_id, current_user)


@router.post("/{restaurant_id}/loyalty/redemptions/{redemption_id}/void", response_model=RedemptionResponse)
def void_redemption(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    redemption_id: UUID,
    body: VoidRequest,
    current_user: User = Depends(get_current_user),
):
    return loyalty_service.void_redemption(db, restaurant.id, redemption_id, body.reason, current_user)

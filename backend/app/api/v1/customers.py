from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from app.api.deps import accessible_restaurant, get_current_user, get_db
from app.core.errors import api_error
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)
from app.services.customers import customer_service
from app.services.loyalty import loyalty_service

router = APIRouter()


@router.get("/{restaurant_id}/customers", response_model=CustomerListResponse)
def list_customers(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Comensales del restaurante con su saldo de visitas y su última visita."""
    data, total = loyalty_service.list_customers(
        db, restaurant.id, skip=(page - 1) * size, limit=size, search=search
    )
    total_pages = (total + size - 1) // size
    return CustomerListResponse(
        data=data,
        meta={
            "page": page,
            "size": size,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    )


@router.post("/{restaurant_id}/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    obj_in: CustomerCreate,
    current_user: User = Depends(get_current_user),
):
    customer = customer_service.create(db, restaurant, obj_in, current_user)
    return loyalty_service.customer_response(db, customer, loyalty_service.get_program(db, restaurant.id))


# `lookup` debe declararse antes que `/{customer_id}`
@router.get("/{restaurant_id}/customers/lookup", response_model=CustomerResponse)
def lookup_customer(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    phone: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
):
    """Busca un comensal por celular (200 con su saldo, o 404)."""
    customer = customer_service.find_by_phone(db, restaurant.id, phone)
    if customer is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "CUSTOMER_NOT_FOUND", "Comensal no encontrado")
    return loyalty_service.customer_response(db, customer, loyalty_service.get_program(db, restaurant.id))


@router.get("/{restaurant_id}/customers/{customer_id}", response_model=CustomerResponse)
def get_customer(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
):
    customer = customer_service.get_or_404(db, restaurant.id, customer_id)
    return loyalty_service.customer_response(db, customer, loyalty_service.get_program(db, restaurant.id))


@router.put("/{restaurant_id}/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    customer_id: UUID,
    obj_in: CustomerUpdate,
    current_user: User = Depends(get_current_user),
):
    customer = customer_service.get_or_404(db, restaurant.id, customer_id)
    customer = customer_service.update(db, customer, obj_in)
    return loyalty_service.customer_response(db, customer, loyalty_service.get_program(db, restaurant.id))


@router.delete("/{restaurant_id}/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def anonymize_customer(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant),
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """Anonimiza al comensal (borra sus datos personales y conserva visitas y canjes)."""
    customer = customer_service.get_or_404(db, restaurant.id, customer_id)
    customer_service.anonymize(db, customer)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.restaurant_social import (
    RestaurantSocialCreate,
    RestaurantSocialUpdate,
    RestaurantSocialResponse,
)
from app.repositories.restaurant_social import restaurant_social_repository
from app.services.restaurant_social import restaurant_social_service

router = APIRouter()


@router.post("/{restaurant_id}/socials", response_model=RestaurantSocialResponse, status_code=status.HTTP_201_CREATED)
def create_social(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    obj_in: RestaurantSocialCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Agregar una red social al restaurante.
    """
    return restaurant_social_service.create_social(db, restaurant_id=restaurant_id, obj_in=obj_in)


@router.get("/{restaurant_id}/socials", response_model=List[RestaurantSocialResponse])
def list_socials(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    current_user: User = Depends(get_current_user),
):
    """
    Listar las redes sociales del restaurante.
    """
    return restaurant_social_repository.get_by_restaurant(db, restaurant_id=restaurant_id)


@router.put("/{restaurant_id}/socials/{id}", response_model=RestaurantSocialResponse)
def update_social(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    id: UUID,
    obj_in: RestaurantSocialUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Actualizar la URL de una red social. La plataforma es inmutable.
    """
    return restaurant_social_service.update_social(db, restaurant_id=restaurant_id, id=id, obj_in=obj_in)


@router.delete("/{restaurant_id}/socials/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_social(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    id: UUID,
    current_user: User = Depends(get_current_user),
):
    """
    Eliminar una red social del restaurante.
    """
    restaurant_social_service.delete_social(db, restaurant_id=restaurant_id, id=id)
    return

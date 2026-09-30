from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_platform_admin
from app.models.user import User, UserRole
from app.schemas.user import (
    UserAdminResponse,
    UserCreate,
    UserListResponse,
    UserRestaurantsUpdate,
    UserUpdate,
    UserWithTempPassword,
)
from app.services.users import user_service

# Todos los endpoints exigen rol platform_admin.
router = APIRouter(dependencies=[Depends(require_platform_admin)])


@router.get("", response_model=UserListResponse)
def list_users(
    *,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
):
    results, total = user_service.list_users(db, skip=(page - 1) * limit, limit=limit, search=search, role=role)
    total_pages = (total + limit - 1) // limit
    return UserListResponse(
        data=[user_service.to_response(db, u) for u in results],
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    )


@router.post("", response_model=UserWithTempPassword, status_code=status.HTTP_201_CREATED)
def create_user(*, db: Session = Depends(get_db), obj_in: UserCreate):
    """Crea un usuario con contraseña temporal (se muestra una sola vez)."""
    user, temp_password = user_service.create_user(db, obj_in)
    return UserWithTempPassword(**user_service.to_response(db, user).model_dump(), temp_password=temp_password)


@router.get("/{id}", response_model=UserAdminResponse)
def get_user(*, db: Session = Depends(get_db), id: UUID):
    return user_service.to_response(db, user_service.get_or_404(db, id))


@router.patch("/{id}", response_model=UserAdminResponse)
def update_user(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    obj_in: UserUpdate,
    current_user: User = Depends(require_platform_admin),
):
    user = user_service.get_or_404(db, id)
    updated = user_service.update_user(db, user=user, obj_in=obj_in, actor=current_user)
    return user_service.to_response(db, updated)


@router.put("/{id}/restaurants", response_model=UserAdminResponse)
def set_user_restaurants(*, db: Session = Depends(get_db), id: UUID, body: UserRestaurantsUpdate):
    user = user_service.get_or_404(db, id)
    user_service.set_restaurants(db, user=user, restaurant_ids=body.restaurant_ids)
    return user_service.to_response(db, user)


@router.post("/{id}/reset-password", response_model=UserWithTempPassword)
def reset_user_password(*, db: Session = Depends(get_db), id: UUID):
    """Genera una nueva contraseña temporal (se muestra una sola vez)."""
    user = user_service.get_or_404(db, id)
    temp_password = user_service.reset_password(db, user=user)
    return UserWithTempPassword(**user_service.to_response(db, user).model_dump(), temp_password=temp_password)

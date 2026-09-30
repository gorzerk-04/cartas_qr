import uuid
from typing import Generator, List, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import ALGORITHM
from app.models.restaurant import Restaurant
from app.models.user import User
from app.repositories.restaurant import restaurant_repository
from app.repositories.restaurant_member import restaurant_member_repository
from app.repositories.user import user_repository
from app.schemas.auth import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"/api/v1/auth/login"
)


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def _load_user(db: Session, token: str) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tipo de token inválido",
            )
    except (jwt.JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudieron validar las credenciales",
        )
    try:
        user_uuid = uuid.UUID(token_data.sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ID de usuario inválido en el token",
        )
    user = user_repository.get(db, id=user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    return user


def get_current_user_allow_password_change(
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    """Usuario autenticado, aunque tenga una contraseña temporal pendiente de cambio.

    Solo para /auth/me y /auth/change-password.
    """
    return _load_user(db, token)


def get_current_user(
    current_user: User = Depends(get_current_user_allow_password_change),
) -> User:
    if current_user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PASSWORD_CHANGE_REQUIRED",
                "message": "Debes cambiar tu contraseña temporal antes de continuar",
            },
        )
    return current_user


def ensure_platform_admin(user: User) -> None:
    """Lanza 403 si el usuario no es administrador de plataforma."""
    if not user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene privilegios suficientes",
        )


def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    ensure_platform_admin(current_user)
    return current_user


# Nombre histórico, ahora basado en `role`.
get_current_active_superadmin = require_platform_admin


def accessible_restaurant_ids(db: Session, user: User) -> Optional[List[UUID]]:
    """None = todos los restaurantes (admin); para el dueño, la lista de sus IDs."""
    if user.is_platform_admin:
        return None
    return restaurant_member_repository.restaurant_ids_for_user(db, user.id)


def get_accessible_restaurant(db: Session, user: User, restaurant_id: UUID) -> Restaurant:
    """Devuelve el restaurante si el usuario puede acceder; si no, 404.

    Un restaurante ajeno responde igual que uno inexistente o borrado, para no
    revelar su existencia.
    """
    restaurant = restaurant_repository.get(db, id=restaurant_id)
    if restaurant is None or (
        not user.is_platform_admin
        and not restaurant_member_repository.exists(db, user.id, restaurant_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado",
        )
    return restaurant


def accessible_restaurant(
    restaurant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Restaurant:
    """Dependencia para rutas con `{restaurant_id}` en la URL."""
    return get_accessible_restaurant(db, current_user, restaurant_id)


def accessible_restaurant_by_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Restaurant:
    """Dependencia para rutas con `{id}` de restaurante en la URL (routers de restaurantes)."""
    return get_accessible_restaurant(db, current_user, id)

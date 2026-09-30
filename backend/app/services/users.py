import secrets
from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.repositories.restaurant import restaurant_repository
from app.repositories.restaurant_member import restaurant_member_repository
from app.repositories.user import user_repository
from app.schemas.auth import RestaurantSummary
from app.schemas.user import UserAdminResponse, UserCreate, UserUpdate


def generate_temp_password() -> str:
    return secrets.token_urlsafe(12)


class UserService:
    # ---------- lectura ----------
    def to_response(self, db: Session, user: User) -> UserAdminResponse:
        restaurants = []
        for rid in restaurant_member_repository.restaurant_ids_for_user(db, user.id):
            r = restaurant_repository.get(db, id=rid)
            if r:
                restaurants.append(RestaurantSummary.model_validate(r))
        data = UserAdminResponse.model_validate(user)
        data.restaurants = restaurants
        return data

    def get_or_404(self, db: Session, user_id: UUID) -> User:
        user = user_repository.get(db, id=user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        return user

    def list_users(
        self,
        db: Session,
        *,
        skip: int,
        limit: int,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
    ) -> Tuple[List[User], int]:
        query = db.query(User).filter(User.deleted_at == None)
        if search:
            like = f"%{search}%"
            query = query.filter(or_(User.email.ilike(like), User.username.ilike(like)))
        if role is not None:
            query = query.filter(User.role == role)
        total = query.count()
        return query.order_by(User.username.asc()).offset(skip).limit(limit).all(), total

    # ---------- validaciones ----------
    def _validate_restaurants(self, db: Session, restaurant_ids: List[UUID]) -> List[UUID]:
        unique_ids = list(dict.fromkeys(restaurant_ids))
        if unique_ids:
            found = (
                db.query(Restaurant.id)
                .filter(Restaurant.id.in_(unique_ids), Restaurant.deleted_at == None)
                .count()
            )
            if found != len(unique_ids):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Alguno de los restaurantes indicados no existe",
                )
        return unique_ids

    def _ensure_unique(self, db: Session, *, email: Optional[str], username: Optional[str], exclude_id: Optional[UUID] = None) -> None:
        if email:
            other = user_repository.get_by_email(db, email)
            if other and other.id != exclude_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")
        if username:
            other = user_repository.get_by_username(db, username)
            if other and other.id != exclude_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya está registrado")

    def _active_admin_count(self, db: Session) -> int:
        return (
            db.query(User)
            .filter(User.deleted_at == None, User.is_active == True, User.role == UserRole.PLATFORM_ADMIN)
            .count()
        )

    # ---------- escritura ----------
    def create_user(self, db: Session, obj_in: UserCreate) -> Tuple[User, str]:
        self._ensure_unique(db, email=obj_in.email, username=obj_in.username)
        restaurant_ids = self._validate_restaurants(db, obj_in.restaurant_ids)
        temp_password = generate_temp_password()
        user = User(
            email=obj_in.email,
            username=obj_in.username,
            hashed_password=get_password_hash(temp_password),
            is_active=True,
            is_superadmin=False,
            role=obj_in.role,
            must_change_password=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        if restaurant_ids:
            restaurant_member_repository.replace_for_user(db, user.id, restaurant_ids)
        return user, temp_password

    def update_user(self, db: Session, *, user: User, obj_in: UserUpdate, actor: User) -> User:
        data = obj_in.model_dump(exclude_unset=True)
        self._ensure_unique(db, email=data.get("email"), username=data.get("username"), exclude_id=user.id)

        deactivating = data.get("is_active") is False and user.is_active
        demoting = "role" in data and data["role"] != UserRole.PLATFORM_ADMIN and user.role == UserRole.PLATFORM_ADMIN
        if user.id == actor.id and (deactivating or demoting):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No puedes desactivarte ni quitarte el rol de administrador a ti mismo",
            )
        if (
            user.role == UserRole.PLATFORM_ADMIN
            and user.is_active
            and (deactivating or demoting)
            and self._active_admin_count(db) <= 1
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede dejar el sistema sin administradores activos",
            )
        return user_repository.update(db, db_obj=user, obj_in=data)

    def set_restaurants(self, db: Session, *, user: User, restaurant_ids: List[UUID]) -> None:
        ids = self._validate_restaurants(db, restaurant_ids)
        restaurant_member_repository.replace_for_user(db, user.id, ids)

    def reset_password(self, db: Session, *, user: User) -> str:
        temp_password = generate_temp_password()
        user.hashed_password = get_password_hash(temp_password)
        user.must_change_password = True
        db.add(user)
        db.commit()
        return temp_password


user_service = UserService()

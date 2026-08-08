from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.restaurant_social import RestaurantSocial
from app.repositories.restaurant_social import restaurant_social_repository
from app.repositories.restaurant import restaurant_repository
from app.schemas.restaurant_social import RestaurantSocialCreate, RestaurantSocialUpdate


class RestaurantSocialService:
    def _get_owned(self, db: Session, *, restaurant_id: UUID, id: UUID) -> RestaurantSocial:
        social = restaurant_social_repository.get(db, id=id)
        if not social or social.restaurant_id != restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Red social no encontrada",
            )
        return social

    def create_social(
        self, db: Session, *, restaurant_id: UUID, obj_in: RestaurantSocialCreate
    ) -> RestaurantSocial:
        restaurant = restaurant_repository.get(db, id=restaurant_id)
        if not restaurant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Restaurante no encontrado",
            )

        existing = restaurant_social_repository.get_by_platform(db, restaurant_id, obj_in.platform)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La plataforma '{obj_in.platform.value}' ya está registrada para este restaurante.",
            )

        social_data = obj_in.model_dump()
        social_data["restaurant_id"] = restaurant_id
        social_data["display_order"] = restaurant_social_repository.get_max_display_order(db, restaurant_id) + 1
        return restaurant_social_repository.create(db, obj_in=social_data)

    def update_social(
        self, db: Session, *, restaurant_id: UUID, id: UUID, obj_in: RestaurantSocialUpdate
    ) -> RestaurantSocial:
        social = self._get_owned(db, restaurant_id=restaurant_id, id=id)
        update_data = obj_in.model_dump(exclude_unset=True)
        return restaurant_social_repository.update(db, db_obj=social, obj_in=update_data)

    def delete_social(self, db: Session, *, restaurant_id: UUID, id: UUID) -> None:
        self._get_owned(db, restaurant_id=restaurant_id, id=id)
        restaurant_social_repository.delete(db, id=id)


restaurant_social_service = RestaurantSocialService()

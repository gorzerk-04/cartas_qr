from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.restaurant_social import RestaurantSocial
from app.repositories.base import BaseRepository


class RestaurantSocialRepository(BaseRepository[RestaurantSocial]):
    def __init__(self):
        super().__init__(RestaurantSocial)

    def get_by_restaurant(self, db: Session, restaurant_id: UUID) -> List[RestaurantSocial]:
        return (
            db.query(RestaurantSocial)
            .filter(RestaurantSocial.restaurant_id == restaurant_id)
            .order_by(RestaurantSocial.display_order.asc())
            .all()
        )

    def get_by_platform(self, db: Session, restaurant_id: UUID, platform: str) -> RestaurantSocial | None:
        return (
            db.query(RestaurantSocial)
            .filter(
                RestaurantSocial.restaurant_id == restaurant_id,
                RestaurantSocial.platform == platform,
            )
            .first()
        )

    def get_max_display_order(self, db: Session, restaurant_id: UUID) -> int:
        result = (
            db.query(func.max(RestaurantSocial.display_order))
            .filter(RestaurantSocial.restaurant_id == restaurant_id)
            .scalar()
        )
        return result if result is not None else -1


restaurant_social_repository = RestaurantSocialRepository()

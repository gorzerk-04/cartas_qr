from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.restaurant_customer import RestaurantCustomer
from app.repositories.base import BaseRepository


class RestaurantCustomerRepository(BaseRepository[RestaurantCustomer]):
    def __init__(self):
        super().__init__(RestaurantCustomer)

    def get_by_phone(self, db: Session, restaurant_id: UUID, phone: str) -> Optional[RestaurantCustomer]:
        return (
            db.query(RestaurantCustomer)
            .filter(
                RestaurantCustomer.restaurant_id == restaurant_id,
                RestaurantCustomer.phone == phone,
                RestaurantCustomer.deleted_at == None,
            )
            .first()
        )


restaurant_customer_repository = RestaurantCustomerRepository()

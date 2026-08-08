from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.category import Category
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    def __init__(self):
        super().__init__(Category)

    def get_by_restaurant(self, db: Session, restaurant_id: UUID) -> List[Category]:
        return (
            db.query(Category)
            .filter(Category.restaurant_id == restaurant_id, Category.deleted_at == None)
            .order_by(Category.display_order.asc(), Category.name.asc())
            .all()
        )

    def get_max_display_order(self, db: Session, restaurant_id: UUID) -> int:
        result = (
            db.query(func.max(Category.display_order))
            .filter(Category.restaurant_id == restaurant_id, Category.deleted_at == None)
            .scalar()
        )
        return result if result is not None else -1


category_repository = CategoryRepository()

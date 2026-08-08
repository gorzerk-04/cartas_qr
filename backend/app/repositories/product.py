from typing import Optional, List, Tuple, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.product import Product, ProductStatus
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    def __init__(self):
        super().__init__(Product)

    def get_list(
        self,
        db: Session,
        *,
        restaurant_id: UUID,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        category_id: Optional[UUID] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[Product], int]:
        query = db.query(Product).filter(
            Product.restaurant_id == restaurant_id,
            Product.deleted_at == None,
        )
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(Product.name.ilike(search_filter), Product.description.ilike(search_filter))
            )
        if category_id is not None:
            query = query.filter(Product.category_id == category_id)
        if status is not None:
            query = query.filter(Product.status == status)

        total = query.count()
        results = (
            query.order_by(Product.display_order.asc(), Product.name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return results, total

    def get_public_by_restaurant(self, db: Session, restaurant_id: UUID) -> List[Product]:
        return (
            db.query(Product)
            .filter(
                Product.restaurant_id == restaurant_id,
                Product.deleted_at == None,
                Product.status != ProductStatus.HIDDEN,
            )
            .order_by(Product.display_order.asc(), Product.name.asc())
            .all()
        )

    def get_max_display_order(self, db: Session, restaurant_id: UUID) -> int:
        result = (
            db.query(func.max(Product.display_order))
            .filter(Product.restaurant_id == restaurant_id, Product.deleted_at == None)
            .scalar()
        )
        return result if result is not None else -1

    def count_by_category(self, db: Session, category_id: UUID) -> int:
        return (
            db.query(Product)
            .filter(Product.category_id == category_id, Product.deleted_at == None)
            .count()
        )

    def count_by_restaurant_grouped(self, db: Session, restaurant_id: UUID) -> Dict[UUID, int]:
        rows = (
            db.query(Product.category_id, func.count(Product.id))
            .filter(Product.restaurant_id == restaurant_id, Product.deleted_at == None)
            .group_by(Product.category_id)
            .all()
        )
        return {category_id: count for category_id, count in rows}


product_repository = ProductRepository()

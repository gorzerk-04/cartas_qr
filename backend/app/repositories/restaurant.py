from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.restaurant import Restaurant
from app.repositories.base import BaseRepository


class RestaurantRepository(BaseRepository[Restaurant]):
    def __init__(self):
        super().__init__(Restaurant)

    def get_by_slug(self, db: Session, slug: str) -> Optional[Restaurant]:
        return db.query(Restaurant).filter(
            Restaurant.slug == slug,
            Restaurant.deleted_at == None
        ).first()

    def get_list(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_published: Optional[bool] = None,
        restaurant_ids: Optional[List[UUID]] = None,
    ) -> Tuple[List[Restaurant], int]:
        query = db.query(Restaurant).filter(Restaurant.deleted_at == None)

        # None = sin restricción (admin); lista = solo esos restaurantes (dueño)
        if restaurant_ids is not None:
            query = query.filter(Restaurant.id.in_(restaurant_ids))

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    Restaurant.name.ilike(search_filter),
                    Restaurant.slug.ilike(search_filter)
                )
            )

        if is_active is not None:
            query = query.filter(Restaurant.is_active == is_active)

        if is_published is not None:
            query = query.filter(Restaurant.is_published == is_published)

        total = query.count()
        results = query.order_by(Restaurant.name.asc()).offset(skip).limit(limit).all()
        
        return results, total


restaurant_repository = RestaurantRepository()

from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.restaurant import Restaurant
from app.schemas.stats import AdminStats


class StatsService:
    def get_admin_stats(self, db: Session, restaurant_ids: Optional[List[UUID]] = None) -> AdminStats:
        """restaurant_ids=None cuenta todos (admin); una lista acota a esos restaurantes."""
        base_query = db.query(Restaurant).filter(Restaurant.deleted_at == None)
        if restaurant_ids is not None:
            base_query = base_query.filter(Restaurant.id.in_(restaurant_ids))
        return AdminStats(
            total_restaurants=base_query.count(),
            published_restaurants=base_query.filter(Restaurant.is_published == True).count(),
            qr_generated_count=base_query.filter(Restaurant.qr_url.isnot(None)).count(),
        )


stats_service = StatsService()

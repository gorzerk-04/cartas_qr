from sqlalchemy.orm import Session
from app.models.restaurant import Restaurant
from app.schemas.stats import AdminStats


class StatsService:
    def get_admin_stats(self, db: Session) -> AdminStats:
        base_query = db.query(Restaurant).filter(Restaurant.deleted_at == None)
        return AdminStats(
            total_restaurants=base_query.count(),
            published_restaurants=base_query.filter(Restaurant.is_published == True).count(),
            qr_generated_count=base_query.filter(Restaurant.qr_url.isnot(None)).count(),
        )


stats_service = StatsService()

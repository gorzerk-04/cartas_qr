from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.loyalty import LoyaltyRedemption, LoyaltyVisit
from app.models.restaurant import Restaurant
from app.models.restaurant_customer import RestaurantCustomer
from app.schemas.stats import AdminStats


class StatsService:
    def get_admin_stats(
        self,
        db: Session,
        restaurant_ids: Optional[List[UUID]] = None,
        now: Optional[datetime] = None,
    ) -> AdminStats:
        """restaurant_ids=None cuenta todos (admin); una lista acota a esos restaurantes."""
        base_query = db.query(Restaurant).filter(Restaurant.deleted_at == None)
        if restaurant_ids is not None:
            base_query = base_query.filter(Restaurant.id.in_(restaurant_ids))
        # Mes en curso (UTC naive, igual que las fechas de las visitas y los canjes)
        now = now or datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        customers = db.query(RestaurantCustomer).filter(RestaurantCustomer.deleted_at == None)
        visits = db.query(LoyaltyVisit).filter(
            LoyaltyVisit.voided_at == None, LoyaltyVisit.visited_at >= month_start
        )
        redemptions = db.query(LoyaltyRedemption).filter(
            LoyaltyRedemption.voided_at == None, LoyaltyRedemption.redeemed_at >= month_start
        )
        if restaurant_ids is not None:
            customers = customers.filter(RestaurantCustomer.restaurant_id.in_(restaurant_ids))
            visits = visits.filter(LoyaltyVisit.restaurant_id.in_(restaurant_ids))
            redemptions = redemptions.filter(LoyaltyRedemption.restaurant_id.in_(restaurant_ids))

        return AdminStats(
            customers_total=customers.count(),
            loyalty_visits_month=visits.count(),
            loyalty_redemptions_month=redemptions.count(),
            total_restaurants=base_query.count(),
            published_restaurants=base_query.filter(Restaurant.is_published == True).count(),
            qr_generated_count=base_query.filter(Restaurant.qr_url.isnot(None)).count(),
        )


stats_service = StatsService()

from pydantic import BaseModel


class AdminStats(BaseModel):
    total_restaurants: int
    published_restaurants: int
    qr_generated_count: int
    customers_total: int = 0
    loyalty_visits_month: int = 0
    loyalty_redemptions_month: int = 0

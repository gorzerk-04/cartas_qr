from pydantic import BaseModel


class AdminStats(BaseModel):
    total_restaurants: int
    published_restaurants: int
    qr_generated_count: int

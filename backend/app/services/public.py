from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.operating_hour import OperatingHour
from app.repositories.restaurant import restaurant_repository
from app.repositories.operating_hour import operating_hour_repository
from app.repositories.restaurant_social import restaurant_social_repository
from app.repositories.category import category_repository
from app.repositories.product import product_repository
from app.repositories.loyalty import loyalty_program_repository
from app.schemas.public import PublicRestaurantResponse


class PublicService:
    def get_restaurant_by_slug(self, db: Session, slug: str) -> PublicRestaurantResponse:
        restaurant = restaurant_repository.get_by_slug(db, slug)
        if not restaurant or not restaurant.is_published or not restaurant.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carta no encontrada",
            )

        hours = operating_hour_repository.get_by_restaurant(db, restaurant_id=restaurant.id)
        socials = restaurant_social_repository.get_by_restaurant(db, restaurant_id=restaurant.id)
        categories = [
            c for c in category_repository.get_by_restaurant(db, restaurant_id=restaurant.id)
            if c.is_active
        ]
        products = product_repository.get_public_by_restaurant(db, restaurant_id=restaurant.id)

        program = loyalty_program_repository.get_by_restaurant(db, restaurant.id)
        loyalty = (
            {"visits_required": program.visits_required, "reward_description": program.reward_description}
            if program is not None and program.is_active
            else None
        )

        products_by_category = {}
        for product in products:
            products_by_category.setdefault(product.category_id, []).append(product)

        return PublicRestaurantResponse(
            id=restaurant.id,
            name=restaurant.name,
            slug=restaurant.slug,
            description=restaurant.description,
            logo_url=restaurant.logo_url,
            cover_url=restaurant.cover_url,
            primary_color=restaurant.primary_color,
            secondary_color=restaurant.secondary_color,
            accent_color=restaurant.accent_color,
            phone=restaurant.phone,
            whatsapp=restaurant.whatsapp,
            email=restaurant.email,
            website=restaurant.website,
            address=restaurant.address,
            city=restaurant.city,
            country=restaurant.country,
            is_open_now=self.compute_is_open_now(hours),
            loyalty=loyalty,
            schedules=hours,
            socials=socials,
            categories=[
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "image_url": c.image_url,
                    "display_order": c.display_order,
                    "products": products_by_category.get(c.id, []),
                }
                for c in categories
            ],
        )

    def compute_is_open_now(
        self, hours: List[OperatingHour], now: Optional[datetime] = None
    ) -> bool:
        now = now or datetime.now()
        today = now.weekday()  # 0=Lunes, igual que day_of_week
        current_time = now.time()

        today_hours = next((h for h in hours if h.day_of_week == today), None)
        if not today_hours or today_hours.is_closed:
            return False
        if today_hours.open_time is None or today_hours.close_time is None:
            return False

        if today_hours.open_time <= today_hours.close_time:
            return today_hours.open_time <= current_time <= today_hours.close_time
        # Horario que cruza medianoche (ej. bar abierto 20:00-02:00)
        return current_time >= today_hours.open_time or current_time <= today_hours.close_time


public_service = PublicService()

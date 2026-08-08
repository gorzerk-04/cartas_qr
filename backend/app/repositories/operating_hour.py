from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.operating_hour import OperatingHour


class OperatingHourRepository:
    def get_by_restaurant(self, db: Session, restaurant_id: UUID) -> List[OperatingHour]:
        return (
            db.query(OperatingHour)
            .filter(
                OperatingHour.restaurant_id == restaurant_id,
                OperatingHour.deleted_at == None,
            )
            .order_by(OperatingHour.day_of_week.asc())
            .all()
        )

    def upsert_hours(
        self,
        db: Session,
        restaurant_id: UUID,
        hours_data: List[dict],
    ) -> List[OperatingHour]:
        """
        Replace all operating hours for a restaurant with the new set.
        This is an "upsert all" approach: delete existing + insert new.
        """
        # Delete existing hours (hard delete since they're bulk-replaced)
        db.query(OperatingHour).filter(
            OperatingHour.restaurant_id == restaurant_id,
        ).delete(synchronize_session="fetch")

        new_hours = []
        for hour_data in hours_data:
            hour = OperatingHour(
                restaurant_id=restaurant_id,
                day_of_week=hour_data["day_of_week"],
                open_time=hour_data.get("open_time"),
                close_time=hour_data.get("close_time"),
                is_closed=hour_data.get("is_closed", False),
            )
            db.add(hour)
            new_hours.append(hour)

        db.commit()
        for h in new_hours:
            db.refresh(h)
        return new_hours


operating_hour_repository = OperatingHourRepository()

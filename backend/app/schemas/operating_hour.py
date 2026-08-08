from pydantic import BaseModel, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import time


class OperatingHourBase(BaseModel):
    day_of_week: int  # 0=Lunes ... 6=Domingo
    open_time: Optional[str] = None   # "HH:MM" format
    close_time: Optional[str] = None  # "HH:MM" format
    is_closed: bool = False


class OperatingHourCreate(OperatingHourBase):
    pass


class OperatingHourResponse(OperatingHourBase):
    id: UUID
    restaurant_id: UUID

    @field_validator("open_time", "close_time", mode="before")
    @classmethod
    def format_time(cls, value):
        if isinstance(value, time):
            return value.strftime("%H:%M")
        return value

    class Config:
        from_attributes = True


class OperatingHoursBulkUpdate(BaseModel):
    """Allows updating all 7 days at once."""
    hours: List[OperatingHourBase]

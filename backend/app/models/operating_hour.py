from sqlalchemy import Column, String, Boolean, SmallInteger, Time, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import AuditMixin


class OperatingHour(Base, AuditMixin):
    __tablename__ = "operating_hours"

    # Relación con el restaurante
    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo
    day_of_week = Column(SmallInteger, nullable=False)

    open_time = Column(Time, nullable=True)   # Hora de apertura (null si está cerrado)
    close_time = Column(Time, nullable=True)  # Hora de cierre (null si está cerrado)

    is_closed = Column(Boolean, default=False, nullable=False)

    # Relaciones
    restaurant = relationship("Restaurant", backref="operating_hours")

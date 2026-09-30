from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import AuditMixin


class RestaurantCustomer(Base, AuditMixin):
    """Comensal de un restaurante (programa de fidelización).

    No se borra de verdad: al pedir el borrado se ANONIMIZA (nombre genérico, phone/email/
    notes en NULL y deleted_at), conservando sus visitas y canjes para las estadísticas.
    """

    __tablename__ = "restaurant_customers"

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    full_name = Column(String(120), nullable=False)
    # E.164 normalizado. NULL solo después de anonimizar.
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    notes = Column(String(500), nullable=True)
    consent_given_at = Column(DateTime, nullable=False)
    consent_version = Column(Integer, nullable=False)
    created_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Los NULL no chocan: el mismo celular puede volver a registrarse tras anonimizar.
    __table_args__ = (
        UniqueConstraint("restaurant_id", "phone", name="uq_customer_restaurant_phone"),
    )

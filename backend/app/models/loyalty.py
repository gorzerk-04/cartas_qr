from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import AuditMixin


class LoyaltyProgram(Base, AuditMixin):
    """Programa de fidelización: uno por restaurante, inactivo por defecto."""

    __tablename__ = "loyalty_programs"

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    is_active = Column(Boolean, default=False, nullable=False)
    visits_required = Column(Integer, default=10, nullable=False)
    reward_description = Column(String(200), nullable=False)
    # Mismo restaurante (se valida en el servicio)
    reward_product_id = Column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    min_hours_between_visits = Column(Integer, default=12, nullable=False)
    # NULL = las visitas no vencen
    visits_expire_after_days = Column(Integer, nullable=True)
    consent_text = Column(String(500), nullable=False)
    consent_version = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        CheckConstraint("visits_required BETWEEN 2 AND 100", name="ck_loyalty_programs_visits_required"),
        CheckConstraint("min_hours_between_visits BETWEEN 0 AND 168", name="ck_loyalty_programs_min_hours"),
        CheckConstraint(
            "visits_expire_after_days IS NULL OR visits_expire_after_days > 0",
            name="ck_loyalty_programs_expire_days",
        ),
    )


class LoyaltyRedemption(Base, AuditMixin):
    """Canje de una recompensa. Guarda copias (snapshot) de lo vigente al canjear."""

    __tablename__ = "loyalty_redemptions"

    restaurant_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False
    )
    customer_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurant_customers.id", ondelete="CASCADE"), nullable=False
    )
    redeemed_at = Column(DateTime, nullable=False)
    redeemed_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    visits_consumed = Column(Integer, nullable=False)
    reward_description_snapshot = Column(String(200), nullable=False)
    reward_product_id_snapshot = Column(UUID(as_uuid=True), nullable=True)  # sin FK: es una copia
    voided_at = Column(DateTime, nullable=True)
    voided_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    void_reason = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_loyalty_redemptions_restaurant_redeemed", "restaurant_id", "redeemed_at"),
        Index("ix_loyalty_redemptions_customer_id", "customer_id"),
    )


class LoyaltyVisit(Base, AuditMixin):
    """Visita registrada por el personal desde el panel. Solo inserciones (+ anulación)."""

    __tablename__ = "loyalty_visits"

    restaurant_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False
    )
    customer_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurant_customers.id", ondelete="CASCADE"), nullable=False
    )
    visited_at = Column(DateTime, nullable=False)
    registered_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Se llena cuando un canje consume esta visita
    redemption_id = Column(
        UUID(as_uuid=True), ForeignKey("loyalty_redemptions.id", ondelete="SET NULL"), nullable=True
    )
    voided_at = Column(DateTime, nullable=True)
    voided_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    void_reason = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_loyalty_visits_restaurant_customer_visited", "restaurant_id", "customer_id", "visited_at"),
        Index("ix_loyalty_visits_restaurant_visited", "restaurant_id", "visited_at"),
    )

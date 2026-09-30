import enum
from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import AuditMixin


class MemberRole(str, enum.Enum):
    OWNER = "owner"
    STAFF = "staff"  # reservado para una fase futura


class RestaurantMember(Base, AuditMixin):
    """Membresía usuario <-> restaurante. Se borra de verdad (hard-delete)."""

    __tablename__ = "restaurant_members"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    restaurant_id = Column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    member_role = Column(
        SAEnum(MemberRole, name="member_role", values_callable=lambda e: [m.value for m in e]),
        default=MemberRole.OWNER,
        server_default=MemberRole.OWNER.value,
        nullable=False,
    )

    user = relationship("User", back_populates="memberships")
    restaurant = relationship("Restaurant")

    __table_args__ = (
        UniqueConstraint("user_id", "restaurant_id", name="uq_member_user_restaurant"),
    )

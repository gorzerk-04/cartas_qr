import enum
from sqlalchemy import Column, String, Text, Integer, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import AuditMixin


class SocialPlatform(str, enum.Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    LINKEDIN = "linkedin"
    TRIPADVISOR = "tripadvisor"
    GOOGLE_MAPS = "google_maps"


class RestaurantSocial(Base, AuditMixin):
    __tablename__ = "restaurant_socials"

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    platform = Column(
        SAEnum(SocialPlatform, name="social_platform", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    url = Column(Text, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)

    restaurant = relationship("Restaurant", backref="socials")

    __table_args__ = (
        UniqueConstraint("restaurant_id", "platform", name="uq_social_restaurant_platform"),
    )

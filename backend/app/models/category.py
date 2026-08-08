from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import AuditMixin


class Category(Base, AuditMixin):
    __tablename__ = "categories"

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    image_url = Column(Text, nullable=True)
    image_cloudinary_id = Column(String(255), nullable=True)

    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    restaurant = relationship("Restaurant", backref="categories")

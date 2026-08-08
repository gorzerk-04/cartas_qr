import enum
from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, ForeignKey, JSON
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import AuditMixin


class ProductStatus(str, enum.Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    HIDDEN = "hidden"


class Product(Base, AuditMixin):
    __tablename__ = "products"

    restaurant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id = Column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    price = Column(Numeric(10, 2), nullable=False)
    original_price = Column(Numeric(10, 2), nullable=True)

    image_url = Column(Text, nullable=True)
    image_cloudinary_id = Column(String(255), nullable=True)

    status = Column(
        SAEnum(ProductStatus, name="product_status", values_callable=lambda e: [m.value for m in e]),
        default=ProductStatus.AVAILABLE,
        nullable=False,
    )

    tags = Column(JSON, default=list, nullable=True)
    allergens = Column(JSON, default=list, nullable=True)

    is_featured = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)

    restaurant = relationship("Restaurant", backref="products")
    category = relationship("Category", backref="products")

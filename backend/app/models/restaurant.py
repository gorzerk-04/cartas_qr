from sqlalchemy import Column, String, Text, Boolean, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import AuditMixin


class Restaurant(Base, AuditMixin):
    __tablename__ = "restaurants"

    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Branding
    logo_url = Column(Text, nullable=True)
    logo_cloudinary_id = Column(String(255), nullable=True)
    cover_url = Column(Text, nullable=True)
    cover_cloudinary_id = Column(String(255), nullable=True)
    primary_color = Column(String(7), default="#FF6B35", nullable=False)
    secondary_color = Column(String(7), default="#2C3E50", nullable=False)
    accent_color = Column(String(7), default="#F7C59F", nullable=False)
    
    # Contact
    phone = Column(String(20), nullable=True)
    whatsapp = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    
    # Location
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), default="Perú", nullable=False)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    
    # QR Code
    qr_url = Column(Text, nullable=True)
    qr_cloudinary_id = Column(String(255), nullable=True)
    
    # User ownership
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    creator = relationship("User")

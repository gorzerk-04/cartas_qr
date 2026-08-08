from sqlalchemy import Column, String, Boolean, DateTime
from app.core.database import Base
from app.models.base import AuditMixin


class User(Base, AuditMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superadmin = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

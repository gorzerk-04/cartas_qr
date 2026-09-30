import enum
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import AuditMixin


class UserRole(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    RESTAURANT_OWNER = "restaurant_owner"


def _default_role(context) -> "UserRole":
    """Compatibilidad: un usuario creado con is_superadmin=True nace como platform_admin.

    Cualquier otro alta es restaurant_owner (mínimo privilegio). El acceso en runtime
    se decide solo por `role`; `is_superadmin` no se consulta.
    """
    if context.get_current_parameters().get("is_superadmin"):
        return UserRole.PLATFORM_ADMIN
    return UserRole.RESTAURANT_OWNER


class User(Base, AuditMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    # En desuso: el acceso se decide por `role`. Se retira en una migración futura.
    is_superadmin = Column(Boolean, default=False, nullable=False)
    # Mínimo privilegio por defecto: un usuario nuevo es dueño sin restaurantes asignados.
    role = Column(
        SAEnum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        default=_default_role,
        server_default=UserRole.RESTAURANT_OWNER.value,
        nullable=False,
    )
    must_change_password = Column(Boolean, default=False, server_default="0", nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    memberships = relationship(
        "RestaurantMember", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def is_platform_admin(self) -> bool:
        return self.role == UserRole.PLATFORM_ADMIN


# Registra el modelo referenciado por `memberships` (evita depender del orden de imports).
from app.models.restaurant_member import RestaurantMember  # noqa: E402,F401

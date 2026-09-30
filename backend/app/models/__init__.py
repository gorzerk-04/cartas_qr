"""Registra todos los modelos al importar cualquiera de ellos.

Varios modelos se referencian por nombre en relationship("...") / ForeignKey. Si un script
(seed.py, scripts/*.py) importa solo uno, SQLAlchemy no encuentra los demás al configurar
los mapeos y falla. Importarlos todos aquí evita esa clase de errores.
"""
from app.models.user import User, UserRole  # noqa: F401
from app.models.restaurant import Restaurant  # noqa: F401
from app.models.restaurant_member import RestaurantMember, MemberRole  # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.operating_hour import OperatingHour  # noqa: F401
from app.models.restaurant_social import RestaurantSocial  # noqa: F401
from app.models.restaurant_customer import RestaurantCustomer  # noqa: F401
from app.models.loyalty import LoyaltyProgram, LoyaltyRedemption, LoyaltyVisit  # noqa: F401

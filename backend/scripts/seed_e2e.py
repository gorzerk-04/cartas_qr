"""Datos para los tests e2e (Playwright). Idempotente.

Crea (o actualiza):
  - el admin de plataforma            (E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD)
  - un dueño sin cambio pendiente     (E2E_OWNER_USERNAME / E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD)
  - el restaurante "E2E Propio", asignado al dueño, con el programa de fidelización
    activo (2 visitas para canjear, sin tiempo mínimo entre visitas) y con enlace de
    reseñas de Google
  - el restaurante "E2E Ajeno", sin asignar, sin programa y sin enlace de reseñas

Se niega a correr con ENVIRONMENT=production. Uso (desde backend/):
    E2E_ADMIN_PASSWORD=... E2E_OWNER_PASSWORD=... python scripts/seed_e2e.py
"""
import os
import sys

# Permite importar `app` al correr `python scripts/seed_e2e.py` desde backend/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.loyalty import LoyaltyProgram  # noqa: E402
from app.models.restaurant import Restaurant  # noqa: E402
from app.models.restaurant_member import RestaurantMember  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.services.loyalty import default_consent_text  # noqa: E402

OWN_SLUG = "e2e-propio"
OTHER_SLUG = "e2e-ajeno"
# Reseñas de prueba: enlace largo de Google Maps (no requiere red) y el enlace que genera
E2E_MAPS_URL = (
    "https://www.google.com/maps/place/Chifa+Taiwan/@-9.9554469,-76.2486745,21z/data=!4m6!3m5"
    "!1s0x91a7c3749150a1f7:0xb61bbbe27d37f437!8m2!3d-9.9554923!4d-76.2486634?entry=tts"
)
E2E_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJ96FQkXTDp5ERN_Q3feK7G7Y"


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        print(f"Error: define la variable de entorno {name}.")
        sys.exit(1)
    return value


def _upsert_user(db, *, username, email, password, role):
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        user = User(username=username, email=email, hashed_password="", is_superadmin=False)
        db.add(user)
    user.email = email
    user.hashed_password = get_password_hash(password)
    user.role = role
    user.is_active = True
    user.must_change_password = False
    db.commit()
    db.refresh(user)
    return user


def _upsert_restaurant(db, *, name, slug, with_review=False):
    restaurant = db.query(Restaurant).filter(Restaurant.slug == slug).first()
    if restaurant is None:
        restaurant = Restaurant(name=name, slug=slug, is_active=True, is_published=True)
        db.add(restaurant)
    restaurant.name = name
    restaurant.is_active = True
    restaurant.is_published = True
    restaurant.deleted_at = None
    restaurant.google_maps_url = E2E_MAPS_URL if with_review else None
    restaurant.google_place_ftid = "0x91a7c3749150a1f7:0xb61bbbe27d37f437" if with_review else None
    restaurant.google_review_url = E2E_REVIEW_URL if with_review else None
    restaurant.google_review_url_override = None
    db.commit()
    db.refresh(restaurant)
    return restaurant


def _upsert_loyalty_program(db, restaurant):
    """Programa activo: 2 visitas para canjear y sin espera entre visitas (para los e2e)."""
    program = db.query(LoyaltyProgram).filter(LoyaltyProgram.restaurant_id == restaurant.id).first()
    if program is None:
        program = LoyaltyProgram(
            restaurant_id=restaurant.id,
            reward_description="Postre e2e gratis",
            consent_text=default_consent_text(restaurant.name),
            consent_version=1,
        )
        db.add(program)
    program.is_active = True
    program.visits_required = 2
    program.min_hours_between_visits = 0
    program.visits_expire_after_days = None
    program.reward_description = "Postre e2e gratis"
    db.commit()


def seed_e2e():
    if settings.ENVIRONMENT == "production":
        print("Error: seed_e2e.py no puede correr con ENVIRONMENT=production.")
        sys.exit(1)

    admin_username = os.environ.get("E2E_ADMIN_USERNAME", "admin")
    admin_password = _require("E2E_ADMIN_PASSWORD")
    owner_username = os.environ.get("E2E_OWNER_USERNAME", "e2e_owner")
    owner_email = os.environ.get("E2E_OWNER_EMAIL", "e2e-owner@example.com")
    owner_password = _require("E2E_OWNER_PASSWORD")

    db = SessionLocal()
    try:
        _upsert_user(
            db,
            username=admin_username,
            email=os.environ.get("E2E_ADMIN_EMAIL", "admin@menuqr.com"),
            password=admin_password,
            role=UserRole.PLATFORM_ADMIN,
        )
        owner = _upsert_user(
            db,
            username=owner_username,
            email=owner_email,
            password=owner_password,
            role=UserRole.RESTAURANT_OWNER,
        )
        own = _upsert_restaurant(db, name="E2E Propio", slug=OWN_SLUG, with_review=True)
        other = _upsert_restaurant(db, name="E2E Ajeno", slug=OTHER_SLUG)
        _upsert_loyalty_program(db, own)
        # "E2E Ajeno" sin programa activo: su carta no debe mostrar la fila de acciones
        db.query(LoyaltyProgram).filter(LoyaltyProgram.restaurant_id == other.id).update({"is_active": False})
        db.commit()

        # El dueño es miembro solo del restaurante propio
        db.query(RestaurantMember).filter(
            RestaurantMember.user_id == owner.id, RestaurantMember.restaurant_id == other.id
        ).delete()
        exists = (
            db.query(RestaurantMember)
            .filter(RestaurantMember.user_id == owner.id, RestaurantMember.restaurant_id == own.id)
            .first()
        )
        if not exists:
            db.add(RestaurantMember(user_id=owner.id, restaurant_id=own.id))
        db.commit()
        print(f"Datos e2e listos: admin '{admin_username}', dueño '{owner_username}', "
              f"restaurantes '{OWN_SLUG}' (asignado, con programa activo de 2 visitas y enlace de "
              f"reseñas) y '{OTHER_SLUG}' (sin asignar, sin programa ni enlace).")
    except Exception as e:
        print(f"Error al sembrar los datos e2e: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_e2e()

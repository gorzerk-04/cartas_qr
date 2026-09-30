import sys
import os
from sqlalchemy.orm import Session

# Add current path to sys path to import app correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole


def seed_db():
    admin_password = os.environ.get("SEED_ADMIN_PASSWORD")
    if not admin_password:
        print("Error: define la variable de entorno SEED_ADMIN_PASSWORD antes de correr el seed.")
        sys.exit(1)
    admin_email = os.environ.get("SEED_ADMIN_EMAIL", "admin@menuqr.com")
    admin_username = os.environ.get("SEED_ADMIN_USERNAME", "admin")

    print("Iniciando la siembra de base de datos (Seeding)...")
    db: Session = SessionLocal()
    try:
        # Check if we already have users
        admin_user = db.query(User).filter(User.username == admin_username).first()
        if not admin_user:
            print("Creando usuario administrador inicial...")
            admin_user = User(
                email=admin_email,
                username=admin_username,
                hashed_password=get_password_hash(admin_password),
                is_active=True,
                is_superadmin=True,
                role=UserRole.PLATFORM_ADMIN,
            )
            db.add(admin_user)
            db.commit()
            print(f"¡Usuario administrador '{admin_username}' creado exitosamente!")
        else:
            print("El usuario administrador ya existe.")
    except Exception as e:
        print(f"Error al sembrar la base de datos: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()

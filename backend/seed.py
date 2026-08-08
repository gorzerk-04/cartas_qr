import sys
import os
from sqlalchemy.orm import Session

# Add current path to sys path to import app correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def seed_db():
    print("Iniciando la siembra de base de datos (Seeding)...")
    db: Session = SessionLocal()
    try:
        # Check if we already have users
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            print("Creando usuario administrador inicial...")
            admin_user = User(
                email="admin@menuqr.com",
                username="admin",
                hashed_password=get_password_hash("SuperSecure123!"),
                is_active=True,
                is_superadmin=True
            )
            db.add(admin_user)
            db.commit()
            print("¡Usuario administrador 'admin' creado exitosamente con la contraseña 'SuperSecure123!'!")
        else:
            print("El usuario administrador ya existe.")
    except Exception as e:
        print(f"Error al sembrar la base de datos: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()

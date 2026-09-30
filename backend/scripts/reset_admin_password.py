"""Resetea la contraseña de un usuario en una base LOCAL de desarrollo.

Sirve cuando no recuerdas la clave del admin sembrado (el seed es idempotente y no
cambia la clave de un admin que ya existe). Se niega a correr con ENVIRONMENT=production.

Uso (desde backend/, con el venv activo):
    RESET_PASSWORD='<nueva-clave-de-10+-caracteres>' python scripts/reset_admin_password.py
    RESET_USERNAME=otro_usuario RESET_PASSWORD='...' python scripts/reset_admin_password.py
"""
import os
import sys

# Permite importar `app` al correr `python scripts/reset_admin_password.py` desde backend/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.models.user import User  # noqa: E402

MIN_LENGTH = 10


def main():
    if settings.ENVIRONMENT == "production":
        print("Error: este script no puede correr con ENVIRONMENT=production.")
        sys.exit(1)

    password = os.environ.get("RESET_PASSWORD")
    if not password or len(password) < MIN_LENGTH:
        print(f"Error: define RESET_PASSWORD con al menos {MIN_LENGTH} caracteres.")
        sys.exit(1)
    username = os.environ.get("RESET_USERNAME", "admin")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            print(f"Error: no existe el usuario '{username}' en esta base.")
            sys.exit(1)
        user.hashed_password = get_password_hash(password)
        user.is_active = True
        user.must_change_password = False
        db.commit()
        print(f"Contraseña de '{username}' actualizada (rol: {user.role.value}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()

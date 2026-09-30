import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.api.deps import get_db
from app.main import app

# Por defecto corre contra SQLite en memoria; TEST_DATABASE_URL permite apuntar
# la suite completa a un Postgres real (ej. para el Módulo 23) sin tocar este archivo.
SQLALCHEMY_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator:
    # Create the tables
    Base.metadata.create_all(bind=engine)
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def isolate_qr_static_dir(tmp_path, monkeypatch):
    # Evita que los QR y las imágenes subidas en modo mock (Cloudinary no
    # configurado) se escriban en backend/static/ real durante los tests.
    import app.services.qr as qr_module
    import app.services.cloudinary as cloudinary_module
    monkeypatch.setattr(qr_module, "STATIC_DIR", str(tmp_path))
    monkeypatch.setattr(cloudinary_module, "STATIC_DIR", str(tmp_path))


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    # El limiter es un singleton en memoria compartido entre tests — sin resetearlo,
    # un test que agota el límite de /public/restaurants/{slug} dejaría en 429
    # a los tests que corren después.
    from app.core.limiter import limiter
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture(scope="function")
def client(db) -> Generator:
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Fixtures de roles (Fase 1). Solo se agregan; las existentes no se modifican.
# ---------------------------------------------------------------------------
from app.core.security import get_password_hash  # noqa: E402
from app.models.restaurant import Restaurant  # noqa: E402
from app.models.restaurant_member import RestaurantMember  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

TEST_PASSWORD = "testpassword-123"


def login_headers(client, username: str, password: str = TEST_PASSWORD) -> dict:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['data']['access_token']}"}


@pytest.fixture
def make_user(db):
    def _make(username, role=UserRole.RESTAURANT_OWNER, *, is_active=True, must_change_password=False, password=TEST_PASSWORD):
        user = User(
            email=f"{username}@example.com",
            username=username,
            hashed_password=get_password_hash(password),
            is_active=is_active,
            role=role,
            must_change_password=must_change_password,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make


@pytest.fixture
def make_membership(db):
    def _make(user, restaurant_id):
        member = RestaurantMember(user_id=user.id, restaurant_id=restaurant_id)
        db.add(member)
        db.commit()
        return member

    return _make


@pytest.fixture
def make_restaurant(db):
    def _make(slug):
        restaurant = Restaurant(name=f"Resto {slug}", slug=slug)
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)
        return restaurant

    return _make


@pytest.fixture
def admin_user(make_user):
    return make_user("adminuser", UserRole.PLATFORM_ADMIN)


@pytest.fixture
def owner_user(make_user):
    return make_user("owneruser", UserRole.RESTAURANT_OWNER)


@pytest.fixture
def admin_headers(client, admin_user):
    return login_headers(client, admin_user.username)


@pytest.fixture
def owner_headers(client, owner_user):
    return login_headers(client, owner_user.username)

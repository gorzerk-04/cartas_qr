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

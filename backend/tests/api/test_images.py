import io
from urllib.parse import urlparse

from app.core.security import get_password_hash
from app.models.user import User


def seed_test_user_and_auth(client, db):
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superadmin=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    token = login_response.json()["data"]["access_token"]
    return token


def create_restaurant(client, token, slug="test-restaurant"):
    response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Restaurante de Prueba", "slug": slug},
    )
    return response.json()["id"]


def fake_image_file(content_type="image/png", size=1024):
    return ("logo.png", io.BytesIO(b"\x89PNG" + b"0" * size), content_type)


def test_upload_logo(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file()},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["logo_url"]


def test_upload_logo_reflects_actual_file_content(client, db, tmp_path):
    # Regresión: el modo mock (sin credenciales reales de Cloudinary) llegó a
    # devolver siempre la misma URL genérica sin importar el archivo subido.
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    content_a = b"\x89PNG" + b"A" * 200
    content_b = b"\x89PNG" + b"B" * 200

    response_a = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("logo.png", io.BytesIO(content_a), "image/png")},
    )
    url_a = response_a.json()["logo_url"]

    response_b = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("logo.png", io.BytesIO(content_b), "image/png")},
    )
    url_b = response_b.json()["logo_url"]

    assert url_a != url_b
    assert "res.cloudinary.com/demo" not in url_a
    assert "res.cloudinary.com/demo" not in url_b

    # El mount de /static en main.py apunta al backend/static/ real; los tests
    # redirigen las escrituras del servicio a tmp_path (fixture isolate_qr_static_dir),
    # así que se lee el archivo directo del disco en vez de por HTTP.
    relative_path = urlparse(url_b).path.removeprefix("/static/")
    saved_file = tmp_path / relative_path
    assert saved_file.read_bytes() == content_b


def test_upload_cover(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/cover",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file()},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["cover_url"]


def test_upload_logo_rejects_invalid_content_type(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )

    assert response.status_code == 400


def test_upload_logo_rejects_oversized_file(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file(size=6 * 1024 * 1024)},
    )

    assert response.status_code == 400
    assert "5 MB" in response.json()["detail"]


def test_upload_logo_restaurant_not_found(client, db):
    token = seed_test_user_and_auth(client, db)

    response = client.post(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file()},
    )

    assert response.status_code == 404


def test_upload_logo_requires_auth(client, db):
    response = client.post(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/logo",
        files={"file": fake_image_file()},
    )
    assert response.status_code == 401


def test_delete_logo_clears_url_and_file(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    upload = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file()},
    )
    assert upload.json()["logo_url"] is not None

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["logo_url"] is None

    # Y persiste: no es solo lo que devolvió la respuesta.
    detail = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail.json()["logo_url"] is None


def test_delete_cover_clears_url(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/cover",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file()},
    )

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/cover",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["cover_url"] is None


def test_delete_logo_without_logo_is_noop(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/logo",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["logo_url"] is None


def test_delete_logo_restaurant_not_found(client, db):
    token = seed_test_user_and_auth(client, db)

    response = client.delete(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/logo",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


def test_delete_logo_requires_auth(client, db):
    response = client.delete(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/logo"
    )
    assert response.status_code == 401

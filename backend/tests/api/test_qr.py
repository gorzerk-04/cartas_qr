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


def test_generate_qr_png_defaults(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["qr_url"]


def test_generate_qr_svg(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={"format": "svg"},
    )

    assert response.status_code == 200
    assert response.json()["qr_url"]


def test_generate_qr_with_logo_but_no_logo_uploaded(client, db):
    # with_logo=True on a restaurant with no logo_url must not fail — best-effort skip.
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={"with_logo": True},
    )

    assert response.status_code == 200
    assert response.json()["qr_url"]


def test_generate_qr_custom_colors_and_size(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "foreground_color": "#FF6B35",
            "background_color": "#0F1117",
            "size_px": 512,
        },
    )

    assert response.status_code == 200
    assert response.json()["qr_url"]


def test_generate_qr_invalid_size_rejected(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={"size_px": 50},
    )

    assert response.status_code == 422


def test_regenerate_qr_replaces_previous(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    first = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    second = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={"foreground_color": "#111111"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["qr_url"]


def test_generate_qr_restaurant_not_found(client, db):
    token = seed_test_user_and_auth(client, db)

    response = client.post(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/qr",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )
    assert response.status_code == 404


def test_generate_qr_requires_auth(client, db):
    response = client.post(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/qr",
        json={},
    )
    assert response.status_code == 401

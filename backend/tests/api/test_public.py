from datetime import datetime, time as dt_time
from types import SimpleNamespace

from app.core.security import get_password_hash
from app.models.user import User
from app.services.public import public_service


def seed_test_user_and_auth(client, db):
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superadmin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpassword"},
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


def publish_restaurant(client, token, restaurant_id, is_published=True, is_active=True):
    client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_published": is_published, "is_active": is_active},
    )


def create_category(client, token, restaurant_id, name="Entradas", is_active=True):
    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "is_active": is_active},
    )
    return response.json()


def create_product(client, token, restaurant_id, category_id, name="Ceviche", price="38.00"):
    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "price": price, "category_id": category_id},
    )
    return response.json()


def set_product_status(client, token, restaurant_id, product_id, status_value):
    client.patch(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": status_value},
    )


def add_social(client, token, restaurant_id, platform="instagram", url="https://instagram.com/test"):
    client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": platform, "url": url},
    )


def set_full_week_hours(client, token, restaurant_id):
    client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/hours",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "hours": [
                {"day_of_week": d, "open_time": "00:00", "close_time": "23:59", "is_closed": False}
                for d in range(7)
            ]
        },
    )


def _setup_published_restaurant_with_menu(client, db, slug="test-restaurant"):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token, slug=slug)
    publish_restaurant(client, token, restaurant_id)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])
    return token, restaurant_id, category, product


def test_get_public_restaurant_success(client, db):
    token, restaurant_id, category, product = _setup_published_restaurant_with_menu(client, db)
    add_social(client, token, restaurant_id)

    response = client.get(f"/api/v1/public/restaurants/test-restaurant")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "test-restaurant"
    assert len(data["categories"]) == 1
    assert data["categories"][0]["id"] == category["id"]
    assert len(data["categories"][0]["products"]) == 1
    assert data["categories"][0]["products"][0]["id"] == product["id"]
    assert len(data["socials"]) == 1
    assert data["socials"][0]["platform"] == "instagram"
    assert isinstance(data["is_open_now"], bool)
    assert "schedules" in data


def test_hidden_product_excluded(client, db):
    token, restaurant_id, category, product = _setup_published_restaurant_with_menu(client, db)
    set_product_status(client, token, restaurant_id, product["id"], "hidden")

    response = client.get("/api/v1/public/restaurants/test-restaurant")
    assert response.status_code == 200
    assert response.json()["categories"][0]["products"] == []


def test_unavailable_product_included_but_marked(client, db):
    token, restaurant_id, category, product = _setup_published_restaurant_with_menu(client, db)
    set_product_status(client, token, restaurant_id, product["id"], "unavailable")

    response = client.get("/api/v1/public/restaurants/test-restaurant")
    assert response.status_code == 200
    products = response.json()["categories"][0]["products"]
    assert len(products) == 1
    assert products[0]["status"] == "unavailable"


def test_inactive_category_excluded(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    publish_restaurant(client, token, restaurant_id)
    category = create_category(client, token, restaurant_id, is_active=False)
    create_product(client, token, restaurant_id, category["id"])

    response = client.get("/api/v1/public/restaurants/test-restaurant")
    assert response.status_code == 200
    assert response.json()["categories"] == []


def test_unpublished_restaurant_returns_404(client, db):
    token = seed_test_user_and_auth(client, db)
    create_restaurant(client, token)  # is_published=False by default

    response = client.get("/api/v1/public/restaurants/test-restaurant")
    assert response.status_code == 404


def test_inactive_restaurant_returns_404(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    publish_restaurant(client, token, restaurant_id, is_published=True, is_active=False)

    response = client.get("/api/v1/public/restaurants/test-restaurant")
    assert response.status_code == 404


def test_nonexistent_slug_returns_404(client, db):
    response = client.get("/api/v1/public/restaurants/does-not-exist")
    assert response.status_code == 404


def test_is_open_now_wired_through_endpoint(client, db):
    token, restaurant_id, _, _ = _setup_published_restaurant_with_menu(client, db)
    set_full_week_hours(client, token, restaurant_id)

    response = client.get("/api/v1/public/restaurants/test-restaurant")
    assert response.status_code == 200
    # Horario 00:00-23:59 los 7 días => siempre abierto, sin importar cuándo corra el test
    assert response.json()["is_open_now"] is True


def test_compute_is_open_now_within_hours():
    hours = [SimpleNamespace(day_of_week=0, open_time=dt_time(9, 0), close_time=dt_time(22, 0), is_closed=False)]
    now = datetime(2026, 8, 3, 12, 0)  # 2026-08-03 is a Monday (day_of_week=0)
    assert public_service.compute_is_open_now(hours, now=now) is True


def test_compute_is_open_now_outside_hours():
    hours = [SimpleNamespace(day_of_week=0, open_time=dt_time(9, 0), close_time=dt_time(22, 0), is_closed=False)]
    now = datetime(2026, 8, 3, 23, 0)
    assert public_service.compute_is_open_now(hours, now=now) is False


def test_compute_is_open_now_closed_flag():
    hours = [SimpleNamespace(day_of_week=0, open_time=dt_time(9, 0), close_time=dt_time(22, 0), is_closed=True)]
    now = datetime(2026, 8, 3, 12, 0)
    assert public_service.compute_is_open_now(hours, now=now) is False


def test_compute_is_open_now_no_hours_for_today():
    hours = [SimpleNamespace(day_of_week=1, open_time=dt_time(9, 0), close_time=dt_time(22, 0), is_closed=False)]
    now = datetime(2026, 8, 3, 12, 0)  # Monday, but only Tuesday (1) hours defined
    assert public_service.compute_is_open_now(hours, now=now) is False


def test_compute_is_open_now_crosses_midnight():
    hours = [SimpleNamespace(day_of_week=0, open_time=dt_time(20, 0), close_time=dt_time(2, 0), is_closed=False)]
    late_night = datetime(2026, 8, 3, 23, 30)
    early_morning = datetime(2026, 8, 3, 1, 30)
    outside = datetime(2026, 8, 3, 10, 0)
    assert public_service.compute_is_open_now(hours, now=late_night) is True
    assert public_service.compute_is_open_now(hours, now=early_morning) is True
    assert public_service.compute_is_open_now(hours, now=outside) is False


def test_rate_limit_exceeded(client, db):
    _setup_published_restaurant_with_menu(client, db)

    last_response = None
    for _ in range(101):
        last_response = client.get("/api/v1/public/restaurants/test-restaurant")

    assert last_response.status_code == 429

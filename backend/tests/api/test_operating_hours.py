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


def test_get_operating_hours_empty(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/hours",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == []


def test_get_operating_hours_restaurant_not_found(client, db):
    token = seed_test_user_and_auth(client, db)

    response = client.get(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/hours",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


def test_update_operating_hours(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    hours = [
        {
            "day_of_week": day,
            "open_time": None if day == 6 else "09:00",
            "close_time": None if day == 6 else "22:00",
            "is_closed": day == 6,
        }
        for day in range(7)
    ]

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/hours",
        headers={"Authorization": f"Bearer {token}"},
        json={"hours": hours},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 7

    sunday = next(h for h in data if h["day_of_week"] == 6)
    assert sunday["is_closed"] is True
    assert sunday["open_time"] is None
    assert sunday["close_time"] is None

    monday = next(h for h in data if h["day_of_week"] == 0)
    assert monday["is_closed"] is False
    assert monday["open_time"] == "09:00"
    assert monday["close_time"] == "22:00"


def test_update_operating_hours_replaces_existing(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    first_hours = [
        {"day_of_week": 0, "open_time": "08:00", "close_time": "18:00", "is_closed": False}
    ]
    client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/hours",
        headers={"Authorization": f"Bearer {token}"},
        json={"hours": first_hours},
    )

    second_hours = [
        {"day_of_week": 0, "open_time": "10:00", "close_time": "20:00", "is_closed": False}
    ]
    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/hours",
        headers={"Authorization": f"Bearer {token}"},
        json={"hours": second_hours},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["open_time"] == "10:00"


def test_update_operating_hours_invalid_day(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/hours",
        headers={"Authorization": f"Bearer {token}"},
        json={"hours": [{"day_of_week": 7, "is_closed": True}]},
    )

    assert response.status_code == 400


def test_operating_hours_requires_auth(client, db):
    response = client.get(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/hours"
    )
    assert response.status_code == 401

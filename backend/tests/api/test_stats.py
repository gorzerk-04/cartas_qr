from app.core.security import get_password_hash
from app.models.user import User


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


def test_stats_empty(client, db):
    token = seed_test_user_and_auth(client, db)

    response = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()
    assert data == {
        "total_restaurants": 0,
        "published_restaurants": 0,
        "qr_generated_count": 0,
    }


def test_stats_counts_restaurants(client, db):
    token = seed_test_user_and_auth(client, db)
    r1 = create_restaurant(client, token, slug="r1")
    create_restaurant(client, token, slug="r2")
    create_restaurant(client, token, slug="r3")

    client.put(
        f"/api/v1/admin/restaurants/{r1}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_published": True},
    )

    response = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()
    assert data["total_restaurants"] == 3
    assert data["published_restaurants"] == 1
    assert data["qr_generated_count"] == 0


def test_stats_counts_qr_generated(client, db):
    import uuid
    from app.models.restaurant import Restaurant

    token = seed_test_user_and_auth(client, db)
    r1 = create_restaurant(client, token, slug="r1")
    create_restaurant(client, token, slug="r2")

    restaurant = db.query(Restaurant).filter(Restaurant.id == uuid.UUID(r1)).first()
    restaurant.qr_url = "http://localhost:8000/static/qrcodes/qr_r1.png"
    db.add(restaurant)
    db.commit()

    response = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["qr_generated_count"] == 1


def test_stats_excludes_deleted_restaurants(client, db):
    token = seed_test_user_and_auth(client, db)
    r1 = create_restaurant(client, token, slug="r1")
    create_restaurant(client, token, slug="r2")

    client.delete(f"/api/v1/admin/restaurants/{r1}", headers={"Authorization": f"Bearer {token}"})

    response = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["total_restaurants"] == 1


def test_stats_requires_auth(client, db):
    response = client.get("/api/v1/admin/stats")
    assert response.status_code == 401

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


def create_social(client, token, restaurant_id, platform="instagram", url="https://instagram.com/test"):
    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": platform, "url": url},
    )
    return response.json()


def test_create_social(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": "instagram", "url": "https://instagram.com/lacasona"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["platform"] == "instagram"
    assert data["url"] == "https://instagram.com/lacasona"
    assert data["display_order"] == 0


def test_create_social_auto_increments_display_order(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    first = create_social(client, token, restaurant_id, "instagram", "https://instagram.com/a")
    second = create_social(client, token, restaurant_id, "facebook", "https://facebook.com/a")

    assert first["display_order"] == 0
    assert second["display_order"] == 1


def test_create_social_duplicate_platform_conflict(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    create_social(client, token, restaurant_id, "instagram", "https://instagram.com/a")

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": "instagram", "url": "https://instagram.com/b"},
    )
    assert response.status_code == 409


def test_create_social_restaurant_not_found(client, db):
    token = seed_test_user_and_auth(client, db)

    response = client.post(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/socials",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": "instagram", "url": "https://instagram.com/a"},
    )
    assert response.status_code == 404


def test_create_social_invalid_platform(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": "myspace", "url": "https://myspace.com/a"},
    )
    assert response.status_code == 422


def test_list_socials_empty(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_socials_isolated_by_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_a = create_restaurant(client, token, slug="restaurant-a")
    restaurant_b = create_restaurant(client, token, slug="restaurant-b")
    create_social(client, token, restaurant_a, "instagram", "https://instagram.com/a")

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_b}/socials",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.json() == []


def test_update_social_url(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    social = create_social(client, token, restaurant_id)

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials/{social['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"url": "https://instagram.com/updated"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["url"] == "https://instagram.com/updated"
    assert data["platform"] == "instagram"


def test_update_social_wrong_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_a = create_restaurant(client, token, slug="restaurant-a")
    restaurant_b = create_restaurant(client, token, slug="restaurant-b")
    social = create_social(client, token, restaurant_a)

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_b}/socials/{social['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"url": "https://instagram.com/hijack"},
    )
    assert response.status_code == 404


def test_delete_social(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    social = create_social(client, token, restaurant_id)

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials/{social['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204

    listed = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    assert listed == []


def test_delete_social_then_recreate_same_platform(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    social = create_social(client, token, restaurant_id, "instagram", "https://instagram.com/a")

    client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials/{social['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/socials",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": "instagram", "url": "https://instagram.com/new"},
    )
    assert response.status_code == 201


def test_socials_require_auth(client, db):
    response = client.get(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/socials"
    )
    assert response.status_code == 401

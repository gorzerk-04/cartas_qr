import io

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


def create_category(client, token, restaurant_id, name="Entradas"):
    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name},
    )
    return response.json()


def create_product(client, token, restaurant_id, category_id, name="Ceviche"):
    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "price": "10.00", "category_id": category_id},
    )
    return response.json()


def fake_image_file():
    return ("logo.png", io.BytesIO(b"\x89PNG" + b"0" * 1024), "image/png")


def test_create_category(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Entradas", "description": "Para picar"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Entradas"
    assert data["display_order"] == 0
    assert data["product_count"] == 0
    assert data["is_active"] is True


def test_create_category_auto_increments_display_order(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    first = create_category(client, token, restaurant_id, "Entradas")
    second = create_category(client, token, restaurant_id, "Fondos")

    assert first["display_order"] == 0
    assert second["display_order"] == 1


def test_list_categories_empty(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_list_categories_includes_product_count(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    create_product(client, token, restaurant_id, category["id"])

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["product_count"] == 1


def test_get_category_not_found(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_update_category(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories/{category['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Entradas Frías", "is_active": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Entradas Frías"
    assert data["is_active"] is False


def test_update_category_wrong_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_a = create_restaurant(client, token, slug="restaurant-a")
    restaurant_b = create_restaurant(client, token, slug="restaurant-b")
    category = create_category(client, token, restaurant_a)

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_b}/categories/{category['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Hijack"},
    )
    assert response.status_code == 404


def test_delete_category_without_products(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories/{category['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204


def test_delete_category_blocked_with_active_products(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    create_product(client, token, restaurant_id, category["id"])

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories/{category['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409


def test_delete_category_allowed_after_product_removed(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])

    client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories/{category['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204


def test_reorder_categories(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    c1 = create_category(client, token, restaurant_id, "Entradas")
    c2 = create_category(client, token, restaurant_id, "Fondos")
    c3 = create_category(client, token, restaurant_id, "Postres")

    response = client.patch(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories/reorder",
        headers={"Authorization": f"Bearer {token}"},
        json={"orders": [
            {"id": c3["id"], "display_order": 0},
            {"id": c1["id"], "display_order": 1},
            {"id": c2["id"], "display_order": 2},
        ]},
    )
    assert response.status_code == 200

    listed = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories",
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    assert [c["id"] for c in listed] == [c3["id"], c1["id"], c2["id"]]


def test_reorder_categories_cross_restaurant_id(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_a = create_restaurant(client, token, slug="restaurant-a")
    restaurant_b = create_restaurant(client, token, slug="restaurant-b")
    category_a = create_category(client, token, restaurant_a)

    response = client.patch(
        f"/api/v1/admin/restaurants/{restaurant_b}/categories/reorder",
        headers={"Authorization": f"Bearer {token}"},
        json={"orders": [{"id": category_a["id"], "display_order": 0}]},
    )
    assert response.status_code == 404


def test_categories_isolated_by_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_a = create_restaurant(client, token, slug="restaurant-a")
    restaurant_b = create_restaurant(client, token, slug="restaurant-b")
    create_category(client, token, restaurant_a, "Solo A")

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_b}/categories",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.json() == []


def test_categories_require_auth(client, db):
    response = client.get(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/categories"
    )
    assert response.status_code == 401


def test_upload_category_image(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/categories/{category['id']}/image",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file()},
    )
    assert response.status_code == 200
    assert response.json()["image_url"]

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


def create_product(client, token, restaurant_id, category_id, name="Ceviche", price="38.00"):
    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "price": price, "category_id": category_id},
    )
    return response.json()


def fake_image_file():
    return ("plate.png", io.BytesIO(b"\x89PNG" + b"0" * 1024), "image/png")


def test_create_product(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Ceviche Clásico",
            "price": "38.00",
            "category_id": category["id"],
            "tags": ["mariscos", "clásico"],
            "allergens": ["mariscos"],
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Ceviche Clásico"
    assert data["status"] == "available"
    assert data["display_order"] == 0
    assert data["tags"] == ["mariscos", "clásico"]
    assert data["allergens"] == ["mariscos"]


def test_create_product_invalid_category_cross_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_a = create_restaurant(client, token, slug="restaurant-a")
    restaurant_b = create_restaurant(client, token, slug="restaurant-b")
    category_a = create_category(client, token, restaurant_a)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_b}/products",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Hijack Product", "price": "10.00", "category_id": category_a["id"]},
    )
    assert response.status_code == 404


def test_create_product_category_not_found(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/products",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Sin categoría",
            "price": "10.00",
            "category_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert response.status_code == 404


def test_list_products_pagination(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    for i in range(25):
        create_product(client, token, restaurant_id, category["id"], name=f"Producto {i}")

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/products?page=1&limit=20",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 20
    assert data["meta"]["total"] == 25
    assert data["meta"]["total_pages"] == 2
    assert data["meta"]["has_next"] is True
    assert data["meta"]["has_prev"] is False


def test_list_products_search(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    create_product(client, token, restaurant_id, category["id"], name="Ceviche Clásico")
    create_product(client, token, restaurant_id, category["id"], name="Lomo Saltado")

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/products?search=ceviche",
        headers={"Authorization": f"Bearer {token}"},
    )
    data = response.json()
    assert data["meta"]["total"] == 1
    assert data["data"][0]["name"] == "Ceviche Clásico"


def test_list_products_filter_category_id(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    cat_a = create_category(client, token, restaurant_id, "Entradas")
    cat_b = create_category(client, token, restaurant_id, "Fondos")
    create_product(client, token, restaurant_id, cat_a["id"], name="Ceviche")
    create_product(client, token, restaurant_id, cat_b["id"], name="Lomo Saltado")

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/products?category_id={cat_a['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    data = response.json()
    assert data["meta"]["total"] == 1
    assert data["data"][0]["name"] == "Ceviche"


def test_list_products_filter_status(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])
    client.patch(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "unavailable"},
    )

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/products?status=unavailable",
        headers={"Authorization": f"Bearer {token}"},
    )
    data = response.json()
    assert data["meta"]["total"] == 1


def test_update_product(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Ceviche Mixto", "price": "42.00"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Ceviche Mixto"
    assert data["price"] == "42.00"


def test_update_product_category_id_revalidated(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_a = create_restaurant(client, token, slug="restaurant-a")
    restaurant_b = create_restaurant(client, token, slug="restaurant-b")
    category_a = create_category(client, token, restaurant_a)
    category_b = create_category(client, token, restaurant_b)
    product = create_product(client, token, restaurant_a, category_a["id"])

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_a}/products/{product['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"category_id": category_b["id"]},
    )
    assert response.status_code == 404


def test_delete_product(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])

    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204

    listed = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/products",
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    assert listed["meta"]["total"] == 0


def test_reorder_products(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    p1 = create_product(client, token, restaurant_id, category["id"], name="A")
    p2 = create_product(client, token, restaurant_id, category["id"], name="B")

    response = client.patch(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/reorder",
        headers={"Authorization": f"Bearer {token}"},
        json={"orders": [
            {"id": p2["id"], "display_order": 0},
            {"id": p1["id"], "display_order": 1},
        ]},
    )
    assert response.status_code == 200

    listed = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/products",
        headers={"Authorization": f"Bearer {token}"},
    ).json()
    assert [p["id"] for p in listed["data"]] == [p2["id"], p1["id"]]


def test_patch_product_status(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])

    response = client.patch(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "hidden"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "hidden"


def test_patch_product_status_invalid_value(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])

    response = client.patch(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "nonexistent"},
    )
    assert response.status_code == 422


def test_upload_product_image(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])

    response = client.post(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}/image",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": fake_image_file()},
    )
    assert response.status_code == 200
    assert response.json()["image_url"]


def test_products_require_auth(client, db):
    response = client.get(
        "/api/v1/admin/restaurants/00000000-0000-0000-0000-000000000000/products"
    )
    assert response.status_code == 401


def test_product_tags_and_allergens_roundtrip(client, db):
    token = seed_test_user_and_auth(client, db)
    restaurant_id = create_restaurant(client, token)
    category = create_category(client, token, restaurant_id)
    product = create_product(client, token, restaurant_id, category["id"])
    client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"tags": ["vegano", "picante"], "allergens": ["gluten"]},
    )

    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}/products/{product['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    data = response.json()
    assert data["tags"] == ["vegano", "picante"]
    assert data["allergens"] == ["gluten"]

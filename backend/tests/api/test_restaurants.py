import pytest
from app.core.security import get_password_hash
from app.models.user import User
from app.models.restaurant import Restaurant


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


def test_create_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    
    response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Restaurante de Prueba",
            "slug": "test-restaurant",
            "description": "Una descripción de prueba",
            "primary_color": "#123456",
            "secondary_color": "#654321",
            "accent_color": "#abcdef"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Restaurante de Prueba"
    assert data["slug"] == "test-restaurant"
    assert "id" in data


def test_create_restaurant_duplicate_slug(client, db):
    token = seed_test_user_and_auth(client, db)
    
    # Create first restaurant
    client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Restaurante Uno",
            "slug": "duplicate-slug",
        }
    )
    
    # Create second with same slug
    response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Restaurante Dos",
            "slug": "duplicate-slug",
        }
    )
    
    assert response.status_code == 409
    assert "ya se encuentra registrado" in response.json()["detail"]


def test_get_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    
    # Create
    create_response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "La Casa del Sabor",
            "slug": "sabor-casa",
        }
    )
    restaurant_id = create_response.json()["id"]
    
    # Get by id
    response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["name"] == "La Casa del Sabor"


def test_update_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    
    # Create
    create_response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "La Casa Antigua",
            "slug": "casa-antigua",
        }
    )
    restaurant_id = create_response.json()["id"]
    
    # Update name and description
    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "La Casa Moderna",
            "description": "Nueva descripción",
            "slug": "casa-moderna"  # Slug should be ignored (immutable)
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "La Casa Moderna"
    assert data["description"] == "Nueva descripción"
    assert data["slug"] == "casa-antigua"  # Still the old slug


def test_delete_restaurant(client, db):
    token = seed_test_user_and_auth(client, db)
    
    # Create
    create_response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Para Borrar",
            "slug": "para-borrar",
        }
    )
    restaurant_id = create_response.json()["id"]
    
    # Delete
    response = client.delete(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 204
    
    # Verify it is soft-deleted (get returns 404)
    get_response = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_response.status_code == 404


def test_create_restaurant_rejects_invalid_hex_color(client, db):
    token = seed_test_user_and_auth(client, db)

    response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Color Invalido",
            "slug": "color-invalido",
            "primary_color": "rojo",
        }
    )

    assert response.status_code == 422


def test_update_restaurant_rejects_invalid_hex_color(client, db):
    token = seed_test_user_and_auth(client, db)
    create_response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Con Colores", "slug": "con-colores"}
    )
    restaurant_id = create_response.json()["id"]

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"primary_color": "#12345"}
    )

    assert response.status_code == 422

    # El color anterior sigue intacto: un valor inválido no debe dejar la marca a medias.
    detail = client.get(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert detail.json()["primary_color"] == "#FF6B35"


def test_update_restaurant_accepts_shorthand_hex(client, db):
    token = seed_test_user_and_auth(client, db)
    create_response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Hex Corto", "slug": "hex-corto"}
    )
    restaurant_id = create_response.json()["id"]

    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"primary_color": "#fff"}
    )

    assert response.status_code == 200
    assert response.json()["primary_color"] == "#fff"


def test_update_restaurant_can_clear_nullable_field(client, db):
    token = seed_test_user_and_auth(client, db)
    create_response = client.post(
        "/api/v1/admin/restaurants",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Con Descripcion",
            "slug": "con-descripcion",
            "description": "algo que luego se borra",
            "phone": "+51999999999",
        }
    )
    restaurant_id = create_response.json()["id"]

    # El panel manda null explícito para vaciar un campo (ver blankToNull en el frontend).
    response = client.put(
        f"/api/v1/admin/restaurants/{restaurant_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"description": None, "phone": None}
    )

    assert response.status_code == 200
    assert response.json()["description"] is None
    assert response.json()["phone"] is None

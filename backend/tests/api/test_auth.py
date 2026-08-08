import pytest
from app.core.security import get_password_hash
from app.models.user import User


def seed_test_user(db):
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
    return user


def test_login_success(client, db):
    seed_test_user(db)
    
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data["data"]
    assert data["data"]["user"]["username"] == "testuser"
    assert "refresh_token" in response.cookies


def test_login_incorrect_password(client, db):
    seed_test_user(db)

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "wrongpassword"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Usuario o contraseña incorrectos"


def test_login_rate_limited_after_repeated_attempts(client, db):
    # Sin límite, /auth/login era el único endpoint de auth sin protección contra
    # fuerza bruta (el público de la carta sí lo tenía desde antes) — se puede
    # probar la contraseña del admin sin límite de intentos.
    seed_test_user(db)

    for _ in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "testuser", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    limited_response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "wrongpassword"}
    )
    assert limited_response.status_code == 429


def test_get_me(client, db):
    user = seed_test_user(db)
    
    # login to get token
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    token = login_response.json()["data"]["access_token"]
    
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["data"]["username"] == "testuser"
    assert response.json()["data"]["email"] == "test@example.com"


def test_refresh_token(client, db):
    seed_test_user(db)
    
    # login to get cookie
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    
    response = client.post("/api/v1/auth/refresh")
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data["data"]
    assert "refresh_token" in response.cookies


def test_logout(client, db):
    seed_test_user(db)
    
    # login to get cookie
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpassword"}
    )
    assert "refresh_token" in login_response.cookies
    
    # logout
    logout_response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {login_response.json()['data']['access_token']}"}
    )
    assert logout_response.status_code == 204

    # El Set-Cookie de borrado debe llegar realmente en la respuesta de /logout
    # (regresión: un endpoint que hace response.delete_cookie(...) pero luego
    # retorna un Response nuevo descarta ese header silenciosamente)
    set_cookie_header = logout_response.headers.get("set-cookie", "")
    assert "refresh_token=" in set_cookie_header
    assert "Max-Age=0" in set_cookie_header

    # La cookie vieja ya no debe servir para renovar la sesión
    refresh_response = client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 401

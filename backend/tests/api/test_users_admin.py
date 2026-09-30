"""Gestión de usuarios, contraseña temporal y protecciones (Fase 1)."""
from app.models.user import User, UserRole
from tests.conftest import TEST_PASSWORD, login_headers

USERS = "/api/v1/admin/users"
BASE = "/api/v1/admin/restaurants"


def _create_owner(client, headers, username="nuevodueno", restaurant_ids=None):
    r = client.post(
        USERS,
        headers=headers,
        json={
            "email": f"{username}@example.com",
            "username": username,
            "role": "restaurant_owner",
            "restaurant_ids": restaurant_ids or [],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


# ---------- alta y contraseña temporal ----------

def test_admin_crea_dueno_recibe_temp_password_y_puede_iniciar_sesion(client, admin_headers, make_restaurant):
    resto = make_restaurant("uno")
    body = _create_owner(client, admin_headers, restaurant_ids=[str(resto.id)])
    assert body["temp_password"] and len(body["temp_password"]) >= 12
    assert body["must_change_password"] is True
    assert body["role"] == "restaurant_owner"
    assert [r["slug"] for r in body["restaurants"]] == ["uno"]
    assert "hashed_password" not in body

    login = client.post("/api/v1/auth/login", json={"username": "nuevodueno", "password": body["temp_password"]})
    assert login.status_code == 200
    assert login.json()["data"]["user"]["must_change_password"] is True


def test_temp_password_no_se_vuelve_a_mostrar(client, admin_headers):
    body = _create_owner(client, admin_headers)
    detail = client.get(f"{USERS}/{body['id']}", headers=admin_headers).json()
    assert "temp_password" not in detail
    listing = client.get(USERS, headers=admin_headers).json()["data"]
    assert all("temp_password" not in u for u in listing)


def test_alta_rechaza_email_o_username_duplicado_y_restaurante_inexistente(client, admin_headers, admin_user):
    dup = client.post(USERS, headers=admin_headers, json={"email": admin_user.email, "username": "otro"})
    assert dup.status_code == 409
    dup = client.post(USERS, headers=admin_headers, json={"email": "z@example.com", "username": admin_user.username})
    assert dup.status_code == 409
    bad = client.post(
        USERS,
        headers=admin_headers,
        json={"email": "y@example.com", "username": "yyy", "restaurant_ids": ["00000000-0000-0000-0000-000000000000"]},
    )
    assert bad.status_code == 422


def test_con_must_change_password_todo_da_403_salvo_me_y_logout(client, admin_headers, make_restaurant):
    resto = make_restaurant("uno")
    body = _create_owner(client, admin_headers, restaurant_ids=[str(resto.id)])
    h = login_headers(client, "nuevodueno", body["temp_password"])

    for call in (
        client.get(BASE, headers=h),
        client.get(f"{BASE}/{resto.id}", headers=h),
        client.get("/api/v1/admin/stats", headers=h),
    ):
        assert call.status_code == 403
        assert call.json()["detail"]["code"] == "PASSWORD_CHANGE_REQUIRED"

    me = client.get("/api/v1/auth/me", headers=h)
    assert me.status_code == 200
    assert me.json()["data"]["must_change_password"] is True
    assert client.post("/api/v1/auth/logout").status_code == 204


def test_change_password_desbloquea_el_acceso(client, admin_headers, make_restaurant):
    resto = make_restaurant("uno")
    body = _create_owner(client, admin_headers, restaurant_ids=[str(resto.id)])
    h = login_headers(client, "nuevodueno", body["temp_password"])

    r = client.post(
        "/api/v1/auth/change-password",
        headers=h,
        json={"current_password": body["temp_password"], "new_password": "una-clave-nueva-larga"},
    )
    assert r.status_code == 204
    assert client.get(BASE, headers=h).status_code == 200
    assert client.get("/api/v1/auth/me", headers=h).json()["data"]["must_change_password"] is False
    # la clave temporal ya no sirve; la nueva sí
    bad = client.post("/api/v1/auth/login", json={"username": "nuevodueno", "password": body["temp_password"]})
    assert bad.status_code == 401
    assert client.post(
        "/api/v1/auth/login", json={"username": "nuevodueno", "password": "una-clave-nueva-larga"}
    ).status_code == 200


def test_change_password_rechaza_actual_incorrecta_corta_o_igual(client, admin_user, admin_headers):
    url = "/api/v1/auth/change-password"
    wrong = client.post(url, headers=admin_headers, json={"current_password": "incorrecta", "new_password": "otra-clave-larga-1"})
    assert wrong.status_code == 400
    short = client.post(url, headers=admin_headers, json={"current_password": TEST_PASSWORD, "new_password": "corta"})
    assert short.status_code == 422
    same = client.post(url, headers=admin_headers, json={"current_password": TEST_PASSWORD, "new_password": TEST_PASSWORD})
    assert same.status_code == 422


def test_me_incluye_rol_y_restaurantes(client, admin_headers, owner_user, owner_headers, make_restaurant, make_membership):
    resto = make_restaurant("uno")
    make_membership(owner_user, resto.id)
    admin_me = client.get("/api/v1/auth/me", headers=admin_headers).json()["data"]
    assert admin_me["role"] == "platform_admin" and admin_me["restaurants"] == []
    owner_me = client.get("/api/v1/auth/me", headers=owner_headers).json()["data"]
    assert owner_me["role"] == "restaurant_owner"
    assert owner_me["restaurants"] == [{"id": str(resto.id), "name": "Resto uno", "slug": "uno"}]


# ---------- el dueño no gestiona usuarios ----------

def test_dueno_recibe_403_en_todos_los_endpoints_de_usuarios(client, owner_user, owner_headers):
    uid = str(owner_user.id)
    calls = [
        client.get(USERS, headers=owner_headers),
        client.post(USERS, headers=owner_headers, json={"email": "a@example.com", "username": "aaa"}),
        client.get(f"{USERS}/{uid}", headers=owner_headers),
        client.patch(f"{USERS}/{uid}", headers=owner_headers, json={"role": "platform_admin"}),
        client.put(f"{USERS}/{uid}/restaurants", headers=owner_headers, json={"restaurant_ids": []}),
        client.post(f"{USERS}/{uid}/reset-password", headers=owner_headers),
    ]
    assert [c.status_code for c in calls] == [403] * len(calls)
    assert client.get("/api/v1/auth/me", headers=owner_headers).json()["data"]["role"] == "restaurant_owner"


# ---------- protecciones contra bloqueo ----------

def test_admin_no_puede_desactivarse_ni_quitarse_el_rol(client, admin_user, admin_headers, make_user):
    make_user("otroadmin", UserRole.PLATFORM_ADMIN)  # hay otro admin: la protección es por ser uno mismo
    uid = str(admin_user.id)
    assert client.patch(f"{USERS}/{uid}", headers=admin_headers, json={"is_active": False}).status_code == 409
    assert client.patch(f"{USERS}/{uid}", headers=admin_headers, json={"role": "restaurant_owner"}).status_code == 409
    assert client.get(BASE, headers=admin_headers).status_code == 200


def test_no_se_puede_dejar_el_sistema_sin_admins_activos(client, db, admin_user, admin_headers, make_user):
    other = make_user("otroadmin", UserRole.PLATFORM_ADMIN)
    # Con dos admins, uno puede desactivar al otro...
    assert client.patch(f"{USERS}/{other.id}", headers=admin_headers, json={"is_active": False}).status_code == 200
    # ...y ahora que el único admin activo es el actor, tampoco puede tocarse
    assert client.patch(f"{USERS}/{admin_user.id}", headers=admin_headers, json={"is_active": False}).status_code == 409
    db.expire_all()
    assert db.query(User).filter(User.role == UserRole.PLATFORM_ADMIN, User.is_active == True).count() == 1


def test_desactivar_al_ultimo_admin_desde_otro_admin_inactivo_no_es_posible(client, db, admin_user, admin_headers, make_user):
    """El último admin activo no puede degradarse aunque los demás admins estén inactivos."""
    make_user("adminviejo", UserRole.PLATFORM_ADMIN, is_active=False)
    r = client.patch(f"{USERS}/{admin_user.id}", headers=admin_headers, json={"role": "restaurant_owner"})
    assert r.status_code == 409


# ---------- usuario desactivado ----------

def test_usuario_desactivado_no_puede_iniciar_sesion_ni_refrescar(client, admin_headers, make_restaurant):
    body = _create_owner(client, admin_headers)
    client.post("/api/v1/auth/change-password", headers=login_headers(client, "nuevodueno", body["temp_password"]),
                json={"current_password": body["temp_password"], "new_password": "una-clave-nueva-larga"})
    login = client.post("/api/v1/auth/login", json={"username": "nuevodueno", "password": "una-clave-nueva-larga"})
    assert login.status_code == 200  # cookie de refresh queda en el cliente

    assert client.patch(f"{USERS}/{body['id']}", headers=admin_headers, json={"is_active": False}).status_code == 200

    assert client.post("/api/v1/auth/refresh").status_code == 401
    again = client.post("/api/v1/auth/login", json={"username": "nuevodueno", "password": "una-clave-nueva-larga"})
    assert again.status_code == 401
    # y su access token vigente deja de servir
    old = {"Authorization": f"Bearer {login.json()['data']['access_token']}"}
    assert client.get(BASE, headers=old).status_code == 400


# ---------- asignaciones y reset ----------

def test_reemplazar_restaurantes_asignados(client, admin_headers, make_restaurant):
    a, b = make_restaurant("a"), make_restaurant("b")
    body = _create_owner(client, admin_headers, restaurant_ids=[str(a.id)])
    uid = body["id"]
    r = client.put(f"{USERS}/{uid}/restaurants", headers=admin_headers, json={"restaurant_ids": [str(b.id)]})
    assert r.status_code == 200
    assert [x["slug"] for x in r.json()["restaurants"]] == ["b"]
    r = client.put(f"{USERS}/{uid}/restaurants", headers=admin_headers, json={"restaurant_ids": []})
    assert r.json()["restaurants"] == []
    bad = client.put(f"{USERS}/{uid}/restaurants", headers=admin_headers,
                     json={"restaurant_ids": ["00000000-0000-0000-0000-000000000000"]})
    assert bad.status_code == 422


def test_reset_password_devuelve_nueva_temporal_y_reactiva_el_cambio_obligatorio(client, admin_headers):
    body = _create_owner(client, admin_headers)
    h = login_headers(client, "nuevodueno", body["temp_password"])
    client.post("/api/v1/auth/change-password", headers=h,
                json={"current_password": body["temp_password"], "new_password": "una-clave-nueva-larga"})

    reset = client.post(f"{USERS}/{body['id']}/reset-password", headers=admin_headers)
    assert reset.status_code == 200
    new_temp = reset.json()["temp_password"]
    assert new_temp and new_temp != body["temp_password"]
    assert reset.json()["must_change_password"] is True

    assert client.post("/api/v1/auth/login", json={"username": "nuevodueno", "password": "una-clave-nueva-larga"}).status_code == 401
    h2 = login_headers(client, "nuevodueno", new_temp)
    assert client.get(BASE, headers=h2).status_code == 403


def test_listado_con_busqueda_filtro_por_rol_y_paginacion(client, admin_headers, admin_user, make_user):
    for i in range(3):
        make_user(f"dueno{i}")
    r = client.get(USERS, headers=admin_headers, params={"role": "restaurant_owner", "limit": 2})
    assert r.status_code == 200
    body = r.json()
    assert len(body["data"]) == 2 and body["meta"]["total"] == 3 and body["meta"]["has_next"] is True
    assert client.get(USERS, headers=admin_headers, params={"search": "dueno1"}).json()["meta"]["total"] == 1
    assert client.get(USERS, headers=admin_headers, params={"role": "platform_admin"}).json()["meta"]["total"] == 1


def test_usuario_inexistente_da_404(client, admin_headers):
    zero = "00000000-0000-0000-0000-000000000000"
    assert client.get(f"{USERS}/{zero}", headers=admin_headers).status_code == 404
    assert client.patch(f"{USERS}/{zero}", headers=admin_headers, json={"is_active": False}).status_code == 404
    assert client.post(f"{USERS}/{zero}/reset-password", headers=admin_headers).status_code == 404

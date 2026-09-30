"""Roles y autorización por restaurante (Fase 1)."""
import io
import pytest

from app.models.user import UserRole
from tests.conftest import login_headers

BASE = "/api/v1/admin/restaurants"


def _png():
    return ("plate.png", io.BytesIO(b"\x89PNG" + b"0" * 1024), "image/png")


@pytest.fixture
def setup(client, db, admin_headers, owner_user, owner_headers, make_restaurant, make_membership):
    """Restaurante propio (con datos) y ajeno (con datos), el dueño solo es miembro del propio."""
    own = make_restaurant("propio")
    other = make_restaurant("ajeno")
    make_membership(owner_user, own.id)

    def fill(rid):
        cat = client.post(f"{BASE}/{rid}/categories", headers=admin_headers, json={"name": "Entradas"}).json()
        prod = client.post(
            f"{BASE}/{rid}/products",
            headers=admin_headers,
            json={"name": "Ceviche", "price": "30.00", "category_id": cat["id"]},
        ).json()
        social = client.post(
            f"{BASE}/{rid}/socials",
            headers=admin_headers,
            json={"platform": "instagram", "url": "https://instagram.com/x"},
        ).json()
        return {"id": str(rid), "cat": cat, "prod": prod, "social": social}

    return {"own": fill(own.id), "other": fill(other.id), "own_obj": own, "other_obj": other}


# ---------- regresión: el admin conserva todo ----------

def test_admin_ve_y_edita_todos_los_restaurantes(client, setup, admin_headers):
    r = client.get(BASE, headers=admin_headers)
    assert r.status_code == 200
    assert {x["slug"] for x in r.json()["data"]} == {"propio", "ajeno"}
    r = client.put(f"{BASE}/{setup['other']['id']}", headers=admin_headers, json={"name": "Nuevo nombre"})
    assert r.status_code == 200 and r.json()["name"] == "Nuevo nombre"


def test_admin_puede_crear_eliminar_y_cambiar_is_active(client, admin_headers):
    r = client.post(BASE, headers=admin_headers, json={"name": "Nuevo", "slug": "nuevo"})
    assert r.status_code == 201
    rid = r.json()["id"]
    assert client.put(f"{BASE}/{rid}", headers=admin_headers, json={"is_active": False}).json()["is_active"] is False
    assert client.delete(f"{BASE}/{rid}", headers=admin_headers).status_code == 204


def test_admin_stats_cuenta_todos(client, setup, admin_headers):
    assert client.get("/api/v1/admin/stats", headers=admin_headers).json()["total_restaurants"] == 2


# ---------- listado y stats del dueño ----------

def test_dueno_lista_solo_sus_restaurantes(client, setup, owner_headers):
    r = client.get(BASE, headers=owner_headers)
    assert r.status_code == 200
    body = r.json()
    assert [x["slug"] for x in body["data"]] == ["propio"]
    assert body["meta"]["total"] == 1


def test_dueno_con_dos_membresias_ve_ambos(client, setup, owner_user, owner_headers, make_membership):
    make_membership(owner_user, setup["other_obj"].id)
    r = client.get(BASE, headers=owner_headers)
    assert {x["slug"] for x in r.json()["data"]} == {"propio", "ajeno"}


def test_dueno_sin_membresias_no_ve_nada(client, make_user, make_restaurant):
    make_restaurant("cualquiera")
    make_user("sinresto")
    headers = login_headers(client, "sinresto")
    assert client.get(BASE, headers=headers).json()["data"] == []
    assert client.get("/api/v1/admin/stats", headers=headers).json()["total_restaurants"] == 0


def test_stats_del_dueno_solo_cuenta_lo_suyo(client, setup, owner_headers):
    assert client.get("/api/v1/admin/stats", headers=owner_headers).json()["total_restaurants"] == 1


# ---------- restaurante ajeno: siempre 404 ----------

def test_dueno_recibe_404_en_todo_lo_de_un_restaurante_ajeno(client, setup, owner_headers):
    o = setup["other"]
    rid = o["id"]
    h = owner_headers
    calls = [
        client.get(f"{BASE}/{rid}", headers=h),
        client.put(f"{BASE}/{rid}", headers=h, json={"name": "hack"}),
        client.delete(f"{BASE}/{rid}", headers=h),
        client.post(f"{BASE}/{rid}/logo", headers=h, files={"file": _png()}),
        client.delete(f"{BASE}/{rid}/logo", headers=h),
        client.post(f"{BASE}/{rid}/cover", headers=h, files={"file": _png()}),
        client.delete(f"{BASE}/{rid}/cover", headers=h),
        client.post(f"{BASE}/{rid}/qr", headers=h, json={}),
        client.get(f"{BASE}/{rid}/categories", headers=h),
        client.post(f"{BASE}/{rid}/categories", headers=h, json={"name": "x"}),
        client.get(f"{BASE}/{rid}/categories/{o['cat']['id']}", headers=h),
        client.put(f"{BASE}/{rid}/categories/{o['cat']['id']}", headers=h, json={"name": "x"}),
        client.delete(f"{BASE}/{rid}/categories/{o['cat']['id']}", headers=h),
        client.patch(f"{BASE}/{rid}/categories/reorder", headers=h, json={"orders": []}),
        client.get(f"{BASE}/{rid}/products", headers=h),
        client.post(f"{BASE}/{rid}/products", headers=h, json={"name": "x", "price": "1", "category_id": o["cat"]["id"]}),
        client.get(f"{BASE}/{rid}/products/{o['prod']['id']}", headers=h),
        client.put(f"{BASE}/{rid}/products/{o['prod']['id']}", headers=h, json={"name": "x"}),
        client.delete(f"{BASE}/{rid}/products/{o['prod']['id']}", headers=h),
        client.patch(f"{BASE}/{rid}/products/{o['prod']['id']}/status", headers=h, json={"status": "hidden"}),
        client.patch(f"{BASE}/{rid}/products/reorder", headers=h, json={"orders": []}),
        client.get(f"{BASE}/{rid}/hours", headers=h),
        client.get(f"{BASE}/{rid}/socials", headers=h),
        client.post(f"{BASE}/{rid}/socials", headers=h, json={"platform": "tiktok", "url": "https://tiktok.com/x"}),
        client.put(f"{BASE}/{rid}/socials/{o['social']['id']}", headers=h, json={"url": "https://x.com/y"}),
        client.delete(f"{BASE}/{rid}/socials/{o['social']['id']}", headers=h),
    ]
    assert [c.status_code for c in calls] == [404] * len(calls)


def test_dueno_recibe_404_con_producto_ajeno_usando_su_propio_restaurant_id(client, setup, owner_headers):
    own, other = setup["own"], setup["other"]
    url = f"{BASE}/{own['id']}/products/{other['prod']['id']}"
    assert client.get(url, headers=owner_headers).status_code == 404
    assert client.put(url, headers=owner_headers, json={"name": "hack"}).status_code == 404
    assert client.delete(url, headers=owner_headers).status_code == 404


# ---------- restaurante propio: CRUD permitido ----------

def test_dueno_hace_crud_en_su_restaurante(client, setup, owner_headers):
    rid = setup["own"]["id"]
    h = owner_headers
    assert client.get(f"{BASE}/{rid}", headers=h).status_code == 200
    r = client.put(f"{BASE}/{rid}", headers=h, json={"name": "Renombrado", "is_published": True, "primary_color": "#112233"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renombrado" and r.json()["is_published"] is True

    cat = client.post(f"{BASE}/{rid}/categories", headers=h, json={"name": "Postres"})
    assert cat.status_code == 201
    cid = cat.json()["id"]
    assert client.put(f"{BASE}/{rid}/categories/{cid}", headers=h, json={"name": "Dulces"}).status_code == 200
    prod = client.post(f"{BASE}/{rid}/products", headers=h, json={"name": "Flan", "price": "9.50", "category_id": cid})
    assert prod.status_code == 201
    pid = prod.json()["id"]
    assert client.patch(f"{BASE}/{rid}/products/{pid}/status", headers=h, json={"status": "hidden"}).status_code == 200
    assert client.delete(f"{BASE}/{rid}/products/{pid}", headers=h).status_code == 204
    assert client.delete(f"{BASE}/{rid}/categories/{cid}", headers=h).status_code == 204

    hours = [{"day_of_week": d, "open_time": "09:00", "close_time": "22:00", "is_closed": False} for d in range(7)]
    assert client.put(f"{BASE}/{rid}/hours", headers=h, json={"hours": hours}).status_code == 200
    assert client.get(f"{BASE}/{rid}/hours", headers=h).status_code == 200

    soc = client.post(f"{BASE}/{rid}/socials", headers=h, json={"platform": "facebook", "url": "https://facebook.com/x"})
    assert soc.status_code == 201
    sid = soc.json()["id"]
    assert client.put(f"{BASE}/{rid}/socials/{sid}", headers=h, json={"url": "https://facebook.com/y"}).status_code == 200
    assert client.delete(f"{BASE}/{rid}/socials/{sid}", headers=h).status_code == 204

    assert client.post(f"{BASE}/{rid}/qr", headers=h, json={}).status_code == 200
    assert client.post(f"{BASE}/{rid}/logo", headers=h, files={"file": _png()}).status_code == 200


# ---------- restricciones del dueño (403) ----------

def test_dueno_no_puede_crear_restaurantes(client, owner_headers):
    r = client.post(BASE, headers=owner_headers, json={"name": "Nuevo", "slug": "nuevo"})
    assert r.status_code == 403


def test_dueno_no_puede_eliminar_su_restaurante(client, setup, owner_headers):
    assert client.delete(f"{BASE}/{setup['own']['id']}", headers=owner_headers).status_code == 403
    assert client.get(f"{BASE}/{setup['own']['id']}", headers=owner_headers).status_code == 200


def test_dueno_no_puede_cambiar_slug_ni_is_active(client, setup, owner_headers):
    rid = setup["own"]["id"]
    # El slug es inmutable para todos los roles: el campo se ignora y el valor no cambia
    client.put(f"{BASE}/{rid}", headers=owner_headers, json={"slug": "otro-slug"})
    assert client.put(f"{BASE}/{rid}", headers=owner_headers, json={"is_active": False}).status_code == 403
    current = client.get(f"{BASE}/{rid}", headers=owner_headers).json()
    assert current["slug"] == "propio" and current["is_active"] is True


def test_dueno_puede_reenviar_slug_e_is_active_sin_cambios(client, setup, owner_headers):
    # El formulario del panel envía todos los campos en cada guardado
    rid = setup["own"]["id"]
    r = client.put(f"{BASE}/{rid}", headers=owner_headers, json={"slug": "propio", "is_active": True, "name": "Igual"})
    assert r.status_code == 200


# ---------- revocación ----------

def test_al_quitar_la_membresia_el_siguiente_request_da_404(client, db, setup, owner_user, owner_headers):
    from app.models.restaurant_member import RestaurantMember

    rid = setup["own"]["id"]
    assert client.get(f"{BASE}/{rid}", headers=owner_headers).status_code == 200
    db.query(RestaurantMember).filter(RestaurantMember.user_id == owner_user.id).delete()
    db.commit()
    assert client.get(f"{BASE}/{rid}", headers=owner_headers).status_code == 404
    assert client.get(f"{BASE}/{rid}/categories", headers=owner_headers).status_code == 404


def test_usuario_nuevo_sin_rol_explicito_es_dueno(db):
    from app.models.user import User

    u = User(email="n@example.com", username="nuevo", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    assert u.role == UserRole.RESTAURANT_OWNER


def test_endpoints_requieren_autenticacion(client, setup):
    assert client.get(BASE).status_code == 401
    assert client.get("/api/v1/admin/users").status_code == 401

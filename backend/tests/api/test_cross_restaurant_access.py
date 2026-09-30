"""Acceso cruzado entre restaurantes (IDOR).

Toda ruta anidada bajo /admin/restaurants/{restaurant_id}/... debe validar que la
entidad hija pertenece a ese restaurante. Aquí se usa la URL del restaurante A con
entidades del restaurante B: debe responder 404 y no modificar nada.
"""
import io
from uuid import UUID

import pytest

from app.core.security import get_password_hash
from app.models.category import Category
from app.models.product import Product
from app.models.restaurant_social import RestaurantSocial
from app.models.user import User

BASE = "/api/v1/admin/restaurants"


def _png():
    return ("plate.png", io.BytesIO(b"\x89PNG" + b"0" * 1024), "image/png")


@pytest.fixture
def world(client, db):
    user = User(
        email="cross@example.com",
        username="crossuser",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superadmin=True,
    )
    db.add(user)
    db.commit()
    token = client.post(
        "/api/v1/auth/login", json={"username": "crossuser", "password": "testpassword"}
    ).json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    def make(slug):
        rid = client.post(BASE, headers=headers, json={"name": slug, "slug": slug}).json()["id"]
        cat = client.post(f"{BASE}/{rid}/categories", headers=headers, json={"name": f"cat-{slug}"}).json()
        cat2 = client.post(f"{BASE}/{rid}/categories", headers=headers, json={"name": f"cat2-{slug}"}).json()
        prod = client.post(
            f"{BASE}/{rid}/products",
            headers=headers,
            json={"name": f"prod-{slug}", "price": "10.00", "category_id": cat["id"]},
        ).json()
        prod2 = client.post(
            f"{BASE}/{rid}/products",
            headers=headers,
            json={"name": f"prod2-{slug}", "price": "12.00", "category_id": cat["id"]},
        ).json()
        social = client.post(
            f"{BASE}/{rid}/socials",
            headers=headers,
            json={"platform": "instagram", "url": f"https://instagram.com/{slug}"},
        ).json()
        return {"id": rid, "cat": cat, "cat2": cat2, "prod": prod, "prod2": prod2, "social": social}

    a, b = make("resto-a"), make("resto-b")
    return {"h": headers, "a": a, "b": b, "client": client, "db": db}


def _state_b(db, b):
    db.expire_all()
    cat = db.query(Category).filter(Category.id == UUID(b["cat"]["id"])).one()
    prod = db.query(Product).filter(Product.id == UUID(b["prod"]["id"])).one()
    social = db.query(RestaurantSocial).filter(RestaurantSocial.id == UUID(b["social"]["id"])).one()
    return (
        cat.name, cat.deleted_at, cat.display_order, cat.image_url,
        prod.name, prod.deleted_at, prod.display_order, prod.status, prod.category_id, prod.image_url,
        social.url,
    )


def test_categoria_ajena_get_put_delete_dan_404(world):
    c, h, a, b = world["client"], world["h"], world["a"], world["b"]
    before = _state_b(world["db"], b)
    url = f"{BASE}/{a['id']}/categories/{b['cat']['id']}"
    assert c.get(url, headers=h).status_code == 404
    assert c.put(url, headers=h, json={"name": "hackeada"}).status_code == 404
    assert c.delete(url, headers=h).status_code == 404
    assert _state_b(world["db"], b) == before


def test_producto_ajeno_get_put_delete_status_dan_404(world):
    c, h, a, b = world["client"], world["h"], world["a"], world["b"]
    before = _state_b(world["db"], b)
    url = f"{BASE}/{a['id']}/products/{b['prod']['id']}"
    assert c.get(url, headers=h).status_code == 404
    assert c.put(url, headers=h, json={"name": "hackeado"}).status_code == 404
    assert c.patch(f"{url}/status", headers=h, json={"status": "hidden"}).status_code == 404
    assert c.delete(url, headers=h).status_code == 404
    assert _state_b(world["db"], b) == before


def test_red_social_ajena_put_delete_dan_404(world):
    c, h, a, b = world["client"], world["h"], world["a"], world["b"]
    before = _state_b(world["db"], b)
    url = f"{BASE}/{a['id']}/socials/{b['social']['id']}"
    assert c.put(url, headers=h, json={"url": "https://instagram.com/hackeada"}).status_code == 404
    assert c.delete(url, headers=h).status_code == 404
    assert _state_b(world["db"], b) == before


def test_imagen_ajena_dan_404(world):
    c, h, a, b = world["client"], world["h"], world["a"], world["b"]
    before = _state_b(world["db"], b)
    r1 = c.post(f"{BASE}/{a['id']}/products/{b['prod']['id']}/image", headers=h, files={"file": _png()})
    r2 = c.post(f"{BASE}/{a['id']}/categories/{b['cat']['id']}/image", headers=h, files={"file": _png()})
    assert r1.status_code == 404
    assert r2.status_code == 404
    assert _state_b(world["db"], b) == before


def test_reordenar_categorias_con_id_ajeno_se_rechaza(world):
    c, h, a, b = world["client"], world["h"], world["a"], world["b"]
    before = _state_b(world["db"], b)
    orders = [
        {"id": a["cat"]["id"], "display_order": 5},
        {"id": b["cat"]["id"], "display_order": 9},
    ]
    r = c.patch(f"{BASE}/{a['id']}/categories/reorder", headers=h, json={"orders": orders})
    assert r.status_code in (404, 422)
    assert _state_b(world["db"], b) == before
    # y no debe quedar aplicado parcialmente el reorden de A
    cats = {x["id"]: x for x in c.get(f"{BASE}/{a['id']}/categories", headers=h).json()}
    assert cats[a["cat"]["id"]]["display_order"] == a["cat"]["display_order"]


def test_reordenar_productos_con_id_ajeno_se_rechaza(world):
    c, h, a, b = world["client"], world["h"], world["a"], world["b"]
    before = _state_b(world["db"], b)
    orders = [
        {"id": a["prod"]["id"], "display_order": 5},
        {"id": b["prod"]["id"], "display_order": 9},
    ]
    r = c.patch(f"{BASE}/{a['id']}/products/reorder", headers=h, json={"orders": orders})
    assert r.status_code in (404, 422)
    assert _state_b(world["db"], b) == before
    prods = c.get(f"{BASE}/{a['id']}/products", headers=h).json()["data"]
    by_id = {p["id"]: p for p in prods}
    assert by_id[a["prod"]["id"]]["display_order"] == a["prod"]["display_order"]


def test_producto_con_category_id_ajeno_se_rechaza_al_crear_y_editar(world):
    c, h, a, b = world["client"], world["h"], world["a"], world["b"]
    r = c.post(
        f"{BASE}/{a['id']}/products",
        headers=h,
        json={"name": "intruso", "price": "1.00", "category_id": b["cat"]["id"]},
    )
    assert r.status_code in (404, 422)
    r = c.put(
        f"{BASE}/{a['id']}/products/{a['prod']['id']}",
        headers=h,
        json={"category_id": b["cat"]["id"]},
    )
    assert r.status_code in (404, 422)
    world["db"].expire_all()
    prod = world["db"].query(Product).filter(Product.id == UUID(a["prod"]["id"])).one()
    assert str(prod.category_id) == a["cat"]["id"]

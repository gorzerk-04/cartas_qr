"""Comensales (Fase 3)."""
from uuid import UUID

import pytest

from app.models.loyalty import LoyaltyVisit
from app.models.restaurant_customer import RestaurantCustomer

BASE = "/api/v1/admin/restaurants"


def code_of(response):
    return response.json()["detail"]["code"]


@pytest.fixture
def resto(make_restaurant):
    return make_restaurant("uno")


def _create(client, headers, rid, phone="987654321", name="Ana Pérez", **extra):
    body = {"full_name": name, "phone": phone, "consent": True, **extra}
    return client.post(f"{BASE}/{rid}/customers", headers=headers, json=body)


def test_crear_comensal_sin_consentimiento_da_422(client, admin_headers, resto):
    r = client.post(f"{BASE}/{resto.id}/customers", headers=admin_headers,
                    json={"full_name": "Ana", "phone": "987654321", "consent": False})
    assert r.status_code == 422
    r = client.post(f"{BASE}/{resto.id}/customers", headers=admin_headers,
                    json={"full_name": "Ana", "phone": "987654321"})
    assert r.status_code == 422
    assert client.get(f"{BASE}/{resto.id}/customers", headers=admin_headers).json()["meta"]["total"] == 0


def test_crear_comensal_normaliza_el_celular_y_guarda_el_consentimiento(client, admin_headers, resto):
    r = _create(client, admin_headers, resto.id, phone="987 654 321", email="ana@example.com", notes="Alérgica al maní")
    assert r.status_code == 201
    body = r.json()
    assert body["phone"] == "+51987654321"
    assert body["consent_version"] == 1 and body["consent_given_at"]
    assert body["visits_balance"] == 0 and body["reward_available"] is False


def test_el_mismo_celular_en_distintos_formatos_es_el_mismo_comensal(client, admin_headers, resto):
    assert _create(client, admin_headers, resto.id, phone="987 654 321").status_code == 201
    for variant in ("987654321", "+51987654321", "+51 987 654 321"):
        r = _create(client, admin_headers, resto.id, phone=variant, name="Otra")
        assert r.status_code == 409, variant
        assert code_of(r) == "PHONE_ALREADY_REGISTERED"


def test_celular_invalido_da_422(client, admin_headers, resto):
    r = _create(client, admin_headers, resto.id, phone="12345")
    assert r.status_code == 422 and code_of(r) == "INVALID_PHONE"


def test_el_mismo_celular_en_otro_restaurante_se_permite(client, admin_headers, resto, make_restaurant):
    otro = make_restaurant("dos")
    assert _create(client, admin_headers, resto.id).status_code == 201
    assert _create(client, admin_headers, otro.id).status_code == 201


def test_lookup_por_celular(client, admin_headers, resto):
    created = _create(client, admin_headers, resto.id).json()
    r = client.get(f"{BASE}/{resto.id}/customers/lookup", headers=admin_headers, params={"phone": "987 654 321"})
    assert r.status_code == 200 and r.json()["id"] == created["id"]
    r = client.get(f"{BASE}/{resto.id}/customers/lookup", headers=admin_headers, params={"phone": "911111111"})
    assert r.status_code == 404
    r = client.get(f"{BASE}/{resto.id}/customers/lookup", headers=admin_headers, params={"phone": "abc"})
    assert r.status_code == 422


def test_detalle_edicion_busqueda_y_paginacion(client, admin_headers, resto):
    a = _create(client, admin_headers, resto.id, phone="987654321", name="Ana Pérez").json()
    _create(client, admin_headers, resto.id, phone="912345678", name="Beto Ruiz")
    _create(client, admin_headers, resto.id, phone="923456789", name="Carla Soto")

    assert client.get(f"{BASE}/{resto.id}/customers/{a['id']}", headers=admin_headers).json()["full_name"] == "Ana Pérez"
    upd = client.put(f"{BASE}/{resto.id}/customers/{a['id']}", headers=admin_headers,
                     json={"full_name": "Ana María", "notes": "VIP"})
    assert upd.status_code == 200 and upd.json()["full_name"] == "Ana María" and upd.json()["phone"] == "+51987654321"
    # cambiar el celular a uno ya usado da 409
    dup = client.put(f"{BASE}/{resto.id}/customers/{a['id']}", headers=admin_headers, json={"phone": "912 345 678"})
    assert dup.status_code == 409

    listing = client.get(f"{BASE}/{resto.id}/customers", headers=admin_headers, params={"size": 2}).json()
    assert len(listing["data"]) == 2 and listing["meta"]["total"] == 3 and listing["meta"]["has_next"] is True
    by_name = client.get(f"{BASE}/{resto.id}/customers", headers=admin_headers, params={"search": "carla"}).json()
    assert [c["full_name"] for c in by_name["data"]] == ["Carla Soto"]
    by_phone = client.get(f"{BASE}/{resto.id}/customers", headers=admin_headers, params={"search": "912 345"}).json()
    assert [c["full_name"] for c in by_phone["data"]] == ["Beto Ruiz"]


def test_anonimizar_borra_datos_conserva_visitas_y_permite_reusar_el_celular(client, db, admin_headers, resto):
    program = {"is_active": True, "visits_required": 2, "reward_description": "Postre", "min_hours_between_visits": 0}
    assert client.put(f"{BASE}/{resto.id}/loyalty/program", headers=admin_headers, json=program).status_code == 200
    ci = client.post(f"{BASE}/{resto.id}/loyalty/check-in", headers=admin_headers,
                     json={"phone": "987654321", "full_name": "Ana Pérez", "consent": True}).json()
    cid = ci["customer"]["id"]
    _ = client.put(f"{BASE}/{resto.id}/customers/{cid}", headers=admin_headers,
                   json={"email": "ana@example.com", "notes": "nota"})

    assert client.delete(f"{BASE}/{resto.id}/customers/{cid}", headers=admin_headers).status_code == 204

    db.expire_all()
    row = db.query(RestaurantCustomer).filter(RestaurantCustomer.id == UUID(cid)).one()
    assert (row.full_name, row.phone, row.email, row.notes) == ("Comensal eliminado", None, None, None)
    assert row.deleted_at is not None
    # las visitas se conservan (anónimas) para las estadísticas
    assert db.query(LoyaltyVisit).filter(LoyaltyVisit.customer_id == UUID(cid)).count() == 1
    assert client.get("/api/v1/admin/stats", headers=admin_headers).json()["loyalty_visits_month"] == 1
    # el comensal ya no aparece ni se puede consultar
    assert client.get(f"{BASE}/{resto.id}/customers/{cid}", headers=admin_headers).status_code == 404
    assert client.get(f"{BASE}/{resto.id}/customers", headers=admin_headers).json()["meta"]["total"] == 0
    # el mismo celular puede registrarse de nuevo como comensal nuevo
    again = _create(client, admin_headers, resto.id)
    assert again.status_code == 201 and again.json()["id"] != cid


def test_dueno_recibe_404_en_los_comensales_de_otro_restaurante(
    client, admin_headers, owner_user, owner_headers, make_restaurant, make_membership
):
    own, other = make_restaurant("propio"), make_restaurant("ajeno")
    make_membership(owner_user, own.id)
    cid = _create(client, admin_headers, other.id).json()["id"]

    h = owner_headers
    calls = [
        client.get(f"{BASE}/{other.id}/customers", headers=h),
        client.post(f"{BASE}/{other.id}/customers", headers=h, json={"full_name": "X", "phone": "911111111", "consent": True}),
        client.get(f"{BASE}/{other.id}/customers/lookup", headers=h, params={"phone": "987654321"}),
        client.get(f"{BASE}/{other.id}/customers/{cid}", headers=h),
        client.put(f"{BASE}/{other.id}/customers/{cid}", headers=h, json={"full_name": "hack"}),
        client.delete(f"{BASE}/{other.id}/customers/{cid}", headers=h),
        # y con su propio restaurant_id en la URL pero el comensal ajeno
        client.get(f"{BASE}/{own.id}/customers/{cid}", headers=h),
        client.delete(f"{BASE}/{own.id}/customers/{cid}", headers=h),
    ]
    assert [c.status_code for c in calls] == [404] * len(calls)
    # el dueño sí opera en el suyo
    assert _create(client, h, own.id, phone="911111111").status_code == 201
    assert client.get(f"{BASE}/{other.id}/customers/{cid}", headers=admin_headers).json()["full_name"] == "Ana Pérez"


def test_los_endpoints_de_comensales_requieren_autenticacion(client, resto):
    assert client.get(f"{BASE}/{resto.id}/customers").status_code == 401
    assert client.post(f"{BASE}/{resto.id}/customers", json={}).status_code == 401

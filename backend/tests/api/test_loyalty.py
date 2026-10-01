"""Programa de fidelización, visitas, canjes y anulaciones (Fase 3)."""
from datetime import datetime, timedelta
from uuid import UUID

import pytest

from app.models.loyalty import LoyaltyVisit

BASE = "/api/v1/admin/restaurants"


def code_of(response):
    return response.json()["detail"]["code"]


def program_body(**overrides):
    body = {
        "is_active": True,
        "visits_required": 3,
        "reward_description": "Ceviche clásico gratis",
        "min_hours_between_visits": 0,
    }
    body.update(overrides)
    return body


@pytest.fixture
def resto(make_restaurant):
    return make_restaurant("uno")


@pytest.fixture
def h(admin_headers):
    return admin_headers


def put_program(client, h, rid, **overrides):
    r = client.put(f"{BASE}/{rid}/loyalty/program", headers=h, json=program_body(**overrides))
    assert r.status_code == 200, r.text
    return r.json()


def check_in(client, h, rid, phone="987654321", name="Ana Pérez", consent=True):
    body = {"phone": phone}
    if name is not None:
        body["full_name"] = name
    if consent is not None:
        body["consent"] = consent
    return client.post(f"{BASE}/{rid}/loyalty/check-in", headers=h, json=body)


def set_visited_at(db, visit_id, when):
    db.query(LoyaltyVisit).filter(LoyaltyVisit.id == UUID(visit_id)).update({"visited_at": when})
    db.commit()


def make_customer_with_visits(client, db, h, rid, count, phone="987654321"):
    """Crea un comensal y `count` visitas espaciadas (la más antigua primero)."""
    ids = []
    for _ in range(count):
        r = check_in(client, h, rid, phone=phone)
        assert r.status_code == 201, r.text
        ids.append(r.json()["visit"]["id"])
    customer_id = r.json()["customer"]["id"]
    base = datetime.utcnow() - timedelta(days=count + 1)
    for i, vid in enumerate(ids):
        set_visited_at(db, vid, base + timedelta(days=i))
    return customer_id, ids


# ---------------------------------------------------------------- programa
def test_get_program_da_404_si_no_existe_y_upsert_lo_crea(client, h, resto):
    assert client.get(f"{BASE}/{resto.id}/loyalty/program", headers=h).status_code == 404
    created = put_program(client, h, resto.id, is_active=False, visits_required=5)
    assert created["is_active"] is False and created["visits_required"] == 5
    assert created["consent_version"] == 1
    assert resto.name in created["consent_text"]  # texto por defecto con el nombre del restaurante
    assert client.get(f"{BASE}/{resto.id}/loyalty/program", headers=h).json()["id"] == created["id"]
    # un segundo PUT actualiza, no crea otro
    updated = put_program(client, h, resto.id, visits_required=8)
    assert updated["id"] == created["id"] and updated["visits_required"] == 8


def test_programa_valida_rangos(client, h, resto):
    for bad in ({"visits_required": 1}, {"visits_required": 101}, {"min_hours_between_visits": -1},
                {"min_hours_between_visits": 169}, {"visits_expire_after_days": 0}, {"reward_description": ""}):
        r = client.put(f"{BASE}/{resto.id}/loyalty/program", headers=h, json=program_body(**bad))
        assert r.status_code == 422, bad


def test_producto_de_recompensa_de_otro_restaurante_da_422(client, h, resto, make_restaurant):
    otro = make_restaurant("dos")
    cat = client.post(f"{BASE}/{otro.id}/categories", headers=h, json={"name": "Platos"}).json()
    ajeno = client.post(f"{BASE}/{otro.id}/products", headers=h,
                        json={"name": "Lomo", "price": "30", "category_id": cat["id"]}).json()
    r = client.put(f"{BASE}/{resto.id}/loyalty/program", headers=h, json=program_body(reward_product_id=ajeno["id"]))
    assert r.status_code == 422 and code_of(r) == "INVALID_REWARD_PRODUCT"

    cat_own = client.post(f"{BASE}/{resto.id}/categories", headers=h, json={"name": "Platos"}).json()
    propio = client.post(f"{BASE}/{resto.id}/products", headers=h,
                         json={"name": "Ceviche", "price": "30", "category_id": cat_own["id"]}).json()
    ok = client.put(f"{BASE}/{resto.id}/loyalty/program", headers=h, json=program_body(reward_product_id=propio["id"]))
    assert ok.status_code == 200 and ok.json()["reward_product_id"] == propio["id"]


def test_cambiar_el_texto_de_consentimiento_sube_la_version(client, h, resto):
    first = put_program(client, h, resto.id, consent_text="Texto uno")
    assert first["consent_version"] == 1
    same = put_program(client, h, resto.id, consent_text="Texto uno", visits_required=4)
    assert same["consent_version"] == 1
    changed = put_program(client, h, resto.id, consent_text="Texto dos")
    assert changed["consent_version"] == 2
    # sin enviar consent_text se conserva el vigente y la versión no cambia
    kept = put_program(client, h, resto.id)
    assert kept["consent_text"] == "Texto dos" and kept["consent_version"] == 2


def test_cada_comensal_guarda_la_version_del_consentimiento_que_acepto(client, h, resto):
    put_program(client, h, resto.id, consent_text="v1")
    first = check_in(client, h, resto.id, phone="987654321").json()["customer"]
    put_program(client, h, resto.id, consent_text="v2")
    second = check_in(client, h, resto.id, phone="912345678", name="Beto").json()["customer"]
    assert (first["consent_version"], second["consent_version"]) == (1, 2)


# ---------------------------------------------------------------- check-in
def test_check_in_de_celular_nuevo_exige_nombre_y_consentimiento(client, h, resto):
    put_program(client, h, resto.id)
    for kwargs in ({"name": None, "consent": True}, {"name": "", "consent": True},
                   {"name": "Ana", "consent": False}, {"name": "Ana", "consent": None}):
        r = check_in(client, h, resto.id, **kwargs)
        assert r.status_code == 422 and code_of(r) == "CUSTOMER_DATA_REQUIRED", kwargs
    assert client.get(f"{BASE}/{resto.id}/customers", headers=h).json()["meta"]["total"] == 0

    ok = check_in(client, h, resto.id)
    assert ok.status_code == 201
    body = ok.json()
    assert body["customer_created"] is True
    assert body["balance"] == 1 and body["visits_required"] == 3 and body["reward_available"] is False
    assert body["customer"]["phone"] == "+51987654321"
    assert body["visit"]["status"] == "valid" and body["visit"]["registered_by_username"] == "adminuser"


def test_check_in_de_comensal_existente_suma_una_visita_sin_pedir_datos(client, h, resto):
    put_program(client, h, resto.id)
    check_in(client, h, resto.id)
    again = check_in(client, h, resto.id, phone="987 654 321", name=None, consent=None)
    assert again.status_code == 201
    assert again.json()["balance"] == 2 and again.json()["customer_created"] is False


def test_check_in_marca_reward_available_al_llegar_a_la_meta(client, h, resto):
    put_program(client, h, resto.id, visits_required=2)
    check_in(client, h, resto.id)
    r = check_in(client, h, resto.id)
    assert r.json()["balance"] == 2 and r.json()["reward_available"] is True


def test_tiempo_minimo_entre_visitas(client, h, resto):
    put_program(client, h, resto.id, min_hours_between_visits=12)
    assert check_in(client, h, resto.id).status_code == 201
    r = check_in(client, h, resto.id)
    assert r.status_code == 409 and code_of(r) == "VISIT_COOLDOWN"
    next_allowed = datetime.fromisoformat(r.json()["detail"]["next_allowed_at"])
    assert timedelta(hours=11) < next_allowed - datetime.utcnow() <= timedelta(hours=12)
    # con 0 horas se permite
    put_program(client, h, resto.id, min_hours_between_visits=0)
    assert check_in(client, h, resto.id).status_code == 201


def test_el_tiempo_minimo_ignora_las_visitas_anuladas(client, h, resto):
    put_program(client, h, resto.id, min_hours_between_visits=12)
    first = check_in(client, h, resto.id).json()
    assert client.post(f"{BASE}/{resto.id}/loyalty/visits/{first['visit']['id']}/void", headers=h,
                       json={"reason": "Error de caja"}).status_code == 200
    assert check_in(client, h, resto.id).status_code == 201


def test_programa_inactivo_bloquea_check_in_visita_manual_y_canje(client, db, h, resto):
    put_program(client, h, resto.id)
    cid, _ = make_customer_with_visits(client, db, h, resto.id, 3)
    put_program(client, h, resto.id, is_active=False)
    for call in (
        check_in(client, h, resto.id),
        client.post(f"{BASE}/{resto.id}/customers/{cid}/visits", headers=h),
        client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h),
    ):
        assert call.status_code == 409 and code_of(call) == "LOYALTY_PROGRAM_INACTIVE"


def test_sin_programa_el_check_in_da_409(client, h, resto):
    r = check_in(client, h, resto.id)
    assert r.status_code == 409 and code_of(r) == "LOYALTY_PROGRAM_INACTIVE"


def test_check_in_con_celular_invalido_da_422(client, h, resto):
    put_program(client, h, resto.id)
    r = check_in(client, h, resto.id, phone="12345")
    assert r.status_code == 422 and code_of(r) == "INVALID_PHONE"


# ---------------------------------------------------------------- saldo y vencimiento
def test_visitas_vencidas_no_cuentan_para_el_saldo(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=3, visits_expire_after_days=30)
    cid, ids = make_customer_with_visits(client, db, h, resto.id, 3)
    set_visited_at(db, ids[0], datetime.utcnow() - timedelta(days=60))  # vencida
    set_visited_at(db, ids[1], datetime.utcnow() - timedelta(days=10))
    customer = client.get(f"{BASE}/{resto.id}/customers/{cid}", headers=h).json()
    assert customer["visits_balance"] == 2 and customer["reward_available"] is False
    history = {v["id"]: v["status"] for v in client.get(f"{BASE}/{resto.id}/customers/{cid}/visits", headers=h).json()["data"]}
    assert history[ids[0]] == "expired" and history[ids[1]] == "valid"
    # sin vencimiento configurado, la visita antigua vuelve a contar
    put_program(client, h, resto.id, visits_required=3, visits_expire_after_days=None)
    assert client.get(f"{BASE}/{resto.id}/customers/{cid}", headers=h).json()["visits_balance"] == 3


# ---------------------------------------------------------------- canje
def test_canje_con_saldo_insuficiente_da_409(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=3)
    cid, _ = make_customer_with_visits(client, db, h, resto.id, 2)
    r = client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h)
    assert r.status_code == 409 and code_of(r) == "INSUFFICIENT_VISITS"
    assert client.get(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h).json()["data"] == []


def test_canje_consume_las_n_visitas_mas_antiguas_fifo(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=3, reward_description="Postre gratis")
    cid, ids = make_customer_with_visits(client, db, h, resto.id, 4)  # ids[0] es la más antigua
    r = client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h)
    assert r.status_code == 201
    redemption = r.json()
    assert redemption["visits_consumed"] == 3 and redemption["reward_description_snapshot"] == "Postre gratis"

    history = {v["id"]: v for v in client.get(f"{BASE}/{resto.id}/customers/{cid}/visits", headers=h).json()["data"]}
    assert [history[i]["status"] for i in ids] == ["redeemed", "redeemed", "redeemed", "valid"]
    assert all(history[i]["redemption_id"] == redemption["id"] for i in ids[:3])
    assert history[ids[3]]["redemption_id"] is None
    assert client.get(f"{BASE}/{resto.id}/customers/{cid}", headers=h).json()["visits_balance"] == 1


def test_el_canje_guarda_una_copia_aunque_cambie_el_programa(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=2, reward_description="Plato original")
    cid, _ = make_customer_with_visits(client, db, h, resto.id, 2)
    redemption = client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h).json()
    put_program(client, h, resto.id, visits_required=10, reward_description="Plato nuevo")
    listed = client.get(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h).json()["data"]
    assert listed[0]["id"] == redemption["id"]
    assert listed[0]["visits_consumed"] == 2 and listed[0]["reward_description_snapshot"] == "Plato original"


def test_no_se_puede_canjear_dos_veces_con_el_mismo_saldo(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=2)
    cid, _ = make_customer_with_visits(client, db, h, resto.id, 2)
    assert client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h).status_code == 201
    again = client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h)
    assert again.status_code == 409 and code_of(again) == "INSUFFICIENT_VISITS"


# ---------------------------------------------------------------- anulaciones
def test_anular_una_visita_la_excluye_del_saldo(client, db, h, resto):
    put_program(client, h, resto.id)
    cid, ids = make_customer_with_visits(client, db, h, resto.id, 2)
    r = client.post(f"{BASE}/{resto.id}/loyalty/visits/{ids[0]}/void", headers=h, json={"reason": "Se registró dos veces"})
    assert r.status_code == 200
    assert r.json()["status"] == "voided" and r.json()["void_reason"] == "Se registró dos veces"
    assert client.get(f"{BASE}/{resto.id}/customers/{cid}", headers=h).json()["visits_balance"] == 1
    # anular de nuevo da 409
    again = client.post(f"{BASE}/{resto.id}/loyalty/visits/{ids[0]}/void", headers=h, json={"reason": "otra vez"})
    assert again.status_code == 409 and code_of(again) == "VISIT_ALREADY_VOIDED"


def test_anular_requiere_motivo(client, db, h, resto):
    put_program(client, h, resto.id)
    _, ids = make_customer_with_visits(client, db, h, resto.id, 1)
    for body in ({}, {"reason": ""}, {"reason": "ab"}):
        assert client.post(f"{BASE}/{resto.id}/loyalty/visits/{ids[0]}/void", headers=h, json=body).status_code == 422


def test_anular_una_visita_ya_canjeada_da_409(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=2)
    cid, ids = make_customer_with_visits(client, db, h, resto.id, 2)
    client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h)
    r = client.post(f"{BASE}/{resto.id}/loyalty/visits/{ids[0]}/void", headers=h, json={"reason": "Error de caja"})
    assert r.status_code == 409 and code_of(r) == "VISIT_ALREADY_REDEEMED"


def test_anular_un_canje_libera_sus_visitas(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=2)
    cid, ids = make_customer_with_visits(client, db, h, resto.id, 2)
    redemption = client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h).json()
    assert client.get(f"{BASE}/{resto.id}/customers/{cid}", headers=h).json()["visits_balance"] == 0

    r = client.post(f"{BASE}/{resto.id}/loyalty/redemptions/{redemption['id']}/void", headers=h,
                    json={"reason": "No se entregó el plato"})
    assert r.status_code == 200 and r.json()["voided_at"] and r.json()["void_reason"] == "No se entregó el plato"
    customer = client.get(f"{BASE}/{resto.id}/customers/{cid}", headers=h).json()
    assert customer["visits_balance"] == 2 and customer["reward_available"] is True
    history = client.get(f"{BASE}/{resto.id}/customers/{cid}/visits", headers=h).json()["data"]
    assert {v["status"] for v in history} == {"valid"}
    # un canje anulado no se puede anular otra vez, y las visitas se pueden volver a canjear
    again = client.post(f"{BASE}/{resto.id}/loyalty/redemptions/{redemption['id']}/void", headers=h,
                        json={"reason": "otra vez"})
    assert again.status_code == 409 and code_of(again) == "REDEMPTION_ALREADY_VOIDED"
    assert client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h).status_code == 201


# ---------------------------------------------------------------- carta pública
def test_la_carta_publica_incluye_loyalty_solo_si_el_programa_esta_activo(client, db, h, resto):
    client.put(f"{BASE}/{resto.id}", headers=h, json={"is_published": True})
    url = f"/api/v1/public/restaurants/{resto.slug}"
    assert client.get(url).json()["loyalty"] is None  # sin programa

    put_program(client, h, resto.id, is_active=False)
    assert client.get(url).json()["loyalty"] is None  # programa inactivo

    put_program(client, h, resto.id, is_active=True, visits_required=7, reward_description="Jugo gratis")
    cid, _ = make_customer_with_visits(client, db, h, resto.id, 1)
    body = client.get(url).json()
    assert body["loyalty"] == {"visits_required": 7, "reward_description": "Jugo gratis", "min_hours_between_visits": 0}
    # nunca datos de comensales
    raw = client.get(url).text
    assert "Ana" not in raw and "987654321" not in raw and cid not in raw


# ---------------------------------------------------------------- estadísticas
def test_stats_cuenta_visitas_y_canjes_del_mes_sin_anulados(client, db, h, resto):
    put_program(client, h, resto.id, visits_required=2)
    cid, ids = make_customer_with_visits(client, db, h, resto.id, 4)
    client.post(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h)  # consume ids[0], ids[1]
    client.post(f"{BASE}/{resto.id}/loyalty/visits/{ids[3]}/void", headers=h, json={"reason": "Error de caja"})
    # una visita de un mes anterior no cuenta
    old = check_in(client, h, resto.id, phone="911111111", name="Beto").json()["visit"]["id"]
    set_visited_at(db, old, datetime.utcnow().replace(day=1) - timedelta(days=2))
    stats_now = None
    # las visitas de make_customer_with_visits se espaciaron hacia atrás: fijarlas dentro del mes
    for vid in ids:
        set_visited_at(db, vid, datetime.utcnow())
    stats_now = client.get("/api/v1/admin/stats", headers=h).json()
    assert stats_now["customers_total"] == 2
    assert stats_now["loyalty_visits_month"] == 3  # 4 del mes - 1 anulada (la de mes anterior no cuenta)
    assert stats_now["loyalty_redemptions_month"] == 1
    # anular el canje lo excluye
    redemption_id = client.get(f"{BASE}/{resto.id}/customers/{cid}/redemptions", headers=h).json()["data"][0]["id"]
    client.post(f"{BASE}/{resto.id}/loyalty/redemptions/{redemption_id}/void", headers=h, json={"reason": "Error de caja"})
    assert client.get("/api/v1/admin/stats", headers=h).json()["loyalty_redemptions_month"] == 0


def test_stats_del_dueno_solo_cuenta_sus_restaurantes(
    client, db, h, owner_user, owner_headers, make_restaurant, make_membership
):
    own, other = make_restaurant("propio"), make_restaurant("ajeno")
    make_membership(owner_user, own.id)
    for r, phone in ((own, "987654321"), (other, "912345678")):
        put_program(client, h, r.id)
        check_in(client, h, r.id, phone=phone)
    assert client.get("/api/v1/admin/stats", headers=h).json()["loyalty_visits_month"] == 2
    mine = client.get("/api/v1/admin/stats", headers=owner_headers).json()
    assert mine["loyalty_visits_month"] == 1 and mine["customers_total"] == 1


# ---------------------------------------------------------------- aislamiento por restaurante
def test_dueno_recibe_404_en_la_fidelizacion_de_otro_restaurante(
    client, db, h, owner_user, owner_headers, make_restaurant, make_membership
):
    own, other = make_restaurant("propio"), make_restaurant("ajeno")
    make_membership(owner_user, own.id)
    put_program(client, h, other.id)
    put_program(client, h, own.id)
    cid, ids = make_customer_with_visits(client, db, h, other.id, 3)
    redemption = client.post(f"{BASE}/{other.id}/customers/{cid}/redemptions", headers=h).json()

    o = owner_headers
    calls = [
        client.get(f"{BASE}/{other.id}/loyalty/program", headers=o),
        client.put(f"{BASE}/{other.id}/loyalty/program", headers=o, json=program_body()),
        check_in(client, o, other.id),
        client.get(f"{BASE}/{other.id}/customers/{cid}/visits", headers=o),
        client.post(f"{BASE}/{other.id}/customers/{cid}/visits", headers=o),
        client.get(f"{BASE}/{other.id}/customers/{cid}/redemptions", headers=o),
        client.post(f"{BASE}/{other.id}/customers/{cid}/redemptions", headers=o),
        client.post(f"{BASE}/{other.id}/loyalty/visits/{ids[0]}/void", headers=o, json={"reason": "hack"}),
        client.post(f"{BASE}/{other.id}/loyalty/redemptions/{redemption['id']}/void", headers=o, json={"reason": "hack"}),
        # usando su propio restaurant_id con entidades ajenas
        client.get(f"{BASE}/{own.id}/customers/{cid}/visits", headers=o),
        client.post(f"{BASE}/{own.id}/customers/{cid}/redemptions", headers=o),
        client.post(f"{BASE}/{own.id}/loyalty/visits/{ids[0]}/void", headers=o, json={"reason": "hack"}),
        client.post(f"{BASE}/{own.id}/loyalty/redemptions/{redemption['id']}/void", headers=o, json={"reason": "hack"}),
    ]
    assert [c.status_code for c in calls] == [404] * len(calls)
    # nada cambió
    assert client.get(f"{BASE}/{other.id}/customers/{cid}/redemptions", headers=h).json()["data"][0]["voided_at"] is None
    # el dueño sí opera en el suyo
    assert check_in(client, o, own.id, phone="911111111", name="Beto").status_code == 201


def test_visita_manual_y_historial_muestran_quien_la_registro(client, h, resto):
    put_program(client, h, resto.id)
    cid = check_in(client, h, resto.id).json()["customer"]["id"]
    manual = client.post(f"{BASE}/{resto.id}/customers/{cid}/visits", headers=h)
    assert manual.status_code == 201 and manual.json()["registered_by_username"] == "adminuser"
    history = client.get(f"{BASE}/{resto.id}/customers/{cid}/visits", headers=h).json()["data"]
    assert len(history) == 2 and {v["registered_by_username"] for v in history} == {"adminuser"}


def test_los_endpoints_de_fidelizacion_requieren_autenticacion(client, resto):
    assert client.get(f"{BASE}/{resto.id}/loyalty/program").status_code == 401
    assert client.post(f"{BASE}/{resto.id}/loyalty/check-in", json={"phone": "987654321"}).status_code == 401

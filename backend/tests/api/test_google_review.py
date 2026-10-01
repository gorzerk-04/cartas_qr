"""Fase 5: enlace de reseñas de Google (validación, carta pública y permisos)."""
import pytest

from app.core.google_review import (
    InvalidGoogleReviewUrlError,
    normalize_google_review_url,
)

BASE = "/api/v1/admin/restaurants"
PLACE_ID = "ChIJN1t_tDeuEmsRUsoyG83frY4"
WRITE_REVIEW = f"https://search.google.com/local/writereview?placeid={PLACE_ID}"


# ---------------------------------------------------------------- validador
@pytest.mark.parametrize("url", [
    "https://g.page/r/CbAbCdEf123/review",
    WRITE_REVIEW,
    "https://maps.app.goo.gl/AbCdEf123",
    "https://maps.google.com/?cid=123456",
    "https://www.google.com/maps/place/Chifa+Taiwan",
    "https://google.com/maps?cid=123",
    "HTTPS://G.PAGE/r/abc/review",
])
def test_acepta_enlaces_de_google(url):
    assert normalize_google_review_url(url) == url


def test_normaliza_un_place_id():
    assert normalize_google_review_url(f"  {PLACE_ID} ") == WRITE_REVIEW


@pytest.mark.parametrize("value", [None, "", "   "])
def test_vacio_se_guarda_como_null(value):
    assert normalize_google_review_url(value) is None


@pytest.mark.parametrize("url", [
    "http://g.page/r/abc/review",                 # sin https
    "javascript:alert(1)",
    "https://facebook.com/chifa",                 # otro dominio
    "https://google.com.evil.com/maps",           # dominio parecido
    "https://g.page.evil.com/r/abc/review",
    "https://evil.com/g.page",
    "https://g.page@evil.com/r/abc",              # usuario en la URL
    "https://www.google.com/search?q=chifa",      # google.com fuera de /maps
    "https://google.com/",
    "https://g.page:8443/r/abc",                  # puerto raro
    "ChIJ con espacios",
    "g.page/r/abc/review",                        # sin esquema
])
def test_rechaza_enlaces_no_validos(url):
    with pytest.raises(InvalidGoogleReviewUrlError):
        normalize_google_review_url(url)


def test_rechaza_enlaces_demasiado_largos():
    with pytest.raises(InvalidGoogleReviewUrlError):
        normalize_google_review_url("https://g.page/r/" + "a" * 600)


# ---------------------------------------------------------------- API del panel
@pytest.fixture
def resto(make_restaurant):
    return make_restaurant("resena")


def test_admin_guarda_normaliza_y_limpia_el_enlace(client, admin_headers, resto):
    url = f"{BASE}/{resto.id}"
    r = client.put(url, headers=admin_headers, json={"google_review_url": PLACE_ID})
    assert r.status_code == 200
    assert r.json()["google_review_url"] == WRITE_REVIEW
    assert client.get(url, headers=admin_headers).json()["google_review_url"] == WRITE_REVIEW

    r = client.put(url, headers=admin_headers, json={"google_review_url": ""})
    assert r.status_code == 200 and r.json()["google_review_url"] is None


def test_admin_recibe_422_con_un_enlace_no_valido(client, admin_headers, resto):
    url = f"{BASE}/{resto.id}"
    client.put(url, headers=admin_headers, json={"google_review_url": WRITE_REVIEW})
    for bad in ("http://g.page/r/abc", "javascript:alert(1)", "https://google.com.evil.com/maps"):
        r = client.put(url, headers=admin_headers, json={"google_review_url": bad})
        assert r.status_code == 422, bad
        assert "enlace de reseñas" in r.text
    # El valor anterior no cambia
    assert client.get(url, headers=admin_headers).json()["google_review_url"] == WRITE_REVIEW


def test_admin_puede_crear_un_restaurante_con_enlace(client, admin_headers):
    r = client.post(BASE, headers=admin_headers,
                    json={"name": "Con reseña", "slug": "con-resena", "google_review_url": PLACE_ID})
    assert r.status_code == 201 and r.json()["google_review_url"] == WRITE_REVIEW
    bad = client.post(BASE, headers=admin_headers,
                      json={"name": "Mala", "slug": "mala", "google_review_url": "https://evil.com"})
    assert bad.status_code == 422


def test_dueno_ve_el_enlace_pero_no_lo_edita_y_404_en_ajeno(
    client, admin_headers, owner_headers, owner_user, make_restaurant, make_membership
):
    own = make_restaurant("propio-resena")
    other = make_restaurant("ajeno-resena")
    make_membership(owner_user, own.id)
    client.put(f"{BASE}/{own.id}", headers=admin_headers, json={"google_review_url": WRITE_REVIEW})

    assert client.get(f"{BASE}/{own.id}", headers=owner_headers).json()["google_review_url"] == WRITE_REVIEW
    r = client.put(f"{BASE}/{own.id}", headers=owner_headers, json={"google_review_url": PLACE_ID + "x"})
    assert r.status_code == 403  # Info General en solo lectura para el dueño (D15)
    r = client.put(f"{BASE}/{other.id}", headers=owner_headers, json={"google_review_url": WRITE_REVIEW})
    assert r.status_code == 404
    assert client.get(f"{BASE}/{own.id}", headers=admin_headers).json()["google_review_url"] == WRITE_REVIEW


# ---------------------------------------------------------------- carta pública
def _publish(client, admin_headers, rid, **extra):
    r = client.put(f"{BASE}/{rid}", headers=admin_headers, json={"is_published": True, **extra})
    assert r.status_code == 200


def test_la_carta_publica_incluye_el_enlace_o_null(client, admin_headers, resto):
    public = f"/api/v1/public/restaurants/{resto.slug}"
    _publish(client, admin_headers, resto.id)
    assert client.get(public).json()["google_review_url"] is None

    _publish(client, admin_headers, resto.id, google_review_url=WRITE_REVIEW)
    assert client.get(public).json()["google_review_url"] == WRITE_REVIEW


def test_loyalty_publico_incluye_min_hours_between_visits(client, admin_headers, resto):
    _publish(client, admin_headers, resto.id)
    program = {
        "is_active": True,
        "visits_required": 5,
        "min_hours_between_visits": 6,
        "reward_description": "Postre gratis",
    }
    r = client.put(f"{BASE}/{resto.id}/loyalty/program", headers=admin_headers, json=program)
    assert r.status_code == 200, r.text
    loyalty = client.get(f"/api/v1/public/restaurants/{resto.slug}").json()["loyalty"]
    assert loyalty == {"visits_required": 5, "reward_description": "Postre gratis", "min_hours_between_visits": 6}

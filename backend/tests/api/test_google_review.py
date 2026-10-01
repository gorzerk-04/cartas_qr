"""Reseñas de Google: conversión del enlace de Maps, enlace oficial, permisos y carta pública.

Ningún test sale a internet: las redirecciones se simulan con httpx.MockTransport.
"""
from unittest import mock
from urllib.parse import quote

import httpx
import pytest

from app.core.google_review import InvalidGoogleReviewUrlError, normalize_google_review_url
from app.services import google_reviews
from app.services.google_reviews import (
    ReviewLinkError,
    build_review_link,
    expand_url,
    parse_maps_url,
    resolve_review_link,
)

BASE = "/api/v1/admin"
SHORT = "https://maps.app.goo.gl/ypMDFVAFDyfr9xFY6"
LONG = (
    "https://www.google.com/maps/place/Chifa+Taiwan/@-9.9554469,-76.2486745,21z/data=!4m6!3m5"
    "!1s0x91a7c3749150a1f7:0xb61bbbe27d37f437!8m2!3d-9.9554923!4d-76.2486634!16s%2Fg%2F11tnm3lqlg"
    "?entry=tts"
)
FTID = "0x91a7c3749150a1f7:0xb61bbbe27d37f437"
REVIEW = "https://www.google.com/maps?cid=13122288520711894071"
OVERRIDE = "https://g.page/r/CbAbCdEf123/review"


def redirects(mapping, *, seen=None):
    """Transport que responde 302 según `mapping` (url → location) y 200 al resto."""

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if seen is not None:
            seen.append(request)
        if url in mapping:
            return httpx.Response(302, headers={"location": mapping[url]})
        return httpx.Response(200, text="<html></html>")

    return httpx.MockTransport(handler)


@pytest.fixture
def mock_google(monkeypatch):
    """Inyecta un MockTransport en los httpx.Client que cree el servicio (para los endpoints)."""
    real_client = httpx.Client
    state = {"transport": redirects({SHORT: LONG})}

    def factory(*args, **kwargs):
        kwargs["transport"] = state["transport"]
        return real_client(*args, **kwargs)

    monkeypatch.setattr(google_reviews.httpx, "Client", factory)
    return state


# ---------------------------------------------------------------- servicio
def test_caso_chifa_taiwan_enlace_corto():
    seen = []
    result = resolve_review_link(SHORT, transport=redirects({SHORT: LONG}, seen=seen))
    assert result == {"nombre": "Chifa Taiwan", "ftid": FTID, "review_url": REVIEW}
    # Encabezados pedidos al expandir
    assert seen[0].headers["accept-language"] == "es-PE,es;q=0.9"
    assert "Mozilla/5.0" in seen[0].headers["user-agent"]


def test_url_larga_directa_no_llama_a_google():
    def boom(request):
        raise AssertionError("no debe hacer peticiones")

    assert resolve_review_link(LONG, transport=httpx.MockTransport(boom))["review_url"] == REVIEW


def test_url_con_parametro_ftid():
    url = "https://maps.google.com/?ftid=0xABC123:0xDEF456&q=Algo"
    assert parse_maps_url(url) == ("0xabc123:0xdef456", None)
    assert build_review_link("0xabc123:0xdef456") == f"https://www.google.com/maps?cid={0xdef456}"


def test_redireccion_via_consent_google_com():
    consent = "https://consent.google.com/m?continue=" + quote(LONG, safe="")
    result = resolve_review_link(SHORT, transport=redirects({SHORT: consent}))
    assert result["review_url"] == REVIEW


def test_redireccion_en_varios_saltos():
    middle = "https://goo.gl/maps/abc"
    transport = redirects({SHORT: middle, middle: LONG})
    assert expand_url(SHORT, transport=transport) == LONG


def test_url_sin_ftid_da_error():
    with pytest.raises(ReviewLinkError) as exc:
        resolve_review_link("https://www.google.com/maps/place/Chifa+Taiwan/@-9.9,-76.2,21z")
    assert exc.value.code == "PLACE_ID_NOT_FOUND" and exc.value.status_code == 422


@pytest.mark.parametrize("url", [
    "https://evil.com/maps/place/x",
    "https://google.com.evil.com/maps",
    "http://maps.app.goo.gl/abc",              # sin https
    "https://maps.app.goo.gl@evil.com/abc",    # usuario en la URL
    "https://maps.app.goo.gl:8443/abc",
    "javascript:alert(1)",
    "",
])
def test_host_no_permitido_da_error(url):
    with pytest.raises(ReviewLinkError):
        expand_url(url, transport=redirects({}))


@pytest.mark.parametrize("target", [
    "https://evil.com/maps/place/x",
    "https://google.com.evil.com/x",
    "http://www.google.com/maps/place/x",      # baja a http
    "https://169.254.169.254/latest/meta-data",
])
def test_redireccion_a_host_no_permitido_da_error(target):
    seen = []
    with pytest.raises(ReviewLinkError) as exc:
        expand_url(SHORT, transport=redirects({SHORT: target}, seen=seen))
    assert exc.value.code == "REDIRECT_NOT_ALLOWED"
    assert len(seen) == 1  # no se siguió la redirección


def test_demasiadas_redirecciones_da_error():
    chain = {f"https://goo.gl/{i}": f"https://goo.gl/{i + 1}" for i in range(10)}
    with pytest.raises(ReviewLinkError) as exc:
        expand_url("https://goo.gl/0", transport=redirects(chain))
    assert exc.value.code == "TOO_MANY_REDIRECTS"


def test_google_no_responde_da_502():
    def fail(request):
        raise httpx.ConnectTimeout("timeout", request=request)

    with pytest.raises(ReviewLinkError) as exc:
        expand_url(SHORT, transport=httpx.MockTransport(fail))
    assert exc.value.status_code == 502


# ---------------------------------------------------------------- enlace oficial (override)
@pytest.mark.parametrize("url", [
    OVERRIDE,
    "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
    REVIEW,
])
def test_override_acepta_hosts_oficiales(url):
    assert normalize_google_review_url(url) == url


def test_override_normaliza_place_id_y_vacio_es_null():
    assert normalize_google_review_url(" ChIJabc_123 ") == (
        "https://search.google.com/local/writereview?placeid=ChIJabc_123"
    )
    assert normalize_google_review_url("") is None and normalize_google_review_url(None) is None


@pytest.mark.parametrize("url", [
    "http://g.page/r/abc/review",
    "javascript:alert(1)",
    "https://maps.app.goo.gl/abc",               # no es un host de reseñas
    "https://g.page.evil.com/r/abc",
    "https://www.google.com.evil.com/x",
    "https://g.page@evil.com/r/abc",
])
def test_override_rechaza_enlaces_no_validos(url):
    with pytest.raises(InvalidGoogleReviewUrlError):
        normalize_google_review_url(url)


# ---------------------------------------------------------------- endpoints (admin)
@pytest.fixture
def resto(make_restaurant):
    return make_restaurant("chifa-taiwan")


def test_resolve_devuelve_el_enlace_sin_guardar(client, admin_headers, resto, mock_google):
    r = client.post(f"{BASE}/google-review/resolve", headers=admin_headers, json={"maps_url": SHORT})
    assert r.status_code == 200
    assert r.json() == {"nombre": "Chifa Taiwan", "ftid": FTID, "review_url": REVIEW}
    assert client.get(f"{BASE}/restaurants/{resto.id}/google-review", headers=admin_headers).json()[
        "google_review_url"
    ] is None


def test_resolve_errores_422_y_502(client, admin_headers, mock_google):
    url = f"{BASE}/google-review/resolve"
    r = client.post(url, headers=admin_headers, json={"maps_url": "https://evil.com/x"})
    assert r.status_code == 422 and r.json()["detail"]["code"] == "HOST_NOT_ALLOWED"
    r = client.post(url, headers=admin_headers, json={"maps_url": "https://www.google.com/maps/place/X"})
    assert r.status_code == 422 and r.json()["detail"]["code"] == "PLACE_ID_NOT_FOUND"

    def fail(request):
        raise httpx.ConnectError("sin red", request=request)

    mock_google["transport"] = httpx.MockTransport(fail)
    r = client.post(url, headers=admin_headers, json={"maps_url": SHORT})
    assert r.status_code == 502 and r.json()["detail"]["code"] == "GOOGLE_UNAVAILABLE"


def test_put_resuelve_en_el_servidor_y_get_devuelve_los_4_campos(client, admin_headers, resto, mock_google):
    url = f"{BASE}/restaurants/{resto.id}/google-review"
    # Un review_url enviado por el cliente se ignora
    r = client.put(url, headers=admin_headers,
                   json={"google_maps_url": SHORT, "google_review_url": "https://evil.com"})
    assert r.status_code == 200
    assert r.json() == {
        "google_maps_url": SHORT,
        "google_place_ftid": FTID,
        "google_review_url": REVIEW,
        "google_review_url_override": None,
    }
    assert client.get(url, headers=admin_headers).json()["google_review_url"] == REVIEW


def test_put_no_vuelve_a_llamar_a_google_si_el_enlace_no_cambio(client, admin_headers, resto, mock_google):
    url = f"{BASE}/restaurants/{resto.id}/google-review"
    client.put(url, headers=admin_headers, json={"google_maps_url": SHORT})
    with mock.patch.object(google_reviews, "resolve_review_link", side_effect=AssertionError("no")):
        r = client.put(url, headers=admin_headers,
                       json={"google_maps_url": SHORT, "google_review_url_override": OVERRIDE})
    assert r.status_code == 200 and r.json()["google_review_url_override"] == OVERRIDE


def test_guardar_sin_cambiar_el_enlace_regenera_el_formato_desde_el_ftid(client, admin_headers, resto, db):
    # Un enlace guardado con el formato anterior (search?q=...#lrd=) se actualiza al guardar
    resto.google_maps_url = LONG
    resto.google_place_ftid = FTID
    resto.google_review_url = "https://www.google.com/search?q=Chifa+Taiwan#lrd=" + FTID + ",3,,,,"
    db.commit()
    with mock.patch.object(google_reviews, "resolve_review_link", side_effect=AssertionError("sin red")):
        r = client.put(f"{BASE}/restaurants/{resto.id}/google-review", headers=admin_headers,
                       json={"google_maps_url": LONG})
    assert r.status_code == 200 and r.json()["google_review_url"] == REVIEW


def test_put_valida_el_override(client, admin_headers, resto):
    url = f"{BASE}/restaurants/{resto.id}/google-review"
    r = client.put(url, headers=admin_headers, json={"google_review_url_override": "https://evil.com/r"})
    assert r.status_code == 422 and "enlace oficial de reseñas" in r.text


def test_put_con_ambos_null_quita_el_enlace(client, admin_headers, resto, mock_google):
    url = f"{BASE}/restaurants/{resto.id}/google-review"
    client.put(url, headers=admin_headers, json={"google_maps_url": SHORT, "google_review_url_override": OVERRIDE})
    r = client.put(url, headers=admin_headers, json={"google_maps_url": None, "google_review_url_override": None})
    assert r.status_code == 200
    assert r.json() == {
        "google_maps_url": None,
        "google_place_ftid": None,
        "google_review_url": None,
        "google_review_url_override": None,
    }


def test_put_404_si_el_restaurante_no_existe(client, admin_headers):
    r = client.get(f"{BASE}/restaurants/00000000-0000-0000-0000-000000000000/google-review", headers=admin_headers)
    assert r.status_code == 404


# ---------------------------------------------------------------- permisos
def test_un_no_admin_recibe_403_en_todos_los_endpoints(client, owner_headers, owner_user, make_membership, resto):
    make_membership(owner_user, resto.id)  # aunque sea su propio restaurante
    url = f"{BASE}/restaurants/{resto.id}/google-review"
    assert client.post(f"{BASE}/google-review/resolve", headers=owner_headers, json={"maps_url": LONG}).status_code == 403
    assert client.get(url, headers=owner_headers).status_code == 403
    assert client.put(url, headers=owner_headers, json={"google_maps_url": LONG}).status_code == 403


def test_sin_sesion_recibe_401(client, resto):
    assert client.post(f"{BASE}/google-review/resolve", json={"maps_url": LONG}).status_code == 401
    assert client.get(f"{BASE}/restaurants/{resto.id}/google-review").status_code == 401


def test_el_put_general_del_restaurante_ignora_los_campos_de_resena(client, admin_headers, resto, mock_google):
    client.put(f"{BASE}/restaurants/{resto.id}/google-review", headers=admin_headers, json={"google_maps_url": SHORT})
    r = client.put(f"{BASE}/restaurants/{resto.id}", headers=admin_headers, json={
        "name": "Otro nombre",
        "google_review_url": "https://evil.com",
        "google_review_url_override": "https://evil.com",
        "google_maps_url": "https://evil.com",
    })
    assert r.status_code == 200
    # La respuesta general no expone los campos de reseña (un dueño también la lee)
    assert not any(k.startswith("google_") for k in r.json())
    settings = client.get(f"{BASE}/restaurants/{resto.id}/google-review", headers=admin_headers).json()
    assert settings["google_review_url"] == REVIEW and settings["google_review_url_override"] is None


def test_el_dueno_no_ve_los_campos_de_resena_de_su_restaurante(
    client, admin_headers, owner_headers, owner_user, make_membership, resto, mock_google
):
    make_membership(owner_user, resto.id)
    client.put(f"{BASE}/restaurants/{resto.id}/google-review", headers=admin_headers, json={"google_maps_url": SHORT})
    body = client.get(f"{BASE}/restaurants/{resto.id}", headers=owner_headers).json()
    assert not any(k.startswith("google_") for k in body)


# ---------------------------------------------------------------- carta pública
def _publish(client, admin_headers, rid):
    assert client.put(f"{BASE}/restaurants/{rid}", headers=admin_headers, json={"is_published": True}).status_code == 200


def test_la_carta_publica_expone_solo_review_url_con_prioridad_del_override(
    client, admin_headers, resto, mock_google
):
    public = f"/api/v1/public/restaurants/{resto.slug}"
    url = f"{BASE}/restaurants/{resto.id}/google-review"
    _publish(client, admin_headers, resto.id)
    assert client.get(public).json()["review_url"] is None

    client.put(url, headers=admin_headers, json={"google_maps_url": SHORT})
    body = client.get(public).json()
    assert body["review_url"] == REVIEW
    assert not any(k.startswith("google_") for k in body)

    client.put(url, headers=admin_headers, json={"google_review_url_override": OVERRIDE})
    assert client.get(public).json()["review_url"] == OVERRIDE

    client.put(url, headers=admin_headers, json={"google_maps_url": None, "google_review_url_override": None})
    assert client.get(public).json()["review_url"] is None


def test_la_carta_publica_no_llama_a_google(client, admin_headers, resto, monkeypatch):
    _publish(client, admin_headers, resto.id)
    monkeypatch.setattr(google_reviews.httpx, "Client", mock.Mock(side_effect=AssertionError("sin red")))
    assert client.get(f"/api/v1/public/restaurants/{resto.slug}").status_code == 200


def test_loyalty_publico_incluye_min_hours_between_visits(client, admin_headers, resto):
    _publish(client, admin_headers, resto.id)
    program = {
        "is_active": True,
        "visits_required": 5,
        "min_hours_between_visits": 6,
        "reward_description": "Postre gratis",
    }
    r = client.put(f"{BASE}/restaurants/{resto.id}/loyalty/program", headers=admin_headers, json=program)
    assert r.status_code == 200, r.text
    loyalty = client.get(f"/api/v1/public/restaurants/{resto.slug}").json()["loyalty"]
    assert loyalty == {"visits_required": 5, "reward_description": "Postre gratis", "min_hours_between_visits": 6}

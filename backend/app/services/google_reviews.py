"""Enlace para dejar reseñas en Google a partir del enlace de Google Maps de un local.

Solo lo usa el admin (resolver y guardar). La carta pública nunca llama a Google: lee el
enlace ya guardado.

Flujo:
1. expand_url: si es un enlace corto (maps.app.goo.gl, goo.gl), sigue las redirecciones
   validando cada salto contra los hosts de Google (protección SSRF, máximo 5 saltos).
   Si termina en consent.google.com, usa su parámetro `continue`.
2. parse_maps_url: extrae el ftid (`?ftid=` o `0x...:0x...` dentro de `data=`) y el nombre.
3. build_review_link: https://search.google.com/local/writereview?placeid={place_id}, que abre
   directamente la ventana para escribir la reseña del local exacto.

   El Place ID ("ChIJ...") se calcula a partir del ftid sin llamar a Google: es el base64url de
   un mensaje protobuf con las dos mitades del ftid como fixed64 (0a 12 | 09 <hi> | 11 <lo>).
   Verificado con el ejemplo de la documentación de Google: ChIJN1t_tDeuEmsRUsoyG83frY4 ↔
   0x6b12ae37b47f5b37:0x8eaddfcd1b32ca52. El formato no está documentado oficialmente; si
   Google lo cambiara, el admin puede pegar el enlace oficial del Perfil de Empresa (override).

   Formatos descartados: search?q={nombre}#lrd={ftid},3 (con locales homónimos Google muestra
   una lista y no abre la reseña) y maps?cid= (lleva a la ficha, pero no abre la reseña).
"""
import base64
import re
import struct
from typing import Optional, Tuple
from urllib.parse import parse_qs, unquote_plus, urljoin, urlsplit

import httpx

# Hosts aceptados como entrada (lo que pega el admin)
ALLOWED_INPUT_HOSTS = {
    "maps.app.goo.gl",
    "goo.gl",
    "google.com",
    "www.google.com",
    "maps.google.com",
    "google.com.pe",
    "www.google.com.pe",
}
SHORT_LINK_HOSTS = {"maps.app.goo.gl", "goo.gl"}
CONSENT_HOST = "consent.google.com"
MAX_REDIRECTS = 5
TIMEOUT_SECONDS = 10.0

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-PE,es;q=0.9",
}

FTID_RE = re.compile(r"0x[0-9a-fA-F]+:0x[0-9a-fA-F]+")
PLACE_NAME_RE = re.compile(r"/maps/place/([^/@]+)")


class ReviewLinkError(Exception):
    """Error al obtener el enlace de reseñas. `status_code` es 422 (enlace) o 502 (Google)."""

    def __init__(self, message: str, *, code: str = "INVALID_MAPS_URL", status_code: int = 422):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _host(url: str) -> str:
    try:
        return (urlsplit(url).hostname or "").lower()
    except ValueError:
        return ""


def _is_google_redirect_host(host: str) -> bool:
    return (
        host in {"goo.gl", "maps.app.goo.gl", "google.com", "google.com.pe"}
        or host.endswith(".google.com")
        or host.endswith(".google.com.pe")
    )


def _validate_input_url(url: str) -> str:
    value = (url or "").strip()
    if not value:
        raise ReviewLinkError("Pega el enlace de Google Maps del local")
    try:
        parts = urlsplit(value)
        port = parts.port
    except ValueError:
        raise ReviewLinkError("El enlace no es válido")
    host = (parts.hostname or "").lower()
    if parts.scheme.lower() != "https" or parts.username or parts.password or port not in (None, 443):
        raise ReviewLinkError("El enlace debe empezar con https:// y ser de Google Maps")
    if host not in ALLOWED_INPUT_HOSTS:
        raise ReviewLinkError(
            "Solo se aceptan enlaces de Google Maps (maps.app.goo.gl, goo.gl o google.com/maps)",
            code="HOST_NOT_ALLOWED",
        )
    return value


def _validate_redirect(url: str) -> str:
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        raise ReviewLinkError("Google devolvió una redirección no válida", code="REDIRECT_NOT_ALLOWED")
    host = (parts.hostname or "").lower()
    if (
        parts.scheme.lower() != "https"
        or parts.username
        or parts.password
        or port not in (None, 443)
        or not _is_google_redirect_host(host)
    ):
        raise ReviewLinkError(
            "El enlace redirige fuera de Google; no se puede usar", code="REDIRECT_NOT_ALLOWED"
        )
    return url


def _from_consent(url: str) -> str:
    """Si la URL es la pantalla de consentimiento de Google, devuelve su `continue`."""
    if _host(url) != CONSENT_HOST:
        return url
    target = parse_qs(urlsplit(url).query).get("continue", [None])[0]
    if not target:
        raise ReviewLinkError("Google pidió un consentimiento y no se encontró el enlace real")
    return _validate_redirect(target)


def expand_url(url: str, *, transport: Optional[httpx.BaseTransport] = None) -> str:
    """Devuelve la URL larga. Los enlaces que no son cortos se devuelven tal cual."""
    current = _validate_input_url(url)
    if _host(current) not in SHORT_LINK_HOSTS:
        return _from_consent(current)

    try:
        with httpx.Client(
            transport=transport,
            timeout=TIMEOUT_SECONDS,
            follow_redirects=False,
            headers=REQUEST_HEADERS,
        ) as client:
            for _ in range(MAX_REDIRECTS + 1):
                # stream: solo interesan los encabezados, no el HTML de la página
                with client.stream("GET", current) as response:
                    location = response.headers.get("location")
                    is_redirect = response.is_redirect and location
                    status_code = response.status_code
                if not is_redirect:
                    if status_code >= 500:
                        raise ReviewLinkError(
                            "Google no respondió correctamente. Intenta de nuevo en unos minutos",
                            code="GOOGLE_UNAVAILABLE",
                            status_code=502,
                        )
                    return _from_consent(current)
                current = _validate_redirect(urljoin(current, location))
                if _host(current) == CONSENT_HOST:
                    return _from_consent(current)
    except httpx.HTTPError:
        raise ReviewLinkError(
            "No se pudo contactar a Google. Intenta de nuevo en unos minutos",
            code="GOOGLE_UNAVAILABLE",
            status_code=502,
        )
    raise ReviewLinkError("El enlace redirige demasiadas veces", code="TOO_MANY_REDIRECTS")


def parse_maps_url(url: str) -> Tuple[str, Optional[str]]:
    """Extrae (ftid, nombre) de una URL larga de Google Maps. El nombre es opcional."""
    ftid = None
    for value in parse_qs(urlsplit(url).query).get("ftid", []):
        if FTID_RE.fullmatch(value.strip()):
            ftid = value.strip()
            break

    decoded = unquote_plus(url)
    if ftid is None:
        match = FTID_RE.search(decoded)
        if match:
            ftid = match.group(0)
    if ftid is None:
        raise ReviewLinkError(
            "El enlace no tiene el ID del lugar. Copia el enlace desde la ficha del local en "
            "Google Maps (Compartir → Copiar enlace)",
            code="PLACE_ID_NOT_FOUND",
        )

    name_match = PLACE_NAME_RE.search(decoded)
    name = name_match.group(1).replace("+", " ").strip() if name_match else None
    return ftid.lower(), (name or None)


def ftid_to_place_id(ftid: str) -> str:
    """Convierte "0x<hi>:0x<lo>" en el Place ID "ChIJ..." equivalente (sin red)."""
    try:
        hi, lo = (int(part, 16) for part in ftid.split(":"))
        raw = b"\x0a\x12\x09" + struct.pack("<Q", hi) + b"\x11" + struct.pack("<Q", lo)
    except (ValueError, struct.error):
        raise ReviewLinkError("El ID del lugar no es válido", code="PLACE_ID_NOT_FOUND")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def build_review_link(ftid: str, nombre: Optional[str] = None) -> str:
    """Enlace que abre directo la ventana de reseña del local. `nombre` no se usa."""
    return f"https://search.google.com/local/writereview?placeid={ftid_to_place_id(ftid)}"


def resolve_review_link(maps_url: str, *, transport: Optional[httpx.BaseTransport] = None) -> dict:
    long_url = expand_url(maps_url, transport=transport)
    ftid, nombre = parse_maps_url(long_url)
    return {"nombre": nombre, "ftid": ftid, "review_url": build_review_link(ftid, nombre)}

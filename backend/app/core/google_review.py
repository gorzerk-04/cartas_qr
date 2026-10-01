"""Validación del enlace de reseñas de Google (D16, T5.2).

Se acepta:
- una URL https cuyo host esté en ALLOWED_HOSTS (google.com y www.google.com solo con
  una ruta que empiece con /maps);
- un Place ID suelto ("ChIJ..."), que se normaliza a la página para escribir reseñas.

El host se compara exacto con urllib.parse: "google.com.evil.com" o "g.page.evil.com"
no pasan. Una cadena vacía o None se guarda como None (quita el botón de la carta).
"""
import re
from typing import Optional
from urllib.parse import urlsplit

MAX_LENGTH = 500

ALLOWED_HOSTS = {
    "g.page",
    "search.google.com",
    "maps.app.goo.gl",
    "maps.google.com",
    "google.com",
    "www.google.com",
}
# En estos dos hosts solo se aceptan rutas de Maps
MAPS_ONLY_HOSTS = {"google.com", "www.google.com"}

PLACE_ID_RE = re.compile(r"^ChIJ[A-Za-z0-9_-]+$")
WRITE_REVIEW_URL = "https://search.google.com/local/writereview?placeid={}"

INVALID_MESSAGE = (
    "El enlace de reseñas debe ser un enlace https de Google (g.page, search.google.com, "
    "maps.app.goo.gl o Google Maps) o un Place ID que empiece con ChIJ"
)


class InvalidGoogleReviewUrlError(ValueError):
    pass


def normalize_google_review_url(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    value = raw.strip()
    if not value:
        return None

    too_long = f"El enlace de reseñas admite hasta {MAX_LENGTH} caracteres"
    if PLACE_ID_RE.match(value):
        url = WRITE_REVIEW_URL.format(value)
        if len(url) > MAX_LENGTH:
            raise InvalidGoogleReviewUrlError(too_long)
        return url

    if len(value) > MAX_LENGTH:
        raise InvalidGoogleReviewUrlError(too_long)
    if any(ch.isspace() for ch in value):
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)

    try:
        parts = urlsplit(value)
        host = (parts.hostname or "").lower()
        port = parts.port
    except ValueError:
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)

    if parts.scheme.lower() != "https":
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)
    # Sin usuario/contraseña ni puertos raros ("https://g.page@evil.com" tiene host evil.com,
    # pero se rechaza igual para no mostrar enlaces engañosos)
    if parts.username is not None or parts.password is not None or port not in (None, 443):
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)
    if host not in ALLOWED_HOSTS:
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)
    if host in MAPS_ONLY_HOSTS and not parts.path.startswith("/maps"):
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)
    return value

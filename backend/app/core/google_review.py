"""Validación del enlace oficial de reseñas (`google_review_url_override`).

Es el enlace del Perfil de Empresa de Google ("Pedir reseñas", https://g.page/r/.../review),
que funciona mejor en celulares que el generado desde Google Maps.

Se acepta:
- una URL https cuyo host sea exactamente g.page, search.google.com o www.google.com;
- un Place ID suelto ("ChIJ..."), que se normaliza a la página para escribir reseñas.

El host se compara exacto con urllib.parse: "g.page.evil.com" o "www.google.com.evil.com"
no pasan. Una cadena vacía o None se guarda como None.
"""
import re
from typing import Optional
from urllib.parse import urlsplit

MAX_LENGTH = 500

ALLOWED_HOSTS = {"g.page", "search.google.com", "www.google.com"}

PLACE_ID_RE = re.compile(r"^ChIJ[A-Za-z0-9_-]+$")
WRITE_REVIEW_URL = "https://search.google.com/local/writereview?placeid={}"

INVALID_MESSAGE = (
    "El enlace oficial de reseñas debe ser un enlace https de g.page, search.google.com "
    "o www.google.com (o un Place ID que empiece con ChIJ)"
)


class InvalidGoogleReviewUrlError(ValueError):
    pass


def normalize_google_review_url(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    value = raw.strip()
    if not value:
        return None

    too_long = f"El enlace oficial de reseñas admite hasta {MAX_LENGTH} caracteres"
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
    # Sin usuario/contraseña ni puertos raros: "https://g.page@evil.com" lleva a evil.com
    if parts.username is not None or parts.password is not None or port not in (None, 443):
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)
    if host not in ALLOWED_HOSTS:
        raise InvalidGoogleReviewUrlError(INVALID_MESSAGE)
    return value

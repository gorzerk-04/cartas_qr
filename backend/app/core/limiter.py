from slowapi import Limiter
from slowapi.util import get_remote_address

# Única protección de los endpoints públicos del MVP (sin auth) — FASE 4 §4.
limiter = Limiter(key_func=get_remote_address)

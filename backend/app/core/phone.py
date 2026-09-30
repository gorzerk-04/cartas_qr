"""Normalización de celulares a E.164 (D5).

- Sin prefijo "+": solo celulares peruanos. Acepta `987654321`, `987 654 321` y
  `51987654321`; se normaliza a `+51987654321`.
- Con "+": si es peruano (+51) debe tener 9 dígitos que empiecen con 9; cualquier otro
  país se acepta como E.164 genérico (8 a 15 dígitos, sin empezar en 0).
"""
import re

_SEPARATORS = re.compile(r"[\s\-\.\(\)]")


class InvalidPhoneError(ValueError):
    pass


def normalize_phone(raw: str) -> str:
    if raw is None:
        raise InvalidPhoneError("El celular es obligatorio")
    value = _SEPARATORS.sub("", raw.strip())
    if not value:
        raise InvalidPhoneError("El celular es obligatorio")

    if value.startswith("+"):
        digits = value[1:]
        if not digits.isdigit():
            raise InvalidPhoneError("El celular solo puede contener dígitos")
        if digits.startswith("51"):
            national = digits[2:]
            if len(national) != 9 or not national.startswith("9"):
                raise InvalidPhoneError("Un celular peruano debe tener 9 dígitos y empezar con 9")
            return f"+{digits}"
        if not (8 <= len(digits) <= 15) or digits.startswith("0"):
            raise InvalidPhoneError("Número internacional inválido")
        return f"+{digits}"

    if not value.isdigit():
        raise InvalidPhoneError("El celular solo puede contener dígitos")
    if len(value) == 9 and value.startswith("9"):
        return f"+51{value}"
    if len(value) == 11 and value.startswith("519"):
        return f"+{value}"
    raise InvalidPhoneError(
        "Celular inválido: usa 9 dígitos que empiecen con 9 (o el formato internacional con +)"
    )

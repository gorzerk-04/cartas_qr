from fastapi import HTTPException


def api_error(status_code: int, code: str, message: str, **extra) -> HTTPException:
    """Error con código identificable: `detail = {"code", "message", ...extra}`.

    Sigue el formato `{"detail": ...}` del resto de la API; el frontend lee `detail.code`
    para decidir el mensaje (ver frontend/src/lib/api-error.ts).
    """
    return HTTPException(status_code=status_code, detail={"code": code, "message": message, **extra})

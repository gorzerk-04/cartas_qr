"""Los modelos deben poder importarse de forma aislada (como hacen seed.py y scripts/).

app.main importa todos los modelos, así que los tests de la API no detectan un
relationship() que dependa de un modelo que nadie importó. Este test lo hace en un
proceso limpio.
"""
import os
import subprocess
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _run(code: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-c", code], cwd=BACKEND_DIR, capture_output=True, text=True, timeout=60
    )


def test_importar_solo_user_configura_los_mapeos():
    result = _run(
        "from app.models.user import User\n"
        "from sqlalchemy.orm import configure_mappers\n"
        "configure_mappers()\n"
    )
    assert result.returncode == 0, result.stderr[-800:]

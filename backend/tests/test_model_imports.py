"""Los modelos deben poder importarse de forma aislada (como hacen seed.py y scripts/).

app.main importa todos los modelos, así que los tests de la API no detectan un
relationship() que dependa de un modelo que nadie importó. Estos tests lo hacen en un
proceso limpio por cada caso.
"""
import os
import subprocess
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CONFIGURE = "from sqlalchemy.orm import configure_mappers\nconfigure_mappers()\n"


def _run(code: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-c", code], cwd=BACKEND_DIR, capture_output=True, text=True, timeout=60
    )


def test_importar_solo_user_configura_los_mapeos():
    result = _run("from app.models.user import User\n" + CONFIGURE)
    assert result.returncode == 0, result.stderr[-800:]


def test_importar_cualquier_modelo_aislado_configura_los_mapeos():
    # Cada modelo en un proceso limpio: ninguno debe depender de que otro se haya importado antes
    for module, name in (
        ("user", "User"),
        ("restaurant", "Restaurant"),
        ("product", "Product"),
        ("category", "Category"),
        ("restaurant_member", "RestaurantMember"),
        ("restaurant_customer", "RestaurantCustomer"),
        ("loyalty", "LoyaltyProgram"),
        ("operating_hour", "OperatingHour"),
        ("restaurant_social", "RestaurantSocial"),
    ):
        result = _run(f"from app.models.{module} import {name}\n" + CONFIGURE)
        assert result.returncode == 0, f"{module}: {result.stderr[-600:]}"


def test_los_servicios_de_fidelizacion_se_importan_aislados():
    # Es lo que hace scripts/seed_e2e.py al importar app.services.loyalty
    result = _run("import app.services.loyalty\n" + CONFIGURE)
    assert result.returncode == 0, result.stderr[-800:]

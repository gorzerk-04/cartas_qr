"""Canjes simultáneos (Fase 3). Solo Postgres: necesita bloqueo de fila real (FOR UPDATE)."""
import threading
import time
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from app.core.database import Base
from app.core.security import get_password_hash
from app.models.loyalty import LoyaltyProgram, LoyaltyRedemption, LoyaltyVisit
from app.models.restaurant import Restaurant
from app.models.restaurant_customer import RestaurantCustomer
from app.models.user import User, UserRole
from app.services.loyalty import LoyaltyService, loyalty_service
from tests.conftest import TestingSessionLocal, engine

pytestmark = pytest.mark.skipif(
    engine.dialect.name == "sqlite",
    reason="Requiere Postgres (TEST_DATABASE_URL): SQLite no soporta bloqueo de filas",
)


def test_dos_canjes_simultaneos_producen_un_exito_y_un_409(monkeypatch):
    Base.metadata.create_all(bind=engine)
    setup = TestingSessionLocal()
    try:
        user = User(email="c@example.com", username="concurrente", hashed_password=get_password_hash("x"),
                    role=UserRole.PLATFORM_ADMIN)
        restaurant = Restaurant(name="Resto", slug="resto-concurrente")
        setup.add_all([user, restaurant])
        setup.commit()
        program = LoyaltyProgram(restaurant_id=restaurant.id, is_active=True, visits_required=2,
                                 reward_description="Postre", min_hours_between_visits=0,
                                 consent_text="texto", consent_version=1)
        customer = RestaurantCustomer(restaurant_id=restaurant.id, full_name="Ana", phone="+51987654321",
                                      consent_given_at=datetime.utcnow(), consent_version=1)
        setup.add_all([program, customer])
        setup.commit()
        for i in range(2):  # saldo exactamente igual a la meta
            setup.add(LoyaltyVisit(restaurant_id=restaurant.id, customer_id=customer.id,
                                   visited_at=datetime.utcnow() - timedelta(days=i + 1)))
        setup.commit()
        ids = (restaurant.id, customer.id, user.id)
    finally:
        setup.close()

    # Fuerza el solapamiento: la lectura de visitas elegibles tarda, así que sin bloqueo
    # ambos hilos verían saldo 2 y crearían un canje cada uno.
    original = LoyaltyService.eligible_visits

    def slow_eligible(self, *args, **kwargs):
        result = original(self, *args, **kwargs)
        time.sleep(0.5)
        return result

    monkeypatch.setattr(LoyaltyService, "eligible_visits", slow_eligible)

    outcomes = []
    barrier = threading.Barrier(2)

    def worker():
        session = TestingSessionLocal()
        try:
            restaurant = session.get(Restaurant, ids[0])
            user = session.get(User, ids[2])
            barrier.wait()
            try:
                redemption = loyalty_service.redeem(session, restaurant, ids[1], user)
                outcomes.append(("ok", redemption.id))
            except HTTPException as exc:
                outcomes.append((exc.status_code, exc.detail["code"]))
        finally:
            session.close()

    try:
        threads = [threading.Thread(target=worker) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=30)

        kinds = sorted(str(o[0]) for o in outcomes)
        assert kinds == ["409", "ok"], outcomes
        assert [o for o in outcomes if o[0] == 409][0][1] == "INSUFFICIENT_VISITS"

        check = TestingSessionLocal()
        try:
            assert check.query(LoyaltyRedemption).count() == 1
            consumed = check.query(LoyaltyVisit).filter(LoyaltyVisit.redemption_id != None).count()
            assert consumed == 2
        finally:
            check.close()
    finally:
        Base.metadata.drop_all(bind=engine)

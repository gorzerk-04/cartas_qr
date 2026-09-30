import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from uuid import UUID
from fastapi import status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.core.errors import api_error
from app.models.loyalty import LoyaltyProgram, LoyaltyRedemption, LoyaltyVisit
from app.models.product import Product
from app.models.restaurant import Restaurant
from app.models.restaurant_customer import RestaurantCustomer
from app.models.user import User
from app.repositories.loyalty import loyalty_program_repository
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.schemas.loyalty import (
    CheckInRequest,
    CheckInResponse,
    ProgramUpsert,
    VisitResponse,
)
from app.services.customers import customer_service, parse_phone

DEFAULT_CONSENT = (
    "Acepto que {restaurant} guarde mi nombre y número de celular para registrar mis visitas "
    "en su programa de fidelización. Puedo pedir que los borren en cualquier momento."
)


def _now(now: Optional[datetime]) -> datetime:
    # Las fechas del backend son UTC naive (igual que created_at/updated_at del AuditMixin)
    return now or datetime.utcnow()


def default_consent_text(restaurant_name: str) -> str:
    return DEFAULT_CONSENT.format(restaurant=restaurant_name)[:500]


class LoyaltyService:
    # ------------------------------------------------------------------ programa
    def get_program(self, db: Session, restaurant_id: UUID) -> Optional[LoyaltyProgram]:
        return loyalty_program_repository.get_by_restaurant(db, restaurant_id)

    def upsert_program(self, db: Session, restaurant: Restaurant, data: ProgramUpsert) -> LoyaltyProgram:
        if data.reward_product_id is not None:
            product = (
                db.query(Product)
                .filter(
                    Product.id == data.reward_product_id,
                    Product.restaurant_id == restaurant.id,
                    Product.deleted_at == None,
                )
                .first()
            )
            if product is None:
                raise api_error(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "INVALID_REWARD_PRODUCT",
                    "El producto de la recompensa debe pertenecer a este restaurante",
                )

        fields = {
            "is_active": data.is_active,
            "visits_required": data.visits_required,
            "reward_description": data.reward_description.strip(),
            "reward_product_id": data.reward_product_id,
            "min_hours_between_visits": data.min_hours_between_visits,
            "visits_expire_after_days": data.visits_expire_after_days,
        }
        program = self.get_program(db, restaurant.id)
        if program is None:
            fields["consent_text"] = data.consent_text or default_consent_text(restaurant.name)
            fields["consent_version"] = 1
            fields["restaurant_id"] = restaurant.id
            return loyalty_program_repository.create(db, obj_in=fields)

        new_text = data.consent_text if data.consent_text is not None else program.consent_text
        fields["consent_text"] = new_text
        if new_text != program.consent_text:
            fields["consent_version"] = program.consent_version + 1
        return loyalty_program_repository.update(db, db_obj=program, obj_in=fields)

    def require_active_program(self, db: Session, restaurant_id: UUID) -> LoyaltyProgram:
        program = self.get_program(db, restaurant_id)
        if program is None or not program.is_active:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "LOYALTY_PROGRAM_INACTIVE",
                "El programa de fidelización no está activo en este restaurante",
            )
        return program

    # ------------------------------------------------------------------ saldo
    @staticmethod
    def _expiry_cutoff(program: Optional[LoyaltyProgram], now: datetime) -> Optional[datetime]:
        if program is not None and program.visits_expire_after_days:
            return now - timedelta(days=program.visits_expire_after_days)
        return None

    def eligible_visits(
        self, db: Session, customer_id: UUID, program: Optional[LoyaltyProgram], now: datetime
    ) -> List[LoyaltyVisit]:
        """Visitas elegibles, de la más antigua a la más nueva (orden FIFO).

        Elegible = no anulada, no consumida por un canje y, si el programa vence, dentro del plazo.
        """
        query = db.query(LoyaltyVisit).filter(
            LoyaltyVisit.customer_id == customer_id,
            LoyaltyVisit.voided_at == None,
            LoyaltyVisit.redemption_id == None,
        )
        cutoff = self._expiry_cutoff(program, now)
        if cutoff is not None:
            query = query.filter(LoyaltyVisit.visited_at >= cutoff)
        return query.order_by(LoyaltyVisit.visited_at.asc(), LoyaltyVisit.id.asc()).all()

    def balance(self, db: Session, customer_id: UUID, program: Optional[LoyaltyProgram], now: Optional[datetime] = None) -> int:
        return len(self.eligible_visits(db, customer_id, program, _now(now)))

    @staticmethod
    def reward_available(program: Optional[LoyaltyProgram], balance: int) -> bool:
        return bool(program and program.is_active and balance >= program.visits_required)

    @staticmethod
    def visit_status(visit: LoyaltyVisit, program: Optional[LoyaltyProgram], now: datetime) -> str:
        if visit.voided_at is not None:
            return "voided"
        if visit.redemption_id is not None:
            return "redeemed"
        cutoff = LoyaltyService._expiry_cutoff(program, now)
        if cutoff is not None and visit.visited_at < cutoff:
            return "expired"
        return "valid"

    # ------------------------------------------------------------------ presentación
    def visit_response(
        self, visit: LoyaltyVisit, program: Optional[LoyaltyProgram], now: datetime, username: Optional[str] = None
    ) -> VisitResponse:
        return VisitResponse(
            id=visit.id,
            customer_id=visit.customer_id,
            visited_at=visit.visited_at,
            registered_by_user_id=visit.registered_by_user_id,
            registered_by_username=username,
            redemption_id=visit.redemption_id,
            voided_at=visit.voided_at,
            void_reason=visit.void_reason,
            status=self.visit_status(visit, program, now),
        )

    def customer_response(
        self, db: Session, customer: RestaurantCustomer, program: Optional[LoyaltyProgram], now: Optional[datetime] = None
    ) -> CustomerResponse:
        now = _now(now)
        balance = self.balance(db, customer.id, program, now)
        last_visit = (
            db.query(func.max(LoyaltyVisit.visited_at))
            .filter(LoyaltyVisit.customer_id == customer.id, LoyaltyVisit.voided_at == None)
            .scalar()
        )
        data = CustomerResponse.model_validate(customer)
        data.visits_balance = balance
        data.last_visit_at = last_visit
        data.visits_required = program.visits_required if program else None
        data.reward_available = self.reward_available(program, balance)
        return data

    def list_customers(
        self,
        db: Session,
        restaurant_id: UUID,
        *,
        skip: int,
        limit: int,
        search: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> Tuple[List[CustomerResponse], int]:
        now = _now(now)
        program = self.get_program(db, restaurant_id)
        query = db.query(RestaurantCustomer).filter(
            RestaurantCustomer.restaurant_id == restaurant_id, RestaurantCustomer.deleted_at == None
        )
        if search and search.strip():
            conds = [RestaurantCustomer.full_name.ilike(f"%{search.strip()}%")]
            digits = re.sub(r"\D", "", search)
            if digits:
                conds.append(RestaurantCustomer.phone.like(f"%{digits}%"))
            query = query.filter(or_(*conds))
        total = query.count()
        customers = (
            query.order_by(RestaurantCustomer.full_name.asc(), RestaurantCustomer.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        ids = [c.id for c in customers]
        balances: Dict[UUID, int] = {}
        last_visits: Dict[UUID, datetime] = {}
        if ids:
            bal_q = db.query(LoyaltyVisit.customer_id, func.count(LoyaltyVisit.id)).filter(
                LoyaltyVisit.customer_id.in_(ids),
                LoyaltyVisit.voided_at == None,
                LoyaltyVisit.redemption_id == None,
            )
            cutoff = self._expiry_cutoff(program, now)
            if cutoff is not None:
                bal_q = bal_q.filter(LoyaltyVisit.visited_at >= cutoff)
            balances = dict(bal_q.group_by(LoyaltyVisit.customer_id).all())
            last_visits = dict(
                db.query(LoyaltyVisit.customer_id, func.max(LoyaltyVisit.visited_at))
                .filter(LoyaltyVisit.customer_id.in_(ids), LoyaltyVisit.voided_at == None)
                .group_by(LoyaltyVisit.customer_id)
                .all()
            )
        result = []
        for c in customers:
            data = CustomerResponse.model_validate(c)
            data.visits_balance = balances.get(c.id, 0)
            data.last_visit_at = last_visits.get(c.id)
            data.visits_required = program.visits_required if program else None
            data.reward_available = self.reward_available(program, data.visits_balance)
            result.append(data)
        return result, total

    # ------------------------------------------------------------------ visitas
    def _lock_customer(self, db: Session, restaurant_id: UUID, customer_id: UUID) -> RestaurantCustomer:
        """Bloquea la fila del comensal (FOR UPDATE en Postgres; en SQLite no aplica)."""
        customer = (
            db.query(RestaurantCustomer)
            .filter(
                RestaurantCustomer.id == customer_id,
                RestaurantCustomer.restaurant_id == restaurant_id,
                RestaurantCustomer.deleted_at == None,
            )
            .populate_existing()
            .with_for_update()
            .first()
        )
        if customer is None:
            raise api_error(status.HTTP_404_NOT_FOUND, "CUSTOMER_NOT_FOUND", "Comensal no encontrado")
        return customer

    def register_visit(
        self,
        db: Session,
        restaurant: Restaurant,
        customer_id: UUID,
        user: User,
        now: Optional[datetime] = None,
    ) -> Tuple[LoyaltyVisit, LoyaltyProgram]:
        now = _now(now)
        program = self.require_active_program(db, restaurant.id)
        self._lock_customer(db, restaurant.id, customer_id)

        last = (
            db.query(func.max(LoyaltyVisit.visited_at))
            .filter(LoyaltyVisit.customer_id == customer_id, LoyaltyVisit.voided_at == None)
            .scalar()
        )
        if last is not None and program.min_hours_between_visits > 0:
            next_allowed = last + timedelta(hours=program.min_hours_between_visits)
            if now < next_allowed:
                raise api_error(
                    status.HTTP_409_CONFLICT,
                    "VISIT_COOLDOWN",
                    "Este comensal ya registró una visita recientemente",
                    next_allowed_at=next_allowed.isoformat(),
                )

        visit = LoyaltyVisit(
            restaurant_id=restaurant.id,
            customer_id=customer_id,
            visited_at=now,
            registered_by_user_id=user.id,
        )
        db.add(visit)
        db.commit()
        db.refresh(visit)
        return visit, program

    def check_in(
        self,
        db: Session,
        restaurant: Restaurant,
        user: User,
        data: CheckInRequest,
        now: Optional[datetime] = None,
    ) -> CheckInResponse:
        """Flujo rápido de caja: si el celular existe suma una visita; si no, crea al comensal."""
        now = _now(now)
        phone = parse_phone(data.phone)
        program = self.require_active_program(db, restaurant.id)

        customer = customer_service.find_by_phone(db, restaurant.id, phone)
        created = False
        if customer is None:
            name = (data.full_name or "").strip()
            if not name or data.consent is not True:
                raise api_error(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "CUSTOMER_DATA_REQUIRED",
                    "Es un comensal nuevo: se requiere su nombre y su consentimiento",
                )
            customer = customer_service.create(
                db,
                restaurant,
                CustomerCreate(full_name=name, phone=phone, consent=True),
                user,
                now=now,
            )
            created = True

        visit, program = self.register_visit(db, restaurant, customer.id, user, now=now)
        balance = self.balance(db, customer.id, program, now)
        return CheckInResponse(
            customer=self.customer_response(db, customer, program, now),
            visit=self.visit_response(visit, program, now, username=user.username),
            balance=balance,
            visits_required=program.visits_required,
            reward_available=self.reward_available(program, balance),
            customer_created=created,
        )

    def list_visits(
        self, db: Session, restaurant_id: UUID, customer_id: UUID, now: Optional[datetime] = None
    ) -> List[VisitResponse]:
        now = _now(now)
        customer_service.get_or_404(db, restaurant_id, customer_id)
        program = self.get_program(db, restaurant_id)
        rows = (
            db.query(LoyaltyVisit, User.username)
            .outerjoin(User, User.id == LoyaltyVisit.registered_by_user_id)
            .filter(LoyaltyVisit.restaurant_id == restaurant_id, LoyaltyVisit.customer_id == customer_id)
            .order_by(LoyaltyVisit.visited_at.desc(), LoyaltyVisit.id.desc())
            .all()
        )
        return [self.visit_response(v, program, now, username=u) for v, u in rows]

    def void_visit(
        self, db: Session, restaurant_id: UUID, visit_id: UUID, reason: str, user: User, now: Optional[datetime] = None
    ) -> LoyaltyVisit:
        visit = db.query(LoyaltyVisit).filter(LoyaltyVisit.id == visit_id, LoyaltyVisit.deleted_at == None).first()
        if visit is None or visit.restaurant_id != restaurant_id:
            raise api_error(status.HTTP_404_NOT_FOUND, "VISIT_NOT_FOUND", "Visita no encontrada")
        if visit.voided_at is not None:
            raise api_error(status.HTTP_409_CONFLICT, "VISIT_ALREADY_VOIDED", "La visita ya está anulada")
        if visit.redemption_id is not None:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "VISIT_ALREADY_REDEEMED",
                "La visita ya fue consumida por un canje: anula primero el canje",
            )
        visit.voided_at = _now(now)
        visit.voided_by_user_id = user.id
        visit.void_reason = reason.strip()
        db.add(visit)
        db.commit()
        db.refresh(visit)
        return visit

    # ------------------------------------------------------------------ canjes
    def redeem(
        self,
        db: Session,
        restaurant: Restaurant,
        customer_id: UUID,
        user: User,
        now: Optional[datetime] = None,
    ) -> LoyaltyRedemption:
        now = _now(now)
        program = self.require_active_program(db, restaurant.id)
        # 1) bloquear al comensal: dos canjes simultáneos se serializan
        self._lock_customer(db, restaurant.id, customer_id)
        # 2) recontar con el bloqueo tomado
        eligible = self.eligible_visits(db, customer_id, program, now)
        if len(eligible) < program.visits_required:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "INSUFFICIENT_VISITS",
                f"Faltan visitas: tiene {len(eligible)} de {program.visits_required}",
                balance=len(eligible),
                visits_required=program.visits_required,
            )
        # 3) crear el canje con copias de lo vigente
        redemption = LoyaltyRedemption(
            restaurant_id=restaurant.id,
            customer_id=customer_id,
            redeemed_at=now,
            redeemed_by_user_id=user.id,
            visits_consumed=program.visits_required,
            reward_description_snapshot=program.reward_description,
            reward_product_id_snapshot=program.reward_product_id,
        )
        db.add(redemption)
        db.flush()
        # 4) consumir las N visitas elegibles más antiguas (FIFO)
        for visit in eligible[: program.visits_required]:
            visit.redemption_id = redemption.id
            db.add(visit)
        db.commit()
        db.refresh(redemption)
        return redemption

    def list_redemptions(self, db: Session, restaurant_id: UUID, customer_id: UUID) -> List[LoyaltyRedemption]:
        customer_service.get_or_404(db, restaurant_id, customer_id)
        return (
            db.query(LoyaltyRedemption)
            .filter(
                LoyaltyRedemption.restaurant_id == restaurant_id,
                LoyaltyRedemption.customer_id == customer_id,
            )
            .order_by(LoyaltyRedemption.redeemed_at.desc(), LoyaltyRedemption.id.desc())
            .all()
        )

    def void_redemption(
        self, db: Session, restaurant_id: UUID, redemption_id: UUID, reason: str, user: User, now: Optional[datetime] = None
    ) -> LoyaltyRedemption:
        redemption = (
            db.query(LoyaltyRedemption)
            .filter(LoyaltyRedemption.id == redemption_id, LoyaltyRedemption.deleted_at == None)
            .first()
        )
        if redemption is None or redemption.restaurant_id != restaurant_id:
            raise api_error(status.HTTP_404_NOT_FOUND, "REDEMPTION_NOT_FOUND", "Canje no encontrado")
        if redemption.voided_at is not None:
            raise api_error(status.HTTP_409_CONFLICT, "REDEMPTION_ALREADY_VOIDED", "El canje ya está anulado")

        redemption.voided_at = _now(now)
        redemption.voided_by_user_id = user.id
        redemption.void_reason = reason.strip()
        db.add(redemption)
        # Libera las visitas que consumió: vuelven a sumar al saldo
        db.query(LoyaltyVisit).filter(LoyaltyVisit.redemption_id == redemption.id).update(
            {LoyaltyVisit.redemption_id: None}, synchronize_session=False
        )
        db.commit()
        db.refresh(redemption)
        return redemption


loyalty_service = LoyaltyService()

from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import status
from sqlalchemy.orm import Session
from app.core.errors import api_error
from app.core.phone import InvalidPhoneError, normalize_phone
from app.models.restaurant import Restaurant
from app.models.restaurant_customer import RestaurantCustomer
from app.models.user import User
from app.repositories.loyalty import loyalty_program_repository
from app.repositories.restaurant_customer import restaurant_customer_repository
from app.schemas.customer import CustomerCreate, CustomerUpdate

ANONYMIZED_NAME = "Comensal eliminado"


def parse_phone(raw: str) -> str:
    try:
        return normalize_phone(raw)
    except InvalidPhoneError as exc:
        raise api_error(status.HTTP_422_UNPROCESSABLE_ENTITY, "INVALID_PHONE", str(exc))


class CustomerService:
    def get_or_404(self, db: Session, restaurant_id: UUID, customer_id: UUID) -> RestaurantCustomer:
        """Comensal del restaurante (no anonimizado); si no, 404."""
        customer = restaurant_customer_repository.get(db, id=customer_id)
        if not customer or customer.restaurant_id != restaurant_id:
            raise api_error(status.HTTP_404_NOT_FOUND, "CUSTOMER_NOT_FOUND", "Comensal no encontrado")
        return customer

    def find_by_phone(self, db: Session, restaurant_id: UUID, phone: str) -> Optional[RestaurantCustomer]:
        return restaurant_customer_repository.get_by_phone(db, restaurant_id, parse_phone(phone))

    def _ensure_phone_free(self, db: Session, restaurant_id: UUID, phone: str, exclude_id: Optional[UUID] = None) -> None:
        other = restaurant_customer_repository.get_by_phone(db, restaurant_id, phone)
        if other and other.id != exclude_id:
            raise api_error(
                status.HTTP_409_CONFLICT,
                "PHONE_ALREADY_REGISTERED",
                "Ya existe un comensal con ese celular en este restaurante",
            )

    def create(
        self,
        db: Session,
        restaurant: Restaurant,
        obj_in: CustomerCreate,
        user: User,
        now: Optional[datetime] = None,
    ) -> RestaurantCustomer:
        phone = parse_phone(obj_in.phone)
        self._ensure_phone_free(db, restaurant.id, phone)
        program = loyalty_program_repository.get_by_restaurant(db, restaurant.id)
        return restaurant_customer_repository.create(
            db,
            obj_in={
                "restaurant_id": restaurant.id,
                "full_name": obj_in.full_name,
                "phone": phone,
                "email": obj_in.email,
                "notes": obj_in.notes,
                "consent_given_at": now or datetime.utcnow(),
                # Versión del texto de consentimiento que el comensal aceptó
                "consent_version": program.consent_version if program else 1,
                "created_by_user_id": user.id,
            },
        )

    def update(self, db: Session, customer: RestaurantCustomer, obj_in: CustomerUpdate) -> RestaurantCustomer:
        data = obj_in.model_dump(exclude_unset=True)
        if data.get("phone") is not None:
            data["phone"] = parse_phone(data["phone"])
            self._ensure_phone_free(db, customer.restaurant_id, data["phone"], exclude_id=customer.id)
        else:
            data.pop("phone", None)  # el celular es obligatorio: null no lo borra
        if "full_name" in data and data["full_name"] is None:
            data.pop("full_name")
        return restaurant_customer_repository.update(db, db_obj=customer, obj_in=data)

    def anonymize(self, db: Session, customer: RestaurantCustomer, now: Optional[datetime] = None) -> None:
        """Borra los datos personales y conserva visitas y canjes (D13)."""
        customer.full_name = ANONYMIZED_NAME
        customer.phone = None
        customer.email = None
        customer.notes = None
        customer.deleted_at = now or datetime.utcnow()
        db.add(customer)
        db.commit()


customer_service = CustomerService()

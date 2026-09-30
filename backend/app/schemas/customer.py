from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator


class CustomerCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=1, max_length=30)
    email: Optional[EmailStr] = None
    notes: Optional[str] = Field(None, max_length=500)
    # Consentimiento explícito (Ley 29733): sin él no se guardan datos personales
    consent: bool

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El nombre es obligatorio")
        return value

    @field_validator("consent")
    @classmethod
    def consent_required(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("Se requiere el consentimiento del comensal")
        return value


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=120)
    phone: Optional[str] = Field(None, min_length=1, max_length=30)
    email: Optional[EmailStr] = None
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("El nombre no puede quedar vacío")
        return value


class CustomerResponse(BaseModel):
    id: UUID
    restaurant_id: UUID
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    consent_given_at: datetime
    consent_version: int
    created_at: datetime
    # Calculados (no son columnas)
    visits_balance: int = 0
    last_visit_at: Optional[datetime] = None
    visits_required: Optional[int] = None
    reward_available: bool = False

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    data: List[CustomerResponse]
    meta: Dict[str, Any]

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.customer import CustomerResponse


class ProgramUpsert(BaseModel):
    is_active: bool = False
    visits_required: int = Field(10, ge=2, le=100)
    reward_description: str = Field(..., min_length=1, max_length=200)
    reward_product_id: Optional[UUID] = None
    min_hours_between_visits: int = Field(12, ge=0, le=168)
    visits_expire_after_days: Optional[int] = Field(None, gt=0)
    # Si no se envía, se usa el texto por defecto con el nombre del restaurante
    consent_text: Optional[str] = Field(None, min_length=1, max_length=500)


class ProgramResponse(BaseModel):
    id: UUID
    restaurant_id: UUID
    is_active: bool
    visits_required: int
    reward_description: str
    reward_product_id: Optional[UUID] = None
    min_hours_between_visits: int
    visits_expire_after_days: Optional[int] = None
    consent_text: str
    consent_version: int
    updated_at: datetime

    class Config:
        from_attributes = True


class CheckInRequest(BaseModel):
    phone: str = Field(..., min_length=1, max_length=30)
    full_name: Optional[str] = Field(None, max_length=120)
    consent: bool = False


class VoidRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class VisitResponse(BaseModel):
    id: UUID
    customer_id: UUID
    visited_at: datetime
    registered_by_user_id: Optional[UUID] = None
    registered_by_username: Optional[str] = None
    redemption_id: Optional[UUID] = None
    voided_at: Optional[datetime] = None
    void_reason: Optional[str] = None
    # valid | redeemed | voided | expired
    status: str = "valid"


class RedemptionResponse(BaseModel):
    id: UUID
    customer_id: UUID
    redeemed_at: datetime
    redeemed_by_user_id: Optional[UUID] = None
    visits_consumed: int
    reward_description_snapshot: str
    reward_product_id_snapshot: Optional[UUID] = None
    voided_at: Optional[datetime] = None
    void_reason: Optional[str] = None

    class Config:
        from_attributes = True


class CheckInResponse(BaseModel):
    customer: CustomerResponse
    visit: VisitResponse
    balance: int
    visits_required: int
    reward_available: bool
    customer_created: bool = False


class VisitListResponse(BaseModel):
    data: List[VisitResponse]


class RedemptionListResponse(BaseModel):
    data: List[RedemptionResponse]

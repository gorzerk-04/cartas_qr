from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.product import ProductStatus


class ProductBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    original_price: Optional[Decimal] = None
    category_id: UUID
    status: ProductStatus = ProductStatus.AVAILABLE
    tags: List[str] = []
    allergens: List[str] = []
    is_featured: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    original_price: Optional[Decimal] = None
    category_id: Optional[UUID] = None
    status: Optional[ProductStatus] = None
    tags: Optional[List[str]] = None
    allergens: Optional[List[str]] = None
    is_featured: Optional[bool] = None


class ProductResponse(ProductBase):
    id: UUID
    restaurant_id: UUID
    image_url: Optional[str] = None
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    data: List[ProductResponse]
    meta: dict


class ProductStatusUpdate(BaseModel):
    status: ProductStatus


class ReorderItem(BaseModel):
    id: UUID
    display_order: int


class ProductsReorderRequest(BaseModel):
    orders: List[ReorderItem]

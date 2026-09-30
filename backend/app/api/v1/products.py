from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, accessible_restaurant
from app.models.restaurant import Restaurant
from app.models.user import User
from app.models.product import ProductStatus
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    ProductStatusUpdate,
    ProductsReorderRequest,
)
from app.repositories.product import product_repository
from app.services.product import product_service
from app.services.cloudinary import cloudinary_service

router = APIRouter()


@router.post("/{restaurant_id}/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    obj_in: ProductCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Crear un nuevo producto en el restaurante.
    """
    return product_service.create_product(db, restaurant_id=restaurant_id, obj_in=obj_in)


@router.get("/{restaurant_id}/products", response_model=ProductListResponse)
def list_products(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    status: Optional[ProductStatus] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Listar productos del restaurante de forma paginada y filtrada.
    """
    skip = (page - 1) * limit
    results, total = product_repository.get_list(
        db,
        restaurant_id=restaurant_id,
        skip=skip,
        limit=limit,
        search=search,
        category_id=category_id,
        status=status,
    )

    total_pages = (total + limit - 1) // limit if limit else 0

    return ProductListResponse(
        data=[ProductResponse.model_validate(p) for p in results],
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    )


@router.patch("/{restaurant_id}/products/reorder")
def reorder_products(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    body: ProductsReorderRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Reordenar productos (drag & drop).
    """
    product_service.reorder_products(db, restaurant_id=restaurant_id, orders=body.orders)
    return {"message": "Orden actualizado correctamente"}


@router.get("/{restaurant_id}/products/{id}", response_model=ProductResponse)
def get_product(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    current_user: User = Depends(get_current_user),
):
    """
    Obtener detalle de un producto.
    """
    product = product_repository.get(db, id=id)
    if not product or product.restaurant_id != restaurant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return product


@router.put("/{restaurant_id}/products/{id}", response_model=ProductResponse)
def update_product(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    obj_in: ProductUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Actualizar un producto.
    """
    return product_service.update_product(db, restaurant_id=restaurant_id, id=id, obj_in=obj_in)


@router.delete("/{restaurant_id}/products/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    current_user: User = Depends(get_current_user),
):
    """
    Eliminar un producto (soft delete).
    """
    product_service.delete_product(db, restaurant_id=restaurant_id, id=id)
    return


@router.patch("/{restaurant_id}/products/{id}/status", response_model=ProductResponse)
def update_product_status(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    body: ProductStatusUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Cambiar rápidamente el estado de disponibilidad de un producto.
    """
    return product_service.update_status(db, restaurant_id=restaurant_id, id=id, new_status=body.status)


@router.post("/{restaurant_id}/products/{id}/image", response_model=ProductResponse)
async def upload_product_image(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Subir o reemplazar la imagen principal del producto.
    """
    product = product_repository.get(db, id=id)
    if not product or product.restaurant_id != restaurant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    if product.image_cloudinary_id:
        cloudinary_service.delete_image(product.image_cloudinary_id)

    result = await cloudinary_service.upload_image(
        file, folder="menuqr/products", preset_filename=f"product_{product.id}"
    )

    return product_repository.update(
        db,
        db_obj=product,
        obj_in={"image_url": result["url"], "image_cloudinary_id": result["public_id"]},
    )

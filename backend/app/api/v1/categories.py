from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, accessible_restaurant
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoriesReorderRequest,
)
from app.repositories.category import category_repository
from app.repositories.product import product_repository
from app.services.category import category_service
from app.services.cloudinary import cloudinary_service

router = APIRouter()


def _to_response(category, product_count: int = 0) -> CategoryResponse:
    response = CategoryResponse.model_validate(category)
    response.product_count = product_count
    return response


@router.post("/{restaurant_id}/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    obj_in: CategoryCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Crear una nueva categoría para el restaurante.
    """
    category = category_service.create_category(db, restaurant_id=restaurant_id, obj_in=obj_in)
    return _to_response(category)


@router.get("/{restaurant_id}/categories", response_model=List[CategoryResponse])
def list_categories(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Listar todas las categorías del restaurante (sin paginar).
    """
    categories = category_repository.get_by_restaurant(db, restaurant_id=restaurant_id)
    if is_active is not None:
        categories = [c for c in categories if c.is_active == is_active]
    counts = product_repository.count_by_restaurant_grouped(db, restaurant_id=restaurant_id)
    return [_to_response(c, counts.get(c.id, 0)) for c in categories]


@router.patch("/{restaurant_id}/categories/reorder")
def reorder_categories(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    body: CategoriesReorderRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Reordenar categorías (drag & drop).
    """
    category_service.reorder_categories(db, restaurant_id=restaurant_id, orders=body.orders)
    return {"message": "Orden actualizado correctamente"}


@router.get("/{restaurant_id}/categories/{id}", response_model=CategoryResponse)
def get_category(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    current_user: User = Depends(get_current_user),
):
    """
    Obtener detalle de una categoría.
    """
    category = category_repository.get(db, id=id)
    if not category or category.restaurant_id != restaurant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    product_count = product_repository.count_by_category(db, category_id=id)
    return _to_response(category, product_count)


@router.put("/{restaurant_id}/categories/{id}", response_model=CategoryResponse)
def update_category(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    obj_in: CategoryUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Actualizar una categoría.
    """
    category = category_service.update_category(db, restaurant_id=restaurant_id, id=id, obj_in=obj_in)
    product_count = product_repository.count_by_category(db, category_id=id)
    return _to_response(category, product_count)


@router.delete("/{restaurant_id}/categories/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    current_user: User = Depends(get_current_user),
):
    """
    Eliminar una categoría (soft delete). Bloqueado si tiene productos activos.
    """
    category_service.delete_category(db, restaurant_id=restaurant_id, id=id)
    return


@router.post("/{restaurant_id}/categories/{id}/image", response_model=CategoryResponse)
async def upload_category_image(
    *,
    db: Session = Depends(get_db),
    restaurant_id: UUID,
    _restaurant: Restaurant = Depends(accessible_restaurant),
    id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Subir o reemplazar la imagen de la categoría.
    """
    category = category_repository.get(db, id=id)
    if not category or category.restaurant_id != restaurant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")

    if category.image_cloudinary_id:
        cloudinary_service.delete_image(category.image_cloudinary_id)

    result = await cloudinary_service.upload_image(
        file, folder="menuqr/categories", preset_filename=f"category_{category.id}"
    )

    updated = category_repository.update(
        db,
        db_obj=category,
        obj_in={"image_url": result["url"], "image_cloudinary_id": result["public_id"]},
    )
    product_count = product_repository.count_by_category(db, category_id=id)
    return _to_response(updated, product_count)

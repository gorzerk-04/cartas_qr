from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from app.api.deps import (
    get_db,
    get_current_user,
    accessible_restaurant_by_id,
    accessible_restaurant_ids,
    ensure_platform_admin,
)
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.restaurant import (
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantResponse,
    RestaurantListResponse,
    QRGenerateRequest,
)
from app.repositories.restaurant import restaurant_repository
from app.services.restaurant import restaurant_service
from app.services.cloudinary import cloudinary_service
from app.services.qr import qr_service
from app.core.config import settings

router = APIRouter()


@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    *,
    db: Session = Depends(get_db),
    obj_in: RestaurantCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Crear un nuevo restaurante. Solo administradores de plataforma.
    """
    ensure_platform_admin(current_user)
    return restaurant_service.create_restaurant(db, obj_in=obj_in, user_id=current_user.id)


@router.get("", response_model=RestaurantListResponse)
def list_restaurants(
    *,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_published: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Listar restaurantes de forma paginada y filtrada.
    """
    skip = (page - 1) * limit
    results, total = restaurant_repository.get_list(
        db,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        is_published=is_published,
        restaurant_ids=accessible_restaurant_ids(db, current_user),
    )
    
    total_pages = (total + limit - 1) // limit
    
    return RestaurantListResponse(
        data=[RestaurantResponse.model_validate(r) for r in results],
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    )


@router.get("/{id}", response_model=RestaurantResponse)
def get_restaurant_by_id(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant_by_id),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener detalle de restaurante por su ID.
    """
    return restaurant


@router.put("/{id}", response_model=RestaurantResponse)
def update_restaurant(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant_by_id),
    obj_in: RestaurantUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar datos de un restaurante. Solo administradores de plataforma.

    El dueño tiene la información general en solo lectura (403). El slug es
    inmutable para todos los roles (RestaurantUpdate no lo acepta).
    """
    ensure_platform_admin(current_user)
    return restaurant_service.update_restaurant(db, id=id, obj_in=obj_in)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_restaurant(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    restaurant: Restaurant = Depends(accessible_restaurant_by_id),
    current_user: User = Depends(get_current_user)
):
    """
    Eliminar un restaurante (Soft Delete). Solo administradores de plataforma.
    """
    ensure_platform_admin(current_user)
    restaurant = restaurant_repository.get(db, id=id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado"
        )
    restaurant_repository.soft_delete(db, id=id)
    return


@router.post("/{id}/logo", response_model=RestaurantResponse)
async def upload_restaurant_logo(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    _access: Restaurant = Depends(accessible_restaurant_by_id),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Subir o reemplazar el logo del restaurante.
    """
    ensure_platform_admin(current_user)
    restaurant = restaurant_repository.get(db, id=id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado"
        )
        
    if restaurant.logo_cloudinary_id:
        cloudinary_service.delete_image(restaurant.logo_cloudinary_id)
        
    result = await cloudinary_service.upload_image(
        file, folder="menuqr/logos", preset_filename=f"logo_{restaurant.slug}"
    )
    
    return restaurant_repository.update(
        db,
        db_obj=restaurant,
        obj_in={"logo_url": result["url"], "logo_cloudinary_id": result["public_id"]}
    )


@router.delete("/{id}/logo", response_model=RestaurantResponse)
def delete_restaurant_logo(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    _access: Restaurant = Depends(accessible_restaurant_by_id),
    current_user: User = Depends(get_current_user)
):
    """
    Quitar el logo del restaurante y borrar el archivo asociado.
    """
    ensure_platform_admin(current_user)
    restaurant = restaurant_repository.get(db, id=id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado"
        )

    if restaurant.logo_cloudinary_id:
        cloudinary_service.delete_image(restaurant.logo_cloudinary_id)

    return restaurant_repository.update(
        db,
        db_obj=restaurant,
        obj_in={"logo_url": None, "logo_cloudinary_id": None}
    )


@router.post("/{id}/cover", response_model=RestaurantResponse)
async def upload_restaurant_cover(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    _access: Restaurant = Depends(accessible_restaurant_by_id),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Subir o reemplazar la imagen de portada del restaurante.
    """
    ensure_platform_admin(current_user)
    restaurant = restaurant_repository.get(db, id=id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado"
        )
        
    if restaurant.cover_cloudinary_id:
        cloudinary_service.delete_image(restaurant.cover_cloudinary_id)
        
    result = await cloudinary_service.upload_image(
        file, folder="menuqr/covers", preset_filename=f"cover_{restaurant.slug}"
    )
    
    return restaurant_repository.update(
        db,
        db_obj=restaurant,
        obj_in={"cover_url": result["url"], "cover_cloudinary_id": result["public_id"]}
    )


@router.delete("/{id}/cover", response_model=RestaurantResponse)
def delete_restaurant_cover(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    _access: Restaurant = Depends(accessible_restaurant_by_id),
    current_user: User = Depends(get_current_user)
):
    """
    Quitar la imagen de portada del restaurante y borrar el archivo asociado.
    """
    ensure_platform_admin(current_user)
    restaurant = restaurant_repository.get(db, id=id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado"
        )

    if restaurant.cover_cloudinary_id:
        cloudinary_service.delete_image(restaurant.cover_cloudinary_id)

    return restaurant_repository.update(
        db,
        db_obj=restaurant,
        obj_in={"cover_url": None, "cover_cloudinary_id": None}
    )


@router.post("/{id}/qr", response_model=RestaurantResponse)
async def generate_restaurant_qr(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    _access: Restaurant = Depends(accessible_restaurant_by_id),
    obj_in: QRGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generar (o regenerar) el código QR del restaurante, apuntando a su carta pública.
    """
    ensure_platform_admin(current_user)
    restaurant = restaurant_repository.get(db, id=id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurante no encontrado"
        )

    if restaurant.qr_cloudinary_id:
        cloudinary_service.delete_image(restaurant.qr_cloudinary_id)

    target_url = f"{settings.FRONTEND_BASE_URL}/menu/{restaurant.slug}"
    result = await qr_service.generate(
        target_url=target_url,
        format=obj_in.format,
        with_logo=obj_in.with_logo,
        logo_url=restaurant.logo_url,
        foreground_color=obj_in.foreground_color,
        background_color=obj_in.background_color,
        size_px=obj_in.size_px,
        preset_filename=f"qr_{restaurant.slug}",
    )

    return restaurant_repository.update(
        db,
        db_obj=restaurant,
        obj_in={"qr_url": result["url"], "qr_cloudinary_id": result["public_id"]}
    )

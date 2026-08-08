from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from app.models.restaurant import Restaurant
from app.repositories.restaurant import restaurant_repository
from app.schemas.restaurant import RestaurantCreate, RestaurantUpdate


class RestaurantService:
    def create_restaurant(self, db: Session, *, obj_in: RestaurantCreate, user_id: UUID) -> Restaurant:
        existing = restaurant_repository.get_by_slug(db, obj_in.slug)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El slug '{obj_in.slug}' ya se encuentra registrado por otro restaurante."
            )
        
        # Merge incoming data and set owner
        restaurant_data = obj_in.model_dump()
        restaurant_data["created_by"] = user_id
        
        return restaurant_repository.create(db, obj_in=restaurant_data)

    def update_restaurant(self, db: Session, *, id: UUID, obj_in: RestaurantUpdate) -> Restaurant:
        db_obj = restaurant_repository.get(db, id=id)
        if not db_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Restaurante no encontrado"
            )
            
        # Slug is immutable once created. If sent, it is ignored
        update_data = obj_in.model_dump(exclude_unset=True)
        if "slug" in update_data:
            del update_data["slug"]
            
        return restaurant_repository.update(db, db_obj=db_obj, obj_in=update_data)


restaurant_service = RestaurantService()

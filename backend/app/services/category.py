from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.category import Category
from app.repositories.category import category_repository
from app.repositories.restaurant import restaurant_repository
from app.repositories.product import product_repository
from app.schemas.category import CategoryCreate, CategoryUpdate, ReorderItem


class CategoryService:
    def _get_owned(self, db: Session, *, restaurant_id: UUID, id: UUID) -> Category:
        category = category_repository.get(db, id=id)
        if not category or category.restaurant_id != restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada",
            )
        return category

    def create_category(self, db: Session, *, restaurant_id: UUID, obj_in: CategoryCreate) -> Category:
        restaurant = restaurant_repository.get(db, id=restaurant_id)
        if not restaurant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Restaurante no encontrado",
            )
        category_data = obj_in.model_dump()
        category_data["restaurant_id"] = restaurant_id
        category_data["display_order"] = category_repository.get_max_display_order(db, restaurant_id) + 1
        return category_repository.create(db, obj_in=category_data)

    def update_category(
        self, db: Session, *, restaurant_id: UUID, id: UUID, obj_in: CategoryUpdate
    ) -> Category:
        category = self._get_owned(db, restaurant_id=restaurant_id, id=id)
        update_data = obj_in.model_dump(exclude_unset=True)
        return category_repository.update(db, db_obj=category, obj_in=update_data)

    def delete_category(self, db: Session, *, restaurant_id: UUID, id: UUID) -> None:
        self._get_owned(db, restaurant_id=restaurant_id, id=id)
        product_count = product_repository.count_by_category(db, category_id=id)
        if product_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar la categoría porque tiene productos asociados.",
            )
        category_repository.soft_delete(db, id=id)

    def reorder_categories(self, db: Session, *, restaurant_id: UUID, orders: List[ReorderItem]) -> None:
        for item in orders:
            category = category_repository.get(db, id=item.id)
            if not category or category.restaurant_id != restaurant_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Categoría no encontrada: {item.id}",
                )
            category.display_order = item.display_order
            db.add(category)
        db.commit()


category_service = CategoryService()

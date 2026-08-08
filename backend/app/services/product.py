from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.product import Product, ProductStatus
from app.repositories.product import product_repository
from app.repositories.category import category_repository
from app.repositories.restaurant import restaurant_repository
from app.schemas.product import ProductCreate, ProductUpdate, ReorderItem


class ProductService:
    def _get_owned(self, db: Session, *, restaurant_id: UUID, id: UUID) -> Product:
        product = product_repository.get(db, id=id)
        if not product or product.restaurant_id != restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )
        return product

    def _validate_category(self, db: Session, *, restaurant_id: UUID, category_id: UUID) -> None:
        category = category_repository.get(db, id=category_id)
        if not category or category.restaurant_id != restaurant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada",
            )

    def create_product(self, db: Session, *, restaurant_id: UUID, obj_in: ProductCreate) -> Product:
        restaurant = restaurant_repository.get(db, id=restaurant_id)
        if not restaurant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Restaurante no encontrado",
            )
        self._validate_category(db, restaurant_id=restaurant_id, category_id=obj_in.category_id)

        product_data = obj_in.model_dump()
        product_data["restaurant_id"] = restaurant_id
        product_data["display_order"] = product_repository.get_max_display_order(db, restaurant_id) + 1
        return product_repository.create(db, obj_in=product_data)

    def update_product(
        self, db: Session, *, restaurant_id: UUID, id: UUID, obj_in: ProductUpdate
    ) -> Product:
        product = self._get_owned(db, restaurant_id=restaurant_id, id=id)
        update_data = obj_in.model_dump(exclude_unset=True)
        if "category_id" in update_data:
            self._validate_category(db, restaurant_id=restaurant_id, category_id=update_data["category_id"])
        return product_repository.update(db, db_obj=product, obj_in=update_data)

    def delete_product(self, db: Session, *, restaurant_id: UUID, id: UUID) -> None:
        self._get_owned(db, restaurant_id=restaurant_id, id=id)
        product_repository.soft_delete(db, id=id)

    def update_status(
        self, db: Session, *, restaurant_id: UUID, id: UUID, new_status: ProductStatus
    ) -> Product:
        product = self._get_owned(db, restaurant_id=restaurant_id, id=id)
        return product_repository.update(db, db_obj=product, obj_in={"status": new_status})

    def reorder_products(self, db: Session, *, restaurant_id: UUID, orders: List[ReorderItem]) -> None:
        for item in orders:
            product = product_repository.get(db, id=item.id)
            if not product or product.restaurant_id != restaurant_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto no encontrado: {item.id}",
                )
            product.display_order = item.display_order
            db.add(product)
        db.commit()


product_service = ProductService()

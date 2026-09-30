from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.restaurant_member import RestaurantMember
from app.repositories.base import BaseRepository


class RestaurantMemberRepository(BaseRepository[RestaurantMember]):
    def __init__(self):
        super().__init__(RestaurantMember)

    def get_by_user(self, db: Session, user_id: UUID) -> List[RestaurantMember]:
        return db.query(RestaurantMember).filter(RestaurantMember.user_id == user_id).all()

    def restaurant_ids_for_user(self, db: Session, user_id: UUID) -> List[UUID]:
        rows = db.query(RestaurantMember.restaurant_id).filter(RestaurantMember.user_id == user_id).all()
        return [r[0] for r in rows]

    def exists(self, db: Session, user_id: UUID, restaurant_id: UUID) -> bool:
        return (
            db.query(RestaurantMember.id)
            .filter(RestaurantMember.user_id == user_id, RestaurantMember.restaurant_id == restaurant_id)
            .first()
            is not None
        )

    def replace_for_user(self, db: Session, user_id: UUID, restaurant_ids: List[UUID]) -> None:
        """Reemplaza las membresías del usuario por exactamente `restaurant_ids`."""
        wanted = set(restaurant_ids)
        current = {m.restaurant_id: m for m in self.get_by_user(db, user_id)}
        for rid, member in current.items():
            if rid not in wanted:
                db.delete(member)
        for rid in wanted - set(current):
            db.add(RestaurantMember(user_id=user_id, restaurant_id=rid))
        db.commit()


restaurant_member_repository = RestaurantMemberRepository()

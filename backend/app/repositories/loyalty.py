from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.loyalty import LoyaltyProgram, LoyaltyRedemption, LoyaltyVisit
from app.repositories.base import BaseRepository


class LoyaltyProgramRepository(BaseRepository[LoyaltyProgram]):
    def __init__(self):
        super().__init__(LoyaltyProgram)

    def get_by_restaurant(self, db: Session, restaurant_id: UUID) -> Optional[LoyaltyProgram]:
        return (
            db.query(LoyaltyProgram)
            .filter(LoyaltyProgram.restaurant_id == restaurant_id, LoyaltyProgram.deleted_at == None)
            .first()
        )


class LoyaltyVisitRepository(BaseRepository[LoyaltyVisit]):
    def __init__(self):
        super().__init__(LoyaltyVisit)


class LoyaltyRedemptionRepository(BaseRepository[LoyaltyRedemption]):
    def __init__(self):
        super().__init__(LoyaltyRedemption)


loyalty_program_repository = LoyaltyProgramRepository()
loyalty_visit_repository = LoyaltyVisitRepository()
loyalty_redemption_repository = LoyaltyRedemptionRepository()

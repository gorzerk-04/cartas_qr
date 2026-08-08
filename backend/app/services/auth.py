from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.repositories.user import user_repository
from app.models.user import User


class AuthService:
    def authenticate(self, db: Session, username_or_email: str, password: str) -> Optional[User]:
        # Try username first, then email
        user = user_repository.get_by_username(db, username_or_email)
        if not user:
            user = user_repository.get_by_email(db, username_or_email)
        
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
            
        # Update last login
        user.last_login_at = datetime.utcnow()
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user


auth_service = AuthService()

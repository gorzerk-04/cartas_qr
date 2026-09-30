from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user_allow_password_change
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    RestaurantSummary,
    TokenResponse,
    TokenResponseData,
    UserLogin,
    UserResponse,
)
from app.repositories.restaurant import restaurant_repository
from app.repositories.restaurant_member import restaurant_member_repository
from app.services.auth import auth_service
from app.repositories.user import user_repository

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = auth_service.authenticate(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    
    # Generate tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)
    
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_refresh_token(subject=user.id, expires_delta=refresh_token_expires)
    
    # Set HttpOnly Cookie for the refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax" if settings.ENVIRONMENT != "production" else "strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    
    return TokenResponse(
        data=TokenResponseData(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user)
        )
    )


@router.post("/refresh")
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de renovación faltante"
        )
    
    payload = decode_token(refresh_token)
    token_type = payload.get("type")
    user_id = payload.get("sub")
    
    if not user_id or token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de renovación inválido o expirado"
        )
        
    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de renovación inválido o expirado"
        )
        
    user = user_repository.get(db, id=user_uuid)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o no encontrado"
        )
        
    # Generate new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)
    
    # Optionally rotate refresh token
    new_refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_refresh_token = create_refresh_token(subject=user.id, expires_delta=new_refresh_token_expires)
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax" if settings.ENVIRONMENT != "production" else "strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    
    # Return access token wrapped in structured format
    return {
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    # Clear refresh token cookie. No debe devolver un Response nuevo: FastAPI usaría
    # ese objeto en vez del `response` inyectado, y el Set-Cookie de borrado nunca
    # llegaría al cliente (la cookie quedaría viva y /refresh la seguiría aceptando).
    response.delete_cookie(
        key="refresh_token",
        secure=settings.ENVIRONMENT == "production",
        samesite="lax" if settings.ENVIRONMENT != "production" else "strict",
    )


@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_allow_password_change),
):
    data = UserResponse.model_validate(current_user)
    if current_user.is_platform_admin:
        # El admin ve todos los restaurantes: no hace falta listarlos
        data.restaurants = []
    else:
        restaurants = []
        for rid in restaurant_member_repository.restaurant_ids_for_user(db, current_user.id):
            r = restaurant_repository.get(db, id=rid)
            if r:
                restaurants.append(RestaurantSummary.model_validate(r))
        data.restaurants = restaurants
    return {"data": data}


MIN_PASSWORD_LENGTH = 10


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_allow_password_change),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )
    if len(body.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"La nueva contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres",
        )
    if body.new_password == body.current_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La nueva contraseña debe ser distinta de la actual",
        )
    current_user.hashed_password = get_password_hash(body.new_password)
    current_user.must_change_password = False
    db.add(current_user)
    db.commit()

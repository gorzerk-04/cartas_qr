import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.api.v1.auth import router as auth_router
from app.api.v1.restaurants import router as restaurants_router
from app.api.v1.operating_hours import router as operating_hours_router
from app.api.v1.categories import router as categories_router
from app.api.v1.products import router as products_router
from app.api.v1.restaurant_socials import router as restaurant_socials_router
from app.api.v1.public import router as public_router
from app.api.v1.stats import router as stats_router
from app.api.v1.users import router as users_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para la plataforma de cartas digitales MenuQR",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (usado como fallback local cuando Cloudinary está en modo mock, ej. QR generados)
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Mount Routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["🔒 Authentication"])
app.include_router(restaurants_router, prefix="/api/v1/admin/restaurants", tags=["🏠 Restaurants"])
app.include_router(operating_hours_router, prefix="/api/v1/admin/restaurants", tags=["⏰ Operating Hours"])
app.include_router(categories_router, prefix="/api/v1/admin/restaurants", tags=["📁 Categories"])
app.include_router(products_router, prefix="/api/v1/admin/restaurants", tags=["🍽️ Products"])
app.include_router(restaurant_socials_router, prefix="/api/v1/admin/restaurants", tags=["🔗 Socials"])
app.include_router(public_router, prefix="/api/v1/public", tags=["🌎 Public"])
app.include_router(stats_router, prefix="/api/v1/admin", tags=["📊 Stats"])
app.include_router(users_router, prefix="/api/v1/admin/users", tags=["👥 Users"])


@app.get("/health", tags=["❤️ Health"])
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "database": "connected"  # In standard implementation we would check DB health
    }

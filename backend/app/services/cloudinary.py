import hashlib
import os
import uuid
from typing import Dict, Optional
import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status
from app.core.config import settings

# Allowed MIME types
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

EXTENSIONS_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static")


class CloudinaryService:
    def __init__(self):
        self.is_configured = (
            settings.CLOUDINARY_CLOUD_NAME
            and settings.CLOUDINARY_CLOUD_NAME != "mock_cloud"
            and settings.CLOUDINARY_API_KEY
            and settings.CLOUDINARY_API_KEY != "mock_key"
            and settings.CLOUDINARY_API_SECRET
            and settings.CLOUDINARY_API_SECRET != "mock_secret"
        )
        if self.is_configured:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )

    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "menuqr/restaurants",
        preset_filename: Optional[str] = None,
    ) -> Dict[str, str]:
        # Validate MIME type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de archivo no soportado. Formatos válidos: PNG, JPG, JPEG, WEBP",
            )

        # Read contents and check size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo excede el tamaño máximo permitido de 5 MB",
            )

        # Sin credenciales reales de Cloudinary no hay dónde subir el archivo: se guarda
        # la imagen real subida (no un placeholder genérico) en un directorio local
        # servido como estático, para que cada upload refleje lo que el usuario eligió.
        if not self.is_configured:
            filename = preset_filename or f"mock_{uuid.uuid4().hex[:8]}"
            ext = EXTENSIONS_BY_CONTENT_TYPE.get(file.content_type, "jpg")
            subfolder = folder.replace("menuqr/", "")
            local_dir = os.path.join(STATIC_DIR, "uploads", subfolder)
            os.makedirs(local_dir, exist_ok=True)
            filepath = os.path.join(local_dir, f"{filename}.{ext}")
            with open(filepath, "wb") as f:
                f.write(contents)
            # Hash del contenido, no timestamp: dos uploads en el mismo segundo con
            # timestamp habrían colisionado en la misma URL pese a tener contenido distinto.
            content_hash = hashlib.md5(contents).hexdigest()[:10]
            return {
                "url": f"{settings.BACKEND_BASE_URL}/static/uploads/{subfolder}/{filename}.{ext}?v={content_hash}",
                "public_id": f"{folder}/{filename}",
            }

        try:
            filename = preset_filename or f"img_{uuid.uuid4().hex}"
            response = cloudinary.uploader.upload(
                contents,
                folder=folder,
                public_id=filename,
                overwrite=True,
                resource_type="image",
            )
            return {
                "url": response.get("secure_url"),
                "public_id": response.get("public_id"),
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al subir la imagen a Cloudinary: {str(e)}",
            )

    def delete_image(self, public_id: str) -> bool:
        if not public_id:
            return True

        # Sin Cloudinary la imagen vive en disco (ver upload_image): hay que borrar el
        # archivo real, o quitar el logo desde el panel dejaría el fichero huérfano
        # ocupando espacio y accesible por URL directa.
        if not self.is_configured:
            subfolder_and_name = public_id.replace("menuqr/", "", 1)
            base_path = os.path.join(STATIC_DIR, "uploads", *subfolder_and_name.split("/"))
            for ext in set(EXTENSIONS_BY_CONTENT_TYPE.values()):
                candidate = f"{base_path}.{ext}"
                if os.path.isfile(candidate):
                    try:
                        os.remove(candidate)
                    except OSError:
                        return False
            return True

        try:
            response = cloudinary.uploader.destroy(public_id)
            return response.get("result") == "ok"
        except Exception:
            return False


cloudinary_service = CloudinaryService()

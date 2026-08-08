import hashlib
import io
import os
from typing import Dict, Optional
import cloudinary.uploader
import httpx
import qrcode
import qrcode.image.svg
from PIL import Image
from qrcode.constants import ERROR_CORRECT_H
from app.core.config import settings
from app.services.cloudinary import cloudinary_service

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static")

# El logo se superpone ocupando ~22% del ancho del QR — dentro del ~30% que
# error_correction=H puede perder sin dejar de ser escaneable.
LOGO_SIZE_RATIO = 0.22
LOGO_PADDING = 10


class QRService:
    async def generate(
        self,
        *,
        target_url: str,
        format: str = "png",
        with_logo: bool = False,
        logo_url: Optional[str] = None,
        foreground_color: str = "#000000",
        background_color: str = "#FFFFFF",
        size_px: int = 1024,
        preset_filename: str,
    ) -> Dict[str, str]:
        """
        Genera un código QR apuntando a `target_url` y lo sube a Cloudinary.
        Soporta PNG (con logo opcional superpuesto) y SVG (solo colores, sin logo:
        las factories SVG de `qrcode` no soportan superponer una imagen raster de
        forma nativa, y no vale la pena construir eso a mano para el MVP).
        """
        if format == "svg":
            buf, ext = self._render_svg(target_url, foreground_color, background_color)
        else:
            buf, ext = await self._render_png(
                target_url, with_logo, logo_url, foreground_color, background_color, size_px
            )

        return self._upload(buf, preset_filename, ext)

    async def _render_png(
        self,
        target_url: str,
        with_logo: bool,
        logo_url: Optional[str],
        foreground_color: str,
        background_color: str,
        size_px: int,
    ):
        qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=10, border=2)
        qr.add_data(target_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color=foreground_color, back_color=background_color).get_image()
        img = img.resize((size_px, size_px), Image.NEAREST)

        if with_logo and logo_url:
            img = await self._overlay_logo(img, logo_url, size_px)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf, "png"

    async def _overlay_logo(self, img: Image.Image, logo_url: str, size_px: int) -> Image.Image:
        # El logo es "best-effort": si la descarga falla (URL rota, timeout, etc.)
        # el QR se sube igual, sin logo, en vez de fallar toda la generación.
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(logo_url)
                response.raise_for_status()
            logo = Image.open(io.BytesIO(response.content)).convert("RGBA")
        except Exception:
            return img

        logo_size = int(size_px * LOGO_SIZE_RATIO)
        logo.thumbnail((logo_size, logo_size))

        backing = Image.new(
            "RGBA", (logo.width + LOGO_PADDING * 2, logo.height + LOGO_PADDING * 2), "#FFFFFF"
        )
        backing.paste(logo, (LOGO_PADDING, LOGO_PADDING), logo)

        position = ((size_px - backing.width) // 2, (size_px - backing.height) // 2)
        img = img.convert("RGBA")
        img.paste(backing, position, backing)
        return img.convert("RGB")

    def _render_svg(self, target_url: str, foreground_color: str, background_color: str):
        img = qrcode.make(
            target_url,
            image_factory=qrcode.image.svg.SvgPathImage,
            box_size=10,
            border=2,
            error_correction=ERROR_CORRECT_H,
        )
        buf = io.BytesIO()
        img.save(buf)
        svg_text = buf.getvalue().decode("utf-8")
        svg_text = svg_text.replace('fill="#000000"', f'fill="{foreground_color}"', 1)
        svg_text = svg_text.replace("<svg ", f'<svg style="background-color:{background_color}" ', 1)
        return io.BytesIO(svg_text.encode("utf-8")), "svg"

    def _upload(self, buf: io.BytesIO, preset_filename: str, ext: str) -> Dict[str, str]:
        folder = "menuqr/qrcodes"

        if not cloudinary_service.is_configured:
            # Sin credenciales reales de Cloudinary no hay dónde subir el archivo: se
            # guarda el QR generado (el real, no un placeholder genérico) en un
            # directorio local servido como estático, para poder verlo/escanearlo en dev.
            qr_dir = os.path.join(STATIC_DIR, "qrcodes")
            os.makedirs(qr_dir, exist_ok=True)
            filepath = os.path.join(qr_dir, f"{preset_filename}.{ext}")
            with open(filepath, "wb") as f:
                f.write(buf.getvalue())
            # Hash del contenido, no timestamp: dos regeneraciones en el mismo segundo
            # con timestamp habrían colisionado en la misma URL con contenido distinto.
            content_hash = hashlib.md5(buf.getvalue()).hexdigest()[:10]
            return {
                "url": f"{settings.BACKEND_BASE_URL}/static/qrcodes/{preset_filename}.{ext}?v={content_hash}",
                "public_id": f"{folder}/{preset_filename}",
            }

        response = cloudinary.uploader.upload(
            buf,
            folder=folder,
            public_id=preset_filename,
            overwrite=True,
            resource_type="image",
            format=ext,
        )
        return {
            "url": response.get("secure_url"),
            "public_id": response.get("public_id"),
        }


qr_service = QRService()

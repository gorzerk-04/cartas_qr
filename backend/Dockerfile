# Build stage: instala dependencias en un venv aislado. build-essential/libpq-dev
# quedan solo aquí por si pip necesita compilar algo sin wheel prebuilt para esta
# versión de Python — no viajan a la imagen final.
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /venv \
    && /venv/bin/pip install --no-cache-dir --upgrade pip \
    && /venv/bin/pip install --no-cache-dir -r requirements.txt

# Runtime stage: solo el venv ya resuelto + el código de la app, sin toolchain de
# compilación. psycopg2-binary trae libpq estático, así que no hace falta libpq5.
FROM python:3.12-slim

WORKDIR /app

RUN useradd --create-home --uid 1000 appuser
COPY --from=builder /venv /venv
COPY . .

# static/ sirve los QR y las imágenes subidas en modo mock (sin credenciales reales
# de Cloudinary) — se recrea aquí para que exista con el owner correcto; en
# producción real, montar como volumen para no perderla entre despliegues.
RUN mkdir -p static && chown -R appuser:appuser /app

USER appuser

ENV PATH="/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os,urllib.request,sys; p=os.environ.get('PORT','8000'); sys.exit(0 if urllib.request.urlopen(f'http://localhost:{p}/health').status == 200 else 1)"

# alembic upgrade head corre en cada arranque del contenedor: para el volumen de
# despliegue de este proyecto (un solo backend, sin réplicas concurrentes) es más
# simple y seguro que depender de un paso manual que alguien se olvide de correr.
# $PORT lo inyecta la plataforma de hosting en runtime (ej. Render, que asigna un
# puerto dinámico); el fallback a 8000 mantiene sin cambios el comportamiento en
# Fly.io/Docker Compose/local, donde $PORT no está seteado.
CMD alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

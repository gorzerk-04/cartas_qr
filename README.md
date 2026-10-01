# MenuQR

Plataforma modular para gestionar cartas y menús QR para múltiples restaurantes desde un panel de administración único.

## Stack Tecnológico

- **Frontend:** Next.js (App Router), React, TypeScript, TailwindCSS, TanStack Query
- **Backend:** FastAPI, SQLAlchemy, Alembic, Pydantic
- **Base de Datos:** PostgreSQL (SQLite como fallback en desarrollo manual sin Docker)
- **Almacenamiento de imágenes:** Cloudinary (con fallback local a `/static` cuando no hay credenciales configuradas)
- **Despliegue:** Docker Compose self-hosted (ver [Despliegue con Docker](#despliegue-con-docker)) o Vercel + Fly.io + Neon (ver [Despliegue en Vercel + Fly.io + Neon](#despliegue-en-vercel--flyio--neon))

## Estructura del Proyecto

- `/backend`: Servidor API en FastAPI y migraciones con Alembic. Incluye `Dockerfile`.
- `/frontend`: Aplicación cliente en Next.js. Incluye `Dockerfile`.
- `docker-compose.yml`: orquesta los 3 servicios (`postgres`, `backend`, `frontend`) para un despliegue completo.

## Despliegue con Docker

La forma recomendada de levantar el stack completo. Requiere Docker y Docker Compose instalados.

1. Copiar el archivo de variables de entorno de la raíz y completar los valores reales (como mínimo, `SECRET_KEY` es obligatorio; sin él, `docker compose up` falla al levantar el backend a propósito, para no arrancar con una clave insegura por defecto):
   ```bash
   cp .env.example .env
   # editar .env: SECRET_KEY, credenciales de Cloudinary, y las URLs públicas si no es localhost
   ```
2. Construir y levantar los 3 servicios:
   ```bash
   docker compose up -d --build
   ```
3. La primera vez que el backend arranca, corre `alembic upgrade head` automáticamente antes de servir tráfico (ver `backend/Dockerfile`) — no hace falta correr las migraciones a mano.
4. Verificar que todo esté sano:
   ```bash
   docker compose ps          # los 3 servicios deben mostrar "healthy"
   curl http://localhost:8000/health
   curl -I http://localhost:3000/admin/login
   ```
5. Panel de administración: `http://localhost:3000/admin/login`. Para crear el primer usuario, correr el script de semilla dentro del contenedor del backend:
   ```bash
   docker compose exec -e SEED_ADMIN_PASSWORD='<tu-contraseña>' backend python seed.py
   ```

**Notas:**
- Las imágenes que se suben en modo mock (sin credenciales reales de Cloudinary) y los QR generados se guardan en el volumen `backend_static`, para no perderse al recrear el contenedor.
- Las variables `NEXT_PUBLIC_*` del frontend se hornean en el build (`next build`) — si cambian, hay que reconstruir la imagen (`docker compose up -d --build frontend`), reiniciar el contenedor solo no alcanza.
- Para levantar solo Postgres (por ejemplo, para correr el backend/frontend manualmente en modo desarrollo mientras se apunta a una base real): `docker compose up -d postgres`.
- Para bajar todo: `docker compose down` (agregar `-v` además borra los volúmenes, incluyendo los datos de Postgres — usar con cuidado).

## Despliegue en Vercel + Fly.io + Neon

Alternativa sin Docker Compose: frontend en Vercel, backend en Fly.io, base de datos en Neon (Postgres serverless). El backend no requiere cambios de código para este camino — usa el mismo `Dockerfile` que Docker Compose, Fly.io solo necesita el `backend/fly.toml` ya incluido en el repo.

**Prerrequisitos:** cuenta de Fly.io con `flyctl` instalado y autenticado (`fly auth login`); si se quiere auto-deploy en Vercel desde git, el repo debe estar en GitHub (o usar la CLI `vercel` para deploy directo sin git).

1. **Neon**: crear un proyecto, copiar la connection string y agregarle `?sslmode=require` al final.
2. **Fly.io**: desde `backend/` (donde está `fly.toml`):
   ```bash
   fly apps create <nombre-único>   # o ajustar `app = "..."` en fly.toml y correr `fly launch --no-deploy`
   fly secrets set \
     SECRET_KEY=$(openssl rand -hex 32) \
     DATABASE_URL="<connection string de Neon con sslmode=require>" \
     CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
     ALLOWED_ORIGINS="http://localhost:3000" FRONTEND_BASE_URL="http://localhost:3000"
   fly deploy
   ```
   `ALLOWED_ORIGINS`/`FRONTEND_BASE_URL` quedan con un placeholder temporal — se actualizan en el paso 4. Anotar la URL asignada (`https://<app>.fly.dev`).
3. **Vercel**: crear proyecto con Root Directory `frontend/`; configurar las Environment Variables `NEXT_PUBLIC_API_URL=https://<app>.fly.dev/api/v1` y `NEXT_PUBLIC_BASE_URL=https://<vercel-url>`; deploy y anotar la URL final.
4. Volver a Fly.io y actualizar los secrets con la URL real de Vercel (dispara redeploy automático):
   ```bash
   fly secrets set ALLOWED_ORIGINS="https://<vercel-url>" FRONTEND_BASE_URL="https://<vercel-url>"
   ```
5. Crear el usuario admin inicial: `fly ssh console -C "python seed.py"`.
6. Verificar: `curl https://<app>.fly.dev/health` y login en `https://<vercel-url>/admin/login`.

**Notas:**
- `BACKEND_BASE_URL` (secret en Fly.io) debe apuntar a `https://<app>.fly.dev`.
- Las variables `NEXT_PUBLIC_*` se hornean en el build de Vercel — cambiar una requiere un nuevo deploy, no alcanza con reiniciar.
- `SECRET_KEY`, `DATABASE_URL` y las credenciales de Cloudinary van siempre como `fly secrets` (nunca en `fly.toml`, que se versiona en git).
- `fly.toml` está configurado con `min_machines_running = 0` (escala a cero sin tráfico) — el cold start de Fly suele ser de ~1s, así que no hace falta un keep-alive externo como sí conviene en Render free tier; si se prefiere latencia constante, subir `min_machines_running = 1` a costa de tener la máquina siempre encendida.
- Elegir `primary_region` en `fly.toml` cercana a la región del proyecto de Neon para minimizar latencia de DB.

## Desarrollo Local (sin Docker)

### Requisitos

- Python 3.10+
- Node.js 22+
- Docker y Docker Compose (opcional: solo si se quiere una base Postgres real en vez del fallback a SQLite)

### Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows (Git Bash); en macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # por defecto usa sqlite:///./menuqr.db, no requiere Postgres
alembic upgrade head
SEED_ADMIN_PASSWORD='<tu-contraseña>' python seed.py   # crea el usuario administrador inicial (la contraseña es obligatoria)
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
corepack enable          # activa pnpm en la versión fijada en package.json ("packageManager")
pnpm install
cp .env.example .env
pnpm dev
```

### Tests
```bash
cd backend
source venv/Scripts/activate
python -m pytest tests/ -v
```

### Suite E2E de autenticación (navegador real)

`pytest`/`tsc`/`pnpm build` no ejecutan JavaScript de cliente de verdad — no detectan bugs de comportamiento del navegador (ej. una cookie de sesión que no se invalida en el logout aunque toda la suite de arriba esté en verde). Por eso hay una suite aparte con Playwright que corre contra un Chrome real, cubriendo los flujos críticos de auth: login exitoso, login con credenciales incorrectas, logout invalida la sesión (una sesión vieja no puede refrescarse), y acceso a una ruta `/admin/*` sin sesión redirige a login sin loop.

Es una suite **manual**, no forma parte de `pnpm build` ni de ningún CI — correrla antes de cada release, o después de tocar el flujo de auth/sesión.

Requiere backend y frontend levantados (con el usuario admin ya sembrado con `SEED_ADMIN_PASSWORD`; el test lee `E2E_ADMIN_PASSWORD` y, opcionalmente, `E2E_ADMIN_USERNAME`, por defecto `admin`) y Google Chrome instalado en la máquina (usa el Chrome real del sistema vía `channel: "chrome"`, no descarga un Chromium aparte):

```bash
# Terminal 1
cd backend && source venv/Scripts/activate && uvicorn app.main:app --reload
# Terminal 2
cd frontend && pnpm dev
# Terminal 3 (credenciales del admin sembrado)
cd frontend && E2E_ADMIN_PASSWORD='<tu-contraseña>' pnpm test:e2e
```

#### Suite E2E de roles (`roles.spec.ts`)

Comprueba en el navegador que un **dueño** solo ve su restaurante (y no ve "Usuarios"), que un restaurante ajeno aparece como "no encontrado", y que el **admin** ve todo y puede dar de alta un dueño (contraseña temporal mostrada una sola vez y cambio obligatorio al primer ingreso).

Necesita datos de prueba: `backend/scripts/seed_e2e.py` (idempotente) crea el admin, un dueño y los restaurantes "E2E Propio" (asignado al dueño) y "E2E Ajeno" (sin asignar). **Se niega a correr con `ENVIRONMENT=production`**; úsalo solo sobre una base local de desarrollo.

```bash
# Desde backend/, con el venv activo y DATABASE_URL apuntando a tu base LOCAL
E2E_ADMIN_PASSWORD='<clave-admin>' E2E_OWNER_PASSWORD='<clave-dueño>' python scripts/seed_e2e.py

# Con backend (8000) y frontend (3000) levantados, desde frontend/
E2E_ADMIN_PASSWORD='<clave-admin>' E2E_OWNER_PASSWORD='<clave-dueño>' pnpm test:e2e
```

#### Suite E2E de fidelización (`loyalty.spec.ts`)

Usa los mismos datos de `seed_e2e.py`, que además deja "E2E Propio" con el **programa de fidelización activo** (2 visitas para canjear, sin tiempo mínimo entre visitas). Comprueba, en el navegador y como dueño: el check-in de un celular nuevo (pide nombre y consentimiento) que muestra 1/2; un segundo check-in que llega a 2/2 y ofrece "Canjear"; y el canje (con confirmación) que deja el saldo en 0. Cada corrida usa un celular nuevo, así que se puede repetir sin limpiar la base.

#### Suite E2E de los botones de la carta (`public-actions.spec.ts`)

Usa la carta pública, sin iniciar sesión. `seed_e2e.py` deja a "E2E Propio" con enlace de reseñas de Google y a "E2E Ajeno" sin enlace ni programa activo. Comprueba que el botón "Déjanos tu reseña" apunta al enlace y abre una pestaña nueva, que "Programa de fidelidad" abre el modal con la meta y la recompensa (y se cierra con Escape o tocando fuera), y que sin enlace ni programa la fila de botones no aparece.

#### Suite E2E de reseñas de Google (`google-reviews.spec.ts`)

Como admin: convierte un enlace de Maps en la pantalla "Reseñas de Google" (la respuesta de `/admin/google-review/resolve` se simula, no sale a internet), lo copia y comprueba el botón "Probar"; luego lo asigna a "E2E Propio" usando el enlace largo de Maps del seed, que el backend resuelve sin red. Como dueño: no ve la sección en el menú y `/admin/google-reviews` lo devuelve al dashboard.

Corre junto con las demás: `pnpm test:e2e` ejecuta `auth`, `google-reviews`, `loyalty`, `public-actions` y `roles` (necesita `E2E_OWNER_PASSWORD`; `roles` y `google-reviews` también `E2E_ADMIN_PASSWORD`).

Variables opcionales: `E2E_ADMIN_USERNAME` (def. `admin`), `E2E_OWNER_USERNAME` (def. `e2e_owner`), `E2E_OWNER_EMAIL`, `E2E_API_URL` (def. `http://localhost:8000/api/v1`).

> El login tiene rate limit (5 intentos por minuto por IP). Por eso Playwright corre con un solo worker, y `roles.spec.ts` y `loyalty.spec.ts` inician sesión por la API una vez por rol y, si encuentran un 429, esperan 62 s y reintentan: una corrida completa puede tardar más de un minuto. Si repites la suite completa en menos de un minuto, los tests de login de `auth.spec.ts` pueden fallar por el mismo límite: espera y vuelve a correr.

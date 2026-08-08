# Guía de Despliegue — MenuQR

> Guía operativa paso a paso para desplegar el proyecto. Para referencia rápida de comandos también está resumido en `README.md`; este documento es la versión completa con checklist y troubleshooting.

---

## 1. Arquitectura de despliegue

```
┌─────────────┐     HTTPS      ┌─────────────┐     TCP/SSL     ┌─────────────┐
│   Vercel    │ ─────────────▶ │   Fly.io    │ ──────────────▶ │    Neon     │
│  (frontend  │  NEXT_PUBLIC_  │  (backend   │  DATABASE_URL   │ (PostgreSQL │
│   Next.js)  │   API_URL      │  FastAPI,   │  sslmode=require│  serverless)│
│             │                │  Docker)    │                 │             │
└─────────────┘                └──────┬──────┘                 └─────────────┘
                                       │
                                       ▼
                                  ┌─────────┐
                                  │Cloudinary│  (imágenes/QR)
                                  └─────────┘
```

- **Frontend** (`/frontend`): Next.js, desplegado en **Vercel**.
- **Backend** (`/backend`): FastAPI + Alembic, desplegado en **Fly.io** vía Docker (usa el `Dockerfile` y `fly.toml` ya versionados en el repo — no requiere cambios de código).
- **Base de datos**: PostgreSQL gestionado en **Neon** (serverless, requiere SSL).
- **Imágenes/QR**: Cloudinary (con credenciales reales en producción — el fallback local a `/static` solo tiene sentido en desarrollo, en Fly.io el disco es efímero).

Existe también un camino alternativo self-hosted con Docker Compose (todo en un solo servidor/VPS) — ver [sección 6](#6-alternativa-self-hosted-con-docker-compose).

---

## 2. Prerrequisitos

- [ ] Cuenta en [Neon](https://neon.tech)
- [ ] Cuenta en [Fly.io](https://fly.io) + [`flyctl`](https://fly.io/docs/flyctl/install/) instalado y autenticado (`fly auth login`)
- [ ] Cuenta en [Vercel](https://vercel.com)
- [ ] Cuenta en [Cloudinary](https://cloudinary.com) con `cloud_name`, `api_key`, `api_secret` reales
- [ ] Repositorio en GitHub si querés auto-deploy en Vercel desde git (opcional — también se puede desplegar directo con la CLI `vercel`, sin necesidad de que la raíz del proyecto esté en GitHub)
- [ ] `openssl` disponible para generar el `SECRET_KEY` (o cualquier generador de string aleatorio de 32+ bytes)

---

## 3. Checklist de variables de entorno

| Variable | Dónde se configura | Valor |
|---|---|---|
| `SECRET_KEY` | Fly secret | `openssl rand -hex 32` — nunca el valor de `.env.example` |
| `DATABASE_URL` | Fly secret | Connection string de Neon + `?sslmode=require` |
| `CLOUDINARY_CLOUD_NAME` | Fly secret | Real, no `mock_cloud` |
| `CLOUDINARY_API_KEY` | Fly secret | Real, no `mock_key` |
| `CLOUDINARY_API_SECRET` | Fly secret | Real, no `mock_secret` |
| `ALLOWED_ORIGINS` | Fly secret | URL de Vercel (ej. `https://menuqr.vercel.app`) |
| `FRONTEND_BASE_URL` | Fly secret | Igual a `ALLOWED_ORIGINS` — se usa para construir la URL codificada en el QR |
| `BACKEND_BASE_URL` | Fly secret | `https://<app>.fly.dev` |
| `ENVIRONMENT` | `fly.toml` (`[env]`) | `production` (deshabilita `/docs` y `/redoc`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `fly.toml` (`[env]`) | Ya vienen con default (15 / 7) |
| `NEXT_PUBLIC_API_URL` | Vercel → Environment Variables | `https://<app>.fly.dev/api/v1` |
| `NEXT_PUBLIC_BASE_URL` | Vercel → Environment Variables | `https://<vercel-url>` |

**Regla importante:** todo lo que sea secreto (`SECRET_KEY`, `DATABASE_URL`, credenciales de Cloudinary) va como `fly secrets set`, **nunca** en `fly.toml` — ese archivo se versiona en git.

---

## 4. Paso a paso

### 4.1 Neon (base de datos)

1. Crear un proyecto nuevo en Neon.
2. Copiar la connection string (formato `postgresql://user:pass@host/db`).
3. Convertirla al formato que usa el backend y agregar SSL:
   ```
   postgresql+psycopg2://user:pass@host/db?sslmode=require
   ```

### 4.2 Fly.io (backend)

Desde `backend/` (donde ya está el `fly.toml` del repo):

```bash
fly apps create <nombre-único>
# o, si preferís el asistente interactivo: fly launch --no-deploy
```

Setear los secrets (reemplazar cada valor real):

```bash
fly secrets set \
  SECRET_KEY=$(openssl rand -hex 32) \
  DATABASE_URL="postgresql+psycopg2://user:pass@host/db?sslmode=require" \
  CLOUDINARY_CLOUD_NAME=tu_cloud_name \
  CLOUDINARY_API_KEY=tu_api_key \
  CLOUDINARY_API_SECRET=tu_api_secret \
  ALLOWED_ORIGINS="http://localhost:3000" \
  FRONTEND_BASE_URL="http://localhost:3000" \
  BACKEND_BASE_URL="https://<app>.fly.dev"
```

> `ALLOWED_ORIGINS` y `FRONTEND_BASE_URL` quedan con un placeholder temporal — Vercel todavía no tiene URL asignada. Se corrigen en el paso 4.4.

Desplegar:

```bash
fly deploy
```

Anotar la URL asignada: `https://<app>.fly.dev`.

### 4.3 Vercel (frontend)

1. Crear un nuevo proyecto en Vercel, **Root Directory = `frontend/`**.
2. Configurar Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://<app>.fly.dev/api/v1`
   - `NEXT_PUBLIC_BASE_URL` = `https://<vercel-url>` (el dominio que Vercel te asigna; podés confirmarlo/ajustarlo después del primer deploy si usás un dominio custom)
3. Deploy.
4. Anotar la URL final del proyecto.

### 4.4 Reconectar Fly.io con la URL real de Vercel

```bash
fly secrets set \
  ALLOWED_ORIGINS="https://<vercel-url>" \
  FRONTEND_BASE_URL="https://<vercel-url>"
```

Esto dispara un redeploy automático del backend en Fly.io.

### 4.5 Crear el usuario admin

```bash
fly ssh console -C "python seed.py"
```

### 4.6 Verificación end-to-end

```bash
curl https://<app>.fly.dev/health          # debe responder 200
```

Y en el navegador: login en `https://<vercel-url>/admin/login`, crear un restaurante de prueba, generar su QR, y abrir `https://<vercel-url>/menu/<slug>` para confirmar que la carta pública carga.

---

## 5. Notas y troubleshooting

- **Cold starts**: `fly.toml` tiene `min_machines_running = 0` (escala a cero sin tráfico). El arranque de una máquina Fly (Firecracker VM) suele tardar ~1 segundo, así que no hace falta un keep-alive externo. Si preferís latencia constante, subí `min_machines_running = 1` en `fly.toml` y redeployá — a costa de tener la máquina siempre encendida (más costo).
- **Región**: `primary_region` en `fly.toml` viene en `gru` (São Paulo) — ajustalo a la región más cercana a tus usuarios reales, e idealmente cercana a la región del proyecto de Neon, para minimizar la latencia de las queries a la DB.
- **`NEXT_PUBLIC_*` se hornean en build-time**: si cambiás `NEXT_PUBLIC_API_URL` o `NEXT_PUBLIC_BASE_URL` en Vercel, necesitás un nuevo deploy (redeploy manual o push a git) — reiniciar no alcanza, quedan compilados en el bundle de cliente.
- **CORS 4xx en el navegador**: casi siempre significa que `ALLOWED_ORIGINS` en Fly.io no coincide exactamente con la URL de Vercel (revisar `https://` vs `http://`, con o sin `www`, sin `/` final).
- **QR apunta a `localhost`**: significa que `FRONTEND_BASE_URL` quedó con el placeholder del paso 4.2 y no se actualizó en el paso 4.4.
- **500 en cualquier endpoint de imágenes/QR**: revisar que `CLOUDINARY_*` sean credenciales reales — si quedan como `mock_cloud`/`mock_key`/`mock_secret` (los valores centinela del modo desarrollo), el backend intenta guardar en `/static`, que en Fly.io es efímero y se pierde en cada redeploy.
- **Slug del restaurante**: es inmutable una vez creado (queda codificado en el QR impreso) — no hay nada que arreglar en el deploy por esto, es solo un recordatorio operativo para cuando se cree el primer restaurante real.

---

## 6. Alternativa: self-hosted con Docker Compose

Para un VPS propio en vez de Vercel/Fly.io/Neon, el repo ya trae todo listo:

```bash
cp .env.example .env
# editar .env: SECRET_KEY, credenciales de Cloudinary, URLs públicas si no es localhost
docker compose up -d --build
docker compose ps                              # los 3 servicios deben quedar "healthy"
docker compose exec backend python seed.py      # crea el usuario admin
```

Detalle completo (incluyendo notas sobre el volumen de imágenes y cómo bajar el stack) en `README.md`, sección "Despliegue con Docker".

# Guía de Despliegue para Dummies — MenuQR

> Esta guía está pensada para alguien que **no sabe programar** y nunca desplegó una aplicación en internet. Si ya sabés lo que es una variable de entorno, un repositorio o un dominio, probablemente te convenga usar directamente `guia_deploy.md`, que es más corta. Esta versión explica cada paso con calma, con clics concretos en pantallas reales.
>
> Vamos a usar únicamente páginas web con botones (sin usar la terminal/consola negra), excepto por **un solo paso** donde vamos a copiar y pegar un comando para generar una contraseña segura. Te explico exactamente cómo hacerlo cuando lleguemos ahí.

---

## 1. ¿Qué vamos a hacer? (la idea en un dibujo)

MenuQR necesita 4 "casas" separadas en internet, cada una la vas a alquilar (gratis, con un plan de prueba) en un sitio distinto:

```
 [ Neon ]  guarda toda la información        →  la "base de datos"
    │        (restaurantes, platos, usuarios)
    │
 [ Render ]  el "cerebro" que procesa todo    →  el "backend"
    │        y habla con Neon y Cloudinary
    │
 [ Vercel ]  lo que la gente ve y usa         →  el "frontend"
    │        en su celular o computadora
    │
 [ Cloudinary ]  guarda las fotos y los QR    →  almacenamiento de imágenes
```

Vas a crear una cuenta gratuita en cada uno de estos 4 servicios, conectarlos entre sí con algunos datos (como si fueran "contraseñas" que se pasan entre ellos), y al final vas a tener una página web real, funcionando, con una dirección tipo `https://menuqr-tuempresa.vercel.app`.

Tiempo estimado: **30 a 45 minutos**, sin apuro.

> **Nota:** esta guía usa **Render** para el backend porque se maneja 100% con clics en una página web (no hay que instalar nada en tu computadora). Es la opción que el proyecto está usando actualmente para una prueba. Más adelante el proyecto puede migrar a otro servicio (Fly.io), que es un poco más técnico — si eso pasa, se actualizará esta guía o se te va a avisar.

---

## 2. Glosario exprés (términos que vas a ver todo el tiempo)

No hace falta memorizarlos, solo volvé a esta sección si te perdés:

| Palabra | Qué significa en criollo |
|---|---|
| **Repositorio / repo** | La carpeta con todo el código del proyecto, guardada en GitHub. |
| **Variable de entorno** | Un dato tipo "usuario/contraseña" que le pasás a la aplicación sin escribirlo dentro del código (por seguridad). Se configura en un formulario, no hay que programar nada. |
| **Deploy / desplegar** | Subir la aplicación para que quede funcionando en internet, con una dirección web real. |
| **Backend** | La parte "invisible" de la app: recibe pedidos, guarda y busca datos. Nadie lo ve directamente. |
| **Frontend** | La parte que sí ves: las pantallas, botones, el menú del restaurante. |
| **Base de datos** | Donde se guarda toda la información (restaurantes, platos, usuarios) para que no se pierda. |
| **Dashboard** | El panel con botones y menús que te muestra cada servicio (Render, Vercel, Neon) cuando entrás a tu cuenta. |
| **URL** | La dirección de una página web, ej: `https://menuqr.vercel.app`. |

---

## 3. Antes de empezar: lo que necesitás

- [ ] Un navegador (Chrome, Edge, lo que uses normalmente).
- [ ] Un email para registrarte en los servicios (podés usar el mismo en todos).
- [ ] Una cuenta de **GitHub** (gratis) — es donde vive el código del proyecto. Si no tenés, se crea en [github.com](https://github.com) con tu email, es como crear cualquier cuenta.
- [ ] Que el código del proyecto ya esté subido a un repositorio de GitHub (si no estás seguro de esto, preguntale a la persona que te pasó el proyecto — normalmente ya está hecho).
- [ ] Un rato tranquilo de 30-45 minutos, sin cortes.

No necesitás instalar ningún programa en tu computadora para esta guía.

---

## 4. Paso a paso

### Paso 1 — Crear la base de datos en Neon

1. Andá a [neon.tech](https://neon.tech) y creá una cuenta (podés registrarte directo con tu cuenta de GitHub, es más rápido).
2. Una vez adentro, hacé clic en **New Project** (o "Create a project").
3. Ponele un nombre, por ejemplo `menuqr`, y confirmá. Elegí una región cercana a donde van a estar tus usuarios reales (por ejemplo, algo en Sudamérica si tus clientes están ahí).
4. Cuando el proyecto se crea, Neon te muestra una **Connection String** (una frase larga que empieza con `postgresql://...`). Es la "dirección + contraseña" de tu base de datos.
5. Copiala y pegala en un archivo de texto temporal (Bloc de notas) — la vamos a necesitar en un rato. **No la compartas con nadie ni la subas a ningún lado público.**
6. Al final de esa frase larga, agregale `?sslmode=require`. Por ejemplo, si copiaste:
   ```
   postgresql://usuario:clave@ep-algo.neon.tech/menuqr
   ```
   la vas a dejar así:
   ```
   postgresql+psycopg2://usuario:clave@ep-algo.neon.tech/menuqr?sslmode=require
   ```
   Fijate que además cambiamos `postgresql://` por `postgresql+psycopg2://` al principio — es el formato exacto que necesita el backend. Guardá esta versión final en tu Bloc de notas, la vamos a llamar **DATABASE_URL** de acá en adelante.

### Paso 2 — Crear la cuenta de Cloudinary (para las fotos y los códigos QR)

1. Andá a [cloudinary.com](https://cloudinary.com) y creá una cuenta gratis.
2. Al entrar al **Dashboard**, vas a ver tres datos bien visibles: **Cloud Name**, **API Key** y **API Secret**. Copialos a tu Bloc de notas, los vamos a necesitar como:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

   Importante: tienen que ser estos valores **reales** (los que te dio Cloudinary), no inventados — si están mal, las fotos y los QR no se van a guardar bien.

### Paso 3 — Generar la "llave secreta" del sistema (SECRET_KEY)

Esto es un código al azar que usa el backend para proteger las sesiones de los usuarios (como una contraseña maestra interna, no la vas a usar vos para iniciar sesión). Es el único paso de esta guía que usa una terminal, pero es copiar y pegar una sola línea:

1. En Windows, hacé clic en el botón de inicio (la lupa de buscar) y escribí `Git Bash`. Abrilo (aparece una ventana negra con texto).
2. Pegá esto y presioná Enter:
   ```bash
   openssl rand -hex 32
   ```
3. Te va a aparecer una fila larga de letras y números (por ejemplo `a1b2c3...`). Copiala tal cual a tu Bloc de notas, la vamos a llamar **SECRET_KEY**.

   > Si no tenés Git Bash instalado, pedile a quien te compartió el proyecto que te pase una clave generada, o cualquier texto al azar de 32 caracteres o más (mientras más random, mejor) sirve como reemplazo temporal.

### Paso 4 — Desplegar el backend en Render

1. Andá a [render.com](https://render.com) y creá una cuenta (podés entrar con GitHub para que sea más simple conectar el repositorio).
2. En el dashboard, hacé clic en **New** (arriba a la derecha) → **Web Service**.
3. Conectá tu cuenta de GitHub si te lo pide, y elegí el repositorio del proyecto (por ejemplo `cartas_qr`).
4. En el formulario de configuración, completá:
   - **Root Directory**: `backend`
   - **Runtime**: debería detectar automáticamente **Docker** (si te pregunta, elegí Docker).
   - **Instance Type**: elegí el plan gratuito (Free) para probar.
5. Buscá la sección **Health Check Path** y escribí: `/health`
6. Bajá hasta **Environment Variables** (puede decir "Environment" o "Advanced"). Ahí vas a agregar, una por una, con el botón **Add Environment Variable**, estos valores (los "Key" van exactamente así, en mayúsculas):

   | Key (nombre) | Value (valor) |
   |---|---|
   | `SECRET_KEY` | La que generaste en el Paso 3 |
   | `DATABASE_URL` | La de Neon del Paso 1 (la que termina en `?sslmode=require`) |
   | `CLOUDINARY_CLOUD_NAME` | La de Cloudinary |
   | `CLOUDINARY_API_KEY` | La de Cloudinary |
   | `CLOUDINARY_API_SECRET` | La de Cloudinary |
   | `ALLOWED_ORIGINS` | Por ahora poné `http://localhost:3000` (lo vamos a corregir en el Paso 6) |
   | `FRONTEND_BASE_URL` | Igual que arriba: `http://localhost:3000` por ahora |
   | `BACKEND_BASE_URL` | Dejalo vacío por ahora, lo completamos apenas Render te dé la URL |
   | `ENVIRONMENT` | `production` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` |
   | `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |

7. Hacé clic en **Create Web Service** (o **Deploy**). Render va a empezar a construir la aplicación — esto tarda unos minutos, vas a ver un montón de texto técnico corriendo en pantalla, es normal, esperá a que diga algo como "Live" o "Deploy succeeded" en verde.
8. Arriba de la página vas a ver la URL que te asignó Render, algo como `https://menuqr-backend.onrender.com`. **Copiala a tu Bloc de notas.**
9. Volvé a **Environment**, editá la variable `BACKEND_BASE_URL` y poné esa URL completa (por ejemplo `https://menuqr-backend.onrender.com`). Guardá — esto va a disparar un nuevo deploy automático, esperá a que vuelva a decir "Live".

### Paso 5 — Desplegar el frontend en Vercel

1. Andá a [vercel.com](https://vercel.com) y creá una cuenta (también podés entrar con GitHub).
2. Hacé clic en **Add New** → **Project**.
3. Elegí el mismo repositorio del proyecto.
4. Cuando te pida configurar, buscá **Root Directory** y elegí `frontend` (es importante, si no lo cambiás va a fallar).
5. Antes de darle a **Deploy**, abrí la sección **Environment Variables** y agregá:

   | Key (nombre) | Value (valor) |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | La URL de Render del Paso 4 + `/api/v1`, por ejemplo `https://menuqr-backend.onrender.com/api/v1` |
   | `NEXT_PUBLIC_BASE_URL` | Por ahora podés dejar cualquier valor provisorio, tipo `https://menuqr.vercel.app` — lo vamos a confirmar en el paso siguiente |

6. Hacé clic en **Deploy** y esperá unos minutos a que termine (te va a mostrar una animación/confeti cuando esté listo).
7. Anotá la URL final que te dio Vercel, por ejemplo `https://menuqr-tuempresa.vercel.app`.
8. Si la URL final es distinta a la que pusiste en `NEXT_PUBLIC_BASE_URL`, andá a **Settings → Environment Variables** dentro del proyecto de Vercel, editá `NEXT_PUBLIC_BASE_URL` con la URL correcta, y después andá a la pestaña **Deployments**, hacé clic en los tres puntitos del último deploy y elegí **Redeploy** (los cambios de estas variables no se aplican solos, necesitan un redeploy).

### Paso 6 — Volver a Render y conectar todo

Ahora que ya tenés la URL final de Vercel, volvamos a decirle al backend cuál es:

1. Volvé a [render.com](https://render.com), entrá a tu servicio del backend.
2. Andá a **Environment** y editá estas dos variables con la URL real de Vercel del Paso 5:
   - `ALLOWED_ORIGINS` → `https://menuqr-tuempresa.vercel.app`
   - `FRONTEND_BASE_URL` → `https://menuqr-tuempresa.vercel.app`
3. Guardá los cambios. Esto dispara automáticamente un nuevo deploy — esperá a que diga "Live" de nuevo.

### Paso 7 — Crear el usuario administrador

Para poder entrar al panel de administración necesitás un usuario. El proyecto trae un script que lo crea automáticamente.

1. En el dashboard de Render, entrá a tu servicio del backend y buscá la pestaña **Shell** (arriba, junto a "Logs", "Environment", etc.).
2. Si la ves disponible, hacé clic, se va a abrir una terminal dentro del navegador. Escribí:
   ```
   SEED_ADMIN_PASSWORD='elegí-una-contraseña-larga' python seed.py
   ```
   y presioná Enter. Te debería aparecer un mensaje confirmando que se creó el usuario `admin`.
3. **Si no ves la pestaña Shell** (algunos planes gratuitos no la incluyen), pedile ayuda a quien te pasó el proyecto para correr ese comando por vos, o probá subir temporalmente tu plan de Render solo para este paso puntual y después volver a bajarlo.

Los datos para entrar por primera vez son:
- **Usuario:** `admin`
- **Contraseña:** la que definiste en la variable `SEED_ADMIN_PASSWORD` (paso anterior)

**Importante:** el script de semilla no arranca si `SEED_ADMIN_PASSWORD` no está definida, así que no existe una contraseña de fábrica. Elegí una contraseña larga y única.

### Paso 8 — Verificar que todo funciona

1. Abrí en el navegador la URL de tu backend + `/health`, por ejemplo:
   ```
   https://menuqr-backend.onrender.com/health
   ```
   Tendría que mostrarte una respuesta corta indicando que está todo bien (no un error).

   > Si en el plan gratuito de Render la aplicación estuvo "dormida" un rato sin uso, la primera vez que abrís esta URL puede tardar bastantes segundos en responder — es normal, esperá.

2. Abrí la URL de tu frontend + `/admin/login`, por ejemplo:
   ```
   https://menuqr-tuempresa.vercel.app/admin/login
   ```
   Iniciá sesión con `admin` y la contraseña que definiste en `SEED_ADMIN_PASSWORD`.
3. Una vez adentro, creá un restaurante de prueba y generá su código QR.
4. Abrí el link público del menú de ese restaurante (algo como `https://menuqr-tuempresa.vercel.app/menu/nombre-del-restaurante`) y confirmá que se ve bien.
5. Subí una foto de prueba a un plato y confirmá que se ve — si esto falla, revisá el Paso 2 (Cloudinary).

Si llegaste hasta acá y todo cargó: **listo, tu aplicación está funcionando en internet.**

---

## 5. Si algo sale mal

| Lo que ves | Qué significa probablemente | Qué hacer |
|---|---|---|
| La página del frontend carga pero no muestra datos, o tira un error de "CORS" en algún mensaje técnico | El backend no tiene anotada correctamente la URL del frontend | Revisá el Paso 6: `ALLOWED_ORIGINS` en Render tiene que ser **exactamente** igual a la URL de Vercel (con `https://`, sin espacio ni `/` al final) |
| El código QR o el link del menú apunta a `localhost` en vez de a tu página real | Quedó el valor provisorio del Paso 4 sin actualizar | Repetí el Paso 6, revisando que `FRONTEND_BASE_URL` tenga la URL real de Vercel |
| Al subir una foto da error 500 (error del servidor) | Las credenciales de Cloudinary no son las reales, o están mal copiadas | Revisá el Paso 2 y volvé a pegar los tres valores en Render (Environment) sin espacios de más |
| La primera carga del sitio tarda mucho (10-30 segundos) | Es normal en el plan gratuito de Render: si nadie usó la app en un rato, "se duerme" y tarda en despertar | No es un error, solo esperá. Si te molesta, se puede pasar a un plan pago que no duerma |
| Cambié una variable en Vercel (`NEXT_PUBLIC_...`) y no pasó nada | Esas variables quedan "grabadas a fuego" en el sitio cuando se construye, cambiarlas no alcanza | Andá a **Deployments** en Vercel y hacé **Redeploy** manualmente |
| No encuentro la pestaña "Shell" en Render | Puede que tu plan no la incluya | Ver la nota alternativa en el Paso 7 |
| Me equivoqué en un valor y no sé cómo corregirlo | No pasa nada, estos servicios no se rompen por reintentar | Volvé a la sección **Environment** del servicio correspondiente (Render o Vercel), corregí el valor, guardá, y esperá el redeploy automático |

Si te trabás en algo que no está en esta tabla, guardá una captura de pantalla del error y compartila con quien te dio el proyecto — va a poder ayudarte mucho más rápido con la imagen del error a mano.

---

## 6. Para quien continúe con esto más adelante

Esta guía cubre el despliegue "para probar" usando Render, que es 100% a través de páginas web. El proyecto tiene también una versión más avanzada del despliegue (con Fly.io en vez de Render, entre otras diferencias) en el archivo `guia_deploy.md`, pensada para alguien con más experiencia técnica — no hace falta leerla si esta guía te alcanzó.

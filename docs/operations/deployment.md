# Despliegue — Mush2

## Arquitectura

| Componente | Plataforma | Tipo |
|---|---|---|
| Frontend (React + Vite) | Render (Web Service) | Sirve build desde el backend |
| Backend (Node.js + Express) | Render (Web Service) | API + static files |
| Base de datos (PostgreSQL) | Supabase | PostgreSQL 15+ |

## Estrategia

El backend de Node.js sirve tanto la API REST (`/api/v1`) como los archivos estáticos del frontend (`frontend/dist/`). Esto evita problemas de CORS y permite que WebSocket/SSE funcionen sin configuración adicional.

## Prerrequisitos

- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Render](https://render.com)
- Repositorio en GitHub (con el código actualizado)

## 1. Configurar Supabase

1. Crear proyecto en Supabase:
   - **Region**: La más cercana a tus usuarios (us-east-1, sa-east-1)
   - **Database password**: Anótala
2. Ir a **Project Settings → Database → Connection string**
3. Copiar la **URI** completa:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```

## 2. Preparar el repositorio

Asegúrate de tener los archivos de deploy creados:

- `render.yaml` — configuración de infraestructura
- `Dockerfile` — build reproducible (alternativa)
- `.env.production.example` — referencia de variables

Push a GitHub:

```bash
git add .
git commit -m "chore: prepare deployment for Render + Supabase"
git push origin main
```

## 3. Desplegar en Render

### Opción A: Desde render.yaml (Blueprint)

1. En Render Dashboard: **New → Blueprint**
2. Conecta tu repositorio de GitHub
3. Render detecta automáticamente `render.yaml`
4. Antes de desplegar, configura las variables de entorno sensibles:
   - `DATABASE_URL` — pegar la URI de Supabase
   - `JWT_SECRET` — generar clave segura
5. Haz clic en **Apply**

### Opción B: Manual (Web Service)

1. **New Web Service** → Conecta tu repo de GitHub
2. Configura:
   - **Name**: `mush2`
   - **Runtime**: `Node`
   - **Region**: La más cercana
   - **Branch**: `main`
   - **Build Command**:
     ```
     npm install -g pnpm@10.28.2 && pnpm install --frozen-lockfile && pnpm --filter mush2-frontend run build
     ```
   - **Start Command**:
     ```
     node backend/src/server.js
     ```
   - **Plan**: Free
3. Agrega Environment Variables:
   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `3797` |
   | `DATABASE_URL` | URI de Supabase |
   | `JWT_SECRET` | Clave secreta segura |
   | `CORS_ORIGIN` | `https://mush2.onrender.com` |
4. Haz clic en **Create Web Service**

## 4. Seed inicial (solo primera vez)

Render tiene un botón **Shell** o **Connect** en el dashboard para ejecutar comandos:

```bash
node backend/src/seed.js
```

Esto crea:
- **Receta**: "Melena de León" (Hericium erinaceus)
- **Usuario admin**: `admin` / `admin123` (rol SUPER_ADMIN)

## 5. Health check

Render monitorea automáticamente `/health`. Tu backend expone:

```
GET /health → { "status": "ok", "uptime": 123 }
```

## 6. Verificar el deploy

1. Render asigna una URL como `https://mush2.onrender.com`
2. Visitar en el navegador — deberías ver el frontend
3. Probar `/health` para verificar que el backend responde
4. Iniciar sesión con `admin` / `admin123`

## 7. Configurar dominio personalizado (opcional)

1. Render Dashboard → Settings → Custom Domain
2. Agregar dominio (ej: `app.mush2.cl`)
3. Configurar DNS con tu proveedor:
   - **Tipo**: CNAME
   - **Nombre**: `app` (o `@` para root)
   - **Valor**: `mush2.onrender.com`

## Archivos de deploy

| Archivo | Propósito |
|---|---|
| `render.yaml` | Configuración de infraestructura como código |
| `Dockerfile` | Build reproducible para Docker |
| `.env.production.example` | Referencia de variables de entorno |

## Notas importantes

- `sync-db.js` usa `{ alter: true }` — ejecutar con precaución en producción
- En producción, `server.js` hace `sequelize.sync()` sin alter (solo crea tablas faltantes)
- El frontend se construye durante el build y se sirve desde `backend/src/app.js`
- WebSocket y SSE funcionan en el mismo puerto que la API

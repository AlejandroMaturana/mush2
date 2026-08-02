# Deploy Render — Hoja de Ruta

> Rama: `develop` | Fecha: 2026-07-14 | Plataforma: Render

---

## Arquitectura del Deploy

```
┌─────────────────────────────────────────────┐
│            RENDER PROJECT                   │
│                                             │
│  ┌─────────────┐    ┌───────────────────┐   │
│  │  PostgreSQL  │◄───│  mush2 (web)      │   │
│  │  free tier   │    │  Dockerfile       │   │
│  └─────────────┘    │                   │   │
│                     │  ├─ Express API   │   │
│                     │  ├─ WebSocket     │   │
│                     │  ├─ MQTT Bridge   │   │
│                     │  ├─ SSE Events    │   │
│                     │  └─ Frontend ★    │   │
│                     └───────────────────┘   │
│                                             │
│  ★ Frontend servido como estáticos desde    │
│    backend/public (Vite build output)       │
└─────────────────────────────────────────────┘
```

**Un solo servicio** que sirve backend + frontend. Sin CORS, sin proxies intermedios.

---

## Archivos Creados/Modificados

| Archivo | Acción | Propósito |
|---|---|---|
| `Dockerfile` | **Nuevo** | Multi-stage: build frontend + production backend |
| `.dockerignore` | **Nuevo** | Mantiene la imagen Docker ligera |
| `render.yaml` | **Nuevo** | Blueprint: web service + PostgreSQL |
| `backend/src/app.js` | **Modificado** | Sirve archivos estáticos del frontend en producción |
| `.env.example` | **Modificado** | Agregadas variables de referencia para Render |

---

## Pasos para Deploy

### 1. Crear Cuenta
1. Ir a [render.com](https://render.com)
2. Sign in con GitHub

### 2. Método A: Blueprint (recomendado)

Usa `render.yaml` para crear todo de una vez.

1. En el Dashboard, clic **New +** > **Blueprint**
2. Conecta tu repo de GitHub (`AlejandroMaturana/mush2`)
3. Render detecta `render.yaml` y muestra lo que va a crear:
   - **mush2** (Web Service — Docker)
   - **mush2-db** (PostgreSQL — Free)
4. Clic **Deploy**
5. Una vez desplegado, ir a **mush2** > **Environment** y agregar:
   ```
   CORS_ORIGIN=https://mush2.onrender.com
   ```
   (Reemplaza con la URL real que Render asignó)
6. **Manual Deploy** > **Deploy latest commit**

### 3. Método B: Manual (paso a paso)

#### Paso 1 — PostgreSQL
1. **New +** > **Postgres**
2. **Name**: `mush2-db`
3. **Database Name**: `mush2`
4. **Plan**: Free
5. Clic **Create Database**
6. Esperar que esté activo. Copiar estos valores (los necesitarás después):
   - **Internal Database URL**
   - **User**
   - **Password**
   - **Host**
   - **Port**

#### Paso 2 — Web Service
1. **New +** > **Web Service**
2. Conecta tu repo GitHub
3. Configura:
   - **Name**: `mush2`
   - **Runtime**: seleccionar **Docker** (en el dropdown de Language)
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free
4. En **Environment Variables**, agregar manualmente:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | (genera uno: `openssl rand -hex 32`) |
   | `CORS_ORIGIN` | `https://mush2.onrender.com` |
   | `DATABASE_URL` | (copiar Internal Database URL de PostgreSQL) |
   | `DB_USER` | (copiar User de PostgreSQL) |
   | `DB_HOST` | (copiar Host de PostgreSQL) |
   | `DB_NAME` | `mush2` |
   | `DB_PASSWORD` | (copiar Password de PostgreSQL) |
   | `DB_PORT` | (copiar Port de PostgreSQL) |

5. Clic **Create Web Service**

### 4. Variables Opcionales

Agregar en Environment del Web Service si las necesitas:

| Variable | Descripción |
|---|---|
| `MQTT_BROKER` | Broker MQTT personalizado |
| `MQTT_BROKER_FALLBACK` | Broker MQTT respaldo |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `TELEGRAM_BOT_USERNAME` | Username del bot de Telegram |

### 5. Verificar
1. En el dashboard, abrir la URL asignada por Render
2. Landing page de Mush2 debería cargar
3. Navegar a `GET /health` → `{"status":"ok","uptime":...}`
4. Registrar usuario
5. Verificar dashboard

---

## Free Tier — Limitaciones

| Aspecto | Detalle |
|---|---|
| RAM | 512 MB |
| CPU | Compartido |
| Sleep | After 15 min sin tráfico |
| Cold start | ~30-60s al despertar |
| Horas/mes | 750 (suficiente para uso personal) |
| PostgreSQL | Free tier expira a los **30 días** (luego se elimina) |

### Mantener el servicio vivo (anti-sleep)

Para evitar que el servicio se duerma, configurar un ping cada 14 minutos.

**Opción A**: [cron-job.org](https://cron-job.org) (gratis)
1. Crear cuenta
2. Nuevo cron job: `GET https://mush2.onrender.com/health`
3. Frecuencia: cada 14 minutos

**Opción B**: [UptimeRobot](https://uptimerobot.com) (gratis)
1. Crear cuenta
2. Add Monitor: HTTP(s)
3. URL: `https://mush2.onrender.com/health`
4. Intervalo: 5 minutos

---

## Troubleshooting

### Build falla con pnpm
- Verificar `pnpm-lock.yaml` commiteado en el repo
- Si el lockfile no existe: `pnpm install` localmente y commitear

### Cold start muy lento
- Normal en free tier (~30-60s)
- Configurar keep-alive para evitar sleep

### Frontend no carga (404)
- Verificar que `backend/public/` existe en la imagen
- Revisar logs de Render: **Logs** tab en el dashboard

### CORS errors
- `CORS_ORIGIN` debe coincidir exactamente con la URL de Render
- Incluir `https://` y sin trailing slash
- Ejemplo: `https://mush2.onrender.com`

### WebSocket no conecta
- Render soporta WebSocket en Web Services
- Path: `/ws?deviceId=xxx`
- Verificar que el proxy de Render no interrumpe la conexión

### Base de datos no conecta
- Verificar que PostgreSQL está en el mismo proyecto
- `DATABASE_URL` se inyecta vía `fromDatabase` en render.yaml
- El backend usa `env.DB.url` que lee `DATABASE_URL`

### PostgreSQL free tier expira (30 días)
- Render envía email antes de eliminar
- Tienes 14 días de gracia para upgrade a plan pago
- Opciones: upgrade a Starter ($7/mes) o migrar a Neon/Supabase

---

## Rollback

1. En Render Dashboard > **Events**
2. Seleccionar deploy anterior > **Rollback**
3. O: revertir en git y push a `develop` (auto-deploy)

---

## Siguientes Pasos

- [ ] Configurar cron-job.org/UptimeRobot para keep-alive
- [ ] Evaluar upgrade a Starter plan ($7/mes) para evitar cold start
- [ ] Monitorear expiración de PostgreSQL free tier (30 días)
- [ ] Considerar migrar DB a Neon/Supabase si se necesita permanencia

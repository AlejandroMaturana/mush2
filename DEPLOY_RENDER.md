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
1. **New +** > **Blueprint**
2. Conectar repo `AlejandroMaturana/mush2`
3. Render detecta `render.yaml` y crea:
   - Web Service `mush2` (Dockerfile)
   - PostgreSQL `mush2-db` (free tier)
4. Configurar `CORS_ORIGIN` en Environment del servicio web:
   ```
   CORS_ORIGIN=https://mush2.onrender.com
   ```
5. Deploy automático

### 3. Método B: Manual
1. **New +** > **Web Service**
2. Conectar repo GitHub
3. Configurar:
   - **Name**: `mush2`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free
4. Agregar variables de entorno (ver tabla abajo)
5. **Create Web Service**

#### Agregar PostgreSQL:
1. **New +** > **PostgreSQL**
2. **Name**: `mush2-db`
3. **Plan**: Free
4. Copiar `Internal Database URL` y agregar como `DATABASE_URL` al servicio web

### 4. Variables de Entorno

| Variable | Origen | Descripción |
|---|---|---|
| `NODE_ENV` | `production` | Modo producción |
| `PORT` | Auto (Render) | Puerto asignado |
| `DATABASE_URL` | PostgreSQL addon | URL de conexión |
| `JWT_SECRET` | Auto (render.yaml) | Secreto JWT (generado) |
| `CORS_ORIGIN` | Manual | URL del servicio web |
| `DB_USER` | PostgreSQL addon | Usuario de DB |
| `DB_HOST` | PostgreSQL addon | Host de DB |
| `DB_NAME` | PostgreSQL addon | Nombre de DB |
| `DB_PASSWORD` | PostgreSQL addon | Password de DB |
| `DB_PORT` | PostgreSQL addon | Puerto de DB |

### 5. Variables Opcionales

| Variable | Descripción |
|---|---|
| `MQTT_BROKER` | Broker MQTT personalizado |
| `MQTT_BROKER_FALLBACK` | Broker MQTT respaldo |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `TELEGRAM_BOT_USERNAME` | Username del bot de Telegram |

### 6. Verificar
1. Abrir la URL asignada por Render
2. Landing page de Mush2 debería cargar
3. `GET /health` → `{"status":"ok","uptime":...}`
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
| PostgreSQL | Free tier dura 90 días, luego se elimina |

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

### PostgreSQL free tier expira (90 días)
- Render envía email antes de eliminar
- Opciones: upgrade a plan pago o migrar a otra DB

---

## Rollback

1. En Render Dashboard > **Events**
2. Seleccionar deploy anterior > **Rollback**
3. O: revertir en git y push a `develop` (auto-deploy)

---

## Siguientes Pasos

- [ ] Configurar cron-job.org/UptimeRobot para keep-alive
- [ ] Evaluar upgrade a Starter plan ($7/mes) para evitar cold start
- [ ] Monitorear expiración de PostgreSQL free tier (90 días)
- [ ] Considerar migrar DB a Neon/Supabase si se necesita permanencia

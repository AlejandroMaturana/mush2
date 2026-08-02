# Mush2 — Entorno de Desarrollo (DEV)

> Documento de referencia para levantar el stack de desarrollo local desde un clon limpio.
> Aplica únicamente al ambiente DEV. Producción (Render, TLS, CI/CD) queda fuera de este documento.

---

## Índice

1. [Propósito](#1-propósito)
2. [Alcance DEV](#2-alcance-dev)
3. [Arquitectura DEV](#3-arquitectura-dev)
4. [Servicios Docker DEV](#4-servicios-docker-dev)
5. [Prerrequisitos](#5-prerrequisitos)
6. [Bootstrap desde clon limpio](#6-bootstrap-desde-clon-limpio)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Backend](#8-backend)
9. [Frontend](#9-frontend)
10. [Simulador de dispositivo](#10-simulador-de-dispositivo)
11. [Firmware ESP32](#11-firmware-esp32)
12. [Gestión de usuarios MQTT](#12-gestión-de-usuarios-mqtt)
13. [Verificación del entorno](#13-verificación-del-entorno)
14. [Comandos operativos frecuentes](#14-comandos-operativos-frecuentes)
15. [Cierre correcto del entorno](#15-cierre-correcto-del-entorno)
16. [Troubleshooting](#16-troubleshooting)
17. [Referencias](#17-referencias)

---

## 1. Propósito

Cualquier desarrollador puede clonar el repositorio, seguir los pasos de este documento y levantar el stack completo de desarrollo sin depender de archivos locales ocultos, configuraciones manuales no documentadas ni infraestructura compartida con producción.

Criterio de éxito: **un clon limpio levanta el stack DEV completo siguiendo solo esta documentación.**

---

## 2. Alcance DEV

El entorno DEV contempla:

- **Backend** Node.js + Express + Sequelize (PostgreSQL)
- **Frontend** React + Vite
- **PostgreSQL DEV** en contenedor Docker
- **Mosquitto DEV** (broker MQTT con autenticación y ACL)
- **Simulador de dispositivo** (emula el firmware ESP32)
- **Firmware ESP32** (opcional — requiere hardware; el simulador lo reemplaza en DEV)

Está **fuera de alcance**: Render, TLS productivo, CI/CD productivo, escalamiento y monitoreo público.

---

## 3. Arquitectura DEV

```
┌─────────────────────────────────────────────────────────┐
│                   Developer Machine                      │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐ │
│  │ Frontend │    │   Backend    │    │  Docker Compose │ │
│  │ React    │───▶│ Node/Express │───▶│  (DEV Stack)    │ │
│  │ Vite     │    │  :3797       │    │                 │ │
│  │ :5173    │    │              │    │  ┌───────────┐  │ │
│  └──────────┘    │  ┌─────────┐ │    │  │ PostgreSQL│  │ │
│       ▲          │  │Sequelize│─│────│──│ :5433     │  │ │
│       │          │  └─────────┘ │    │  └───────────┘  │ │
│       │          │              │    │                 │ │
│       │          │  ┌─────────┐ │    │  ┌───────────┐  │ │
│       │          │  │  MQTT   │─│────│──│ Mosquitto  │  │ │
│       │          │  │ Bridge  │ │    │  │ :1884      │  │ │
│       │          │  └─────────┘ │    │  └───────────┘  │ │
│       │          └──────────────┘    └────────────────┘ │
│       │                                                  │
│       ├── SSE /events :3797                              │
│       │                                                  │
│  ┌────┴──────────┐                                       │
│  │  Simulador    │                                       │
│  │  (o ESP32-S3) │──── MQTT ────────────────────────────▶│
│  └───────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### Flujo de comunicación

| Origen → Destino | Protocolo | Puerto | Ruta |
|---|---|---|---|
| Frontend → Backend | HTTP (REST) | `:3797` | `/api/v1/*` (proxy Vite) |
| Frontend → Backend | SSE | `:3797` | `/events` (proxy Vite) |
| Backend → PostgreSQL | TCP | `:5433` (host) → `5432` (container) | `mush2_dev` |
| Backend → Mosquitto | MQTT | `:1884` (host) → `1883` (container) | usuario `backend_bridge` |
| Simulador/Firmware → Mosquitto | MQTT | `:1884` | credenciales por dispositivo (ADR-028) |

> El frontend en desarrollo usa el proxy de Vite (`frontend/vite.config.js`), que redirige `/api` y `/events` a `localhost:3797`. No hay problemas de CORS porque el proxy actúa como mismo origen.

---

## 4. Servicios Docker DEV

Definidos en `docker-compose.dev.yml`. Son **completamente independientes** de producción (ADR-029): no comparten contenedores, volúmenes ni redes con `docker-compose.yml`.

| Servicio | Container | Imagen | Puerto host | Puerto interno | Volúmenes | Red |
|---|---|---|---|---|---|---|
| `dev-mosquitto` | `mush2-dev-mosquitto` | `eclipse-mosquitto:2` | `1884` | `1883` | `mush2-dev-mosquitto-data`, `mush2-dev-mosquitto-log` | `mush2-dev-internal` |
| `dev-postgres` | `mush2-dev-postgres` | `postgres:16-alpine` | `5433` | `5432` | `mush2-dev-pgdata` | `mush2-dev-internal` |

> Backend y frontend **no** se contenerizan en DEV: corren como procesos nativos en la máquina del desarrollador.

### Archivos de configuración

**Mosquitto** — `docker/mosquitto/dev/`:

```
mosquitto.conf          # Configuración del broker DEV (ADR-029)
acl.conf                # ACL para DEV (usuarios y topics)
password_file           # Credenciales (gitignored — generar con script)
password_file.example   # Template versionado en Git
```

**PostgreSQL** — imagen oficial `postgres:16-alpine`, variables vía `docker-compose.dev.yml` y `.env.development`, datos persistentes en el volumen `mush2-dev-pgdata`.

---

## 5. Prerrequisitos

- **Node.js 20+** (el repo usa pnpm como gestor de paquetes)
- **pnpm 10.x** (`npm install -g pnpm` o via Corepack)
- **Docker Desktop** con el motor Docker en ejecución
- **Git**
- **Windows:** PowerShell (los scripts auxiliares `*.ps1` son nativos de Windows)
- **Linux/Mac:** Bash + `mosquitto_passwd` (incluido en `mosquitto-clients`: `sudo apt install mosquitto-clients`)

---

## 6. Bootstrap desde clon limpio

Todos los comandos se ejecutan **desde la raíz del repositorio** salvo que se indique lo contrario.

### Paso a paso

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd mush2

# 2. Crear configuración local (NUNCA commitear estos archivos)
cp .env.development.example .env.development

# 3. Ajustar credenciales sensibles en .env.development (opcional, defaults funcionales)
#    Editar DB_PASSWORD, JWT_SECRET, MQTT_BROKER_PASS si se desea

# 4. Iniciar infraestructura Docker DEV (PostgreSQL + Mosquitto)
docker compose -f docker-compose.dev.yml up -d

# 5. Verificar contenedores
docker ps --filter "name=mush2-dev-"

# 6. Generar usuarios MQTT
#    Windows (PowerShell):
.\scripts\dev-mqtt-setup.ps1
#    Linux/Mac (Bash):
# ./scripts/create-mqtt-user.sh backend_bridge <tu_password> dev

# 7. Instalar dependencias de todos los workspaces (backend, frontend, simulator, ...)
pnpm install

# 8. Inicializar base de datos (sincronizar esquema + seed DEV)
pnpm --dir backend run db:sync
pnpm --dir backend run db:seed:dev

# 9. Iniciar backend
pnpm --dir backend run dev

# 10. (Opcional) Iniciar frontend
pnpm --dir frontend run dev
#     Abrir http://localhost:5173

# 11. (Opcional) Iniciar simulador de dispositivo
pnpm --dir simulator run dev
```

> **Importante:** el backend corre con working directory `backend/`, pero carga `.env` y `.env.development` **desde la raíz del repositorio** (`backend/src/config/env.js` resuelve rutas relativas contra la raíz). Nunca crear `.env` dentro de `backend/`.

---

## 7. Variables de entorno

### Orden de carga (backend)

1. `.env` — base compartida (credenciales WiFi, ThingSpeak, DEVICE_ID)
2. `.env.development` — valores específicos DEV (sobrescriben `.env`)

Ambos en la **raíz del repositorio**. `NODE_ENV` se detecta de `process.env` y por defecto es `development`.

### Tabla de variables DEV

Fuente de verdad: `backend/src/config/env.js` y `.env.development.example`.

| Variable | Propósito | Default en `env.js` | Esperado en DEV | Obligatoria |
|---|---|---|---|---|
| `NODE_ENV` | Ambiente activo | `'development'` | `development` | Sí |
| `PORT` | Puerto del backend | `3797` | `3797` | Sí |
| `DB_NAME` | Nombre DB | `'mush2'` | `mush2_dev` | Sugerida |
| `DB_USER` | Usuario DB | `'postgres'` | `mush2_dev` | Sugerida |
| `DB_HOST` | Host DB | `'localhost'` | `localhost` | Sí |
| `DB_PORT` | Puerto DB | `5432` | `5433` | Sí |
| `DB_PASSWORD` | Contraseña DB | `''` | según `.env.development` | Sí |
| `DATABASE_URL` | URL completa DB | `undefined` | `postgresql://...@localhost:5433/mush2_dev` | Alternativa |
| `JWT_SECRET` | Secreto JWT | `'dev-secret-change-in-production'` | cualquiera distinto del default | Sí |
| `MQTT_BROKER_URL` | URL del broker | `'mqtt://localhost:1883'` | `mqtt://localhost:1884` | Sí |
| `MQTT_BROKER_USER` | Usuario MQTT bridge | `'backend_bridge'` | `backend_bridge` | Sí |
| `MQTT_BROKER_PASS` | Contraseña bridge | `''` | según `.env.development` | Sí |
| `MOSQUITTO_CONTAINER` | Container para restart | `'mush2-mosquitto'` | `mush2-dev-mosquitto` | Sugerida |
| `MOSQUITTO_PASSWORD_FILE` | Ruta password_file | env-aware (dev/prod) | `docker/mosquitto/dev/password_file` | Sugerida |
| `CORS_ORIGIN` | Origen CORS | `'http://localhost:5173'` | `http://localhost:5173` | Sí |
| `LOG_LEVEL` | Nivel de log | `'info'` | `debug` | Sugerida |

> `MOSQUITTO_PASSWORD_FILE` se resuelve por ambiente si no se define: `docker/mosquitto/dev/password_file` en DEV y `docker/mosquitto/prod/password_file` en PROD. La ruta es relativa a la raíz del repo y el backend la resuelve antes de usarla.

---

## 8. Backend

```bash
# Iniciar en modo desarrollo (watch)
pnpm --dir backend run dev

# Iniciar sin watch
pnpm --dir backend run start

# Sincronizar esquemas con la DB (aplica cambios de modelos)
pnpm --dir backend run db:sync

# Seed DEV (guarda NODE_ENV=development)
pnpm --dir backend run db:seed:dev

# Seed genérico (otros ambientes)
pnpm --dir backend run db:seed

# Tests
pnpm --dir backend run test:all     # Jest + Vitest
pnpm --dir backend run test         # Jest
pnpm --dir backend run test:ddd     # Vitest (tests de dominio)
pnpm --dir backend run test:ci      # Jest + Vitest con cobertura
```

> El backend arranca el servidor HTTP antes de inicializar los servicios secundarios (MQTT bridge, WebSocket, control engine, Telegram) para un primer byte rápido.

---

## 9. Frontend

```bash
pnpm --dir frontend run dev
# Abrir http://localhost:5173
```

- No requiere variables de entorno: usa defaults y el proxy de Vite (`/api` y `/events` → `localhost:3797`).
- Tests: `pnpm --dir frontend run test`

---

## 10. Simulador de dispositivo

Emula el firmware ESP32: publica telemetría/status conforme al contrato canónico y responde a comandos con ACK (ADR-030).

```bash
# Iniciar (con watch)
pnpm --dir simulator run dev

# Iniciar (sin watch)
pnpm --dir simulator run start

# Tests
pnpm --dir simulator run test
```

### Flujo de arranque

1. Resuelve credenciales MQTT en orden: variables de entorno → archivo persistido → **registro contra el backend** (`POST /api/v1/devices/register`, ADR-028).
2. Conecta a MQTT con `clientId = deviceId` (requerido por las ACL `pattern %c` del broker).
3. Persiste las credenciales provisionadas en `.sim-credentials.json` para reutilizarlas en el siguiente arranque.

### Variables de entorno (`simulator/.env.example`)

| Variable | Default | Propósito |
|---|---|---|
| `SIM_DEVICE_ID` | `sim_001` | Identidad del dispositivo virtual |
| `SIM_BROKER_URL` | `mqtt://localhost:1884` | Broker MQTT DEV |
| `SIM_API_URL` | `http://localhost:3797/api/v1` | API del backend (registro ADR-028) |
| `SIM_TELEMETRY_INTERVAL_MS` | `10000` | Intervalo de publicación de telemetría |
| `SIM_TELEMETRY_MODE` | `drift` | `drift` (random walk) o `fixed` (determinístico) |
| `SIM_SEED` | `12345` | Semilla del PRNG en modo drift |
| `SIM_TOPIC_PREFIX` | `mush2` | Prefijo de topics canónicos |
| `SIM_MQTT_USER` / `SIM_MQTT_PASS` | `''` | Credenciales explícitas (opcional) |
| `SIM_CREDENTIALS_FILE` | `.sim-credentials.json` | Archivo de credenciales provisionadas |

---

## 11. Firmware ESP32

El firmware (ESP32-S3, PlatformIO) **no es necesario para el entorno DEV**: el simulador cubre el rol de dispositivo. Si se dispone de hardware, el firmware usa las mismas credenciales por dispositivo provisionadas por el backend (ADR-028) y los mismos topics canónicos. Ver `docs/architecture/firmware.md` para detalles.

---

## 12. Gestión de usuarios MQTT

### Windows (PowerShell) — recomendado

`scripts/dev-mqtt-setup.ps1` es idempotente y cubre el flujo completo:

```powershell
.\scripts\dev-mqtt-setup.ps1
```

Crea/actualiza los usuarios `backend_bridge` y `dev_device_dev_001`, reinicia el broker y valida que ambos autentiquen correctamente. Requiere Docker corriendo y el contenedor `mush2-dev-mosquitto` activo.

### Linux/Mac (Bash)

```bash
# Modo directo
./scripts/create-mqtt-user.sh backend_bridge <password> dev

# Modo interactivo
./scripts/create-mqtt-user.sh
```

El script crea `docker/mosquitto/dev/password_file` si no existe y ejecuta `mosquitto_passwd -b` para agregar o actualizar el usuario.

### Ubicación del password_file

- **DEV:** `docker/mosquitto/dev/password_file` (gitignored — no commitear)
- Template versionado: `docker/mosquitto/dev/password_file.example`
- **PROD:** `docker/mosquitto/prod/password_file` (separado, ADR-029)

### Reinicio del broker

Después de modificar el password_file, reiniciar para aplicar cambios:

```bash
docker restart mush2-dev-mosquitto
```

El backend ejecuta este reinicio automáticamente al provisionar un dispositivo, usando el container name de `MOSQUITTO_CONTAINER`.

---

## 13. Verificación del entorno

```bash
# Health check del backend (estados: starting 503 / ready 200 / degraded 200)
curl http://localhost:3797/health
# → {"status":"ready","uptime":1.2,"startedAt":"...","readyAt":"...",
#    "services":{"dbSync":{"status":"ok",...},"webSocket":{...},"controlEngine":{...},"mqttBridge":{...},"telegram":{...}}}

# Contenedores DEV activos
docker ps --filter "name=mush2-dev-"

# Conexión a PostgreSQL DEV
docker exec -it mush2-dev-postgres psql -U mush2_dev -d mush2_dev

# Logs de Mosquitto
docker logs mush2-dev-mosquitto --tail 50

# Verificar autenticación MQTT (probar suscripción con el bridge)
mosquitto_sub -h localhost -p 1884 -u backend_bridge -P <password> -t "mush2/+/telemetry" -v
```

### Prueba de flujo completa con el simulador

1. Stack DEV levantado (paso 6 del bootstrap).
2. Backend corriendo (`pnpm --dir backend run dev`).
3. `pnpm --dir simulator run dev` — se registra, conecta a MQTT y publica telemetría.
4. En la terminal del backend deben aparecer los eventos de telemetría recibidos.
5. (Opcional) Ver la telemetría en el frontend en http://localhost:5173.

---

## 14. Comandos operativos frecuentes

### Docker Compose DEV

```bash
# Iniciar stack
docker compose -f docker-compose.dev.yml up -d

# Logs en tiempo real
docker compose -f docker-compose.dev.yml logs -f

# Reiniciar un servicio
docker compose -f docker-compose.dev.yml restart dev-mosquitto

# Detener stack (conserva volúmenes)
docker compose -f docker-compose.dev.yml down

# Detener y eliminar volúmenes (borra datos DEV)
docker compose -f docker-compose.dev.yml down -v
```

### Mosquitto

```bash
# Logs del broker
docker logs mush2-dev-mosquitto --tail 50

# Publicar un mensaje de prueba
mosquitto_pub -h localhost -p 1884 -u backend_bridge -P <password> -t "mush2/test/telemetry" -m '{"temp":25}'
```

### PostgreSQL

```bash
# Conectar a la DB DEV
docker exec -it mush2-dev-postgres psql -U mush2_dev -d mush2_dev

# Backup rápido
docker exec mush2-dev-postgres pg_dump -U mush2_dev mush2_dev > backup.sql
```

---

## 15. Cierre correcto del entorno

Detener los componentes en el orden inverso al arranque:

```bash
# 1. Detener el simulador (Ctrl+C) y el frontend (Ctrl+C) si estaban corriendo

# 2. Detener el backend (Ctrl+C)

# 3. Detener el stack Docker DEV (conserva volúmenes y datos)
docker compose -f docker-compose.dev.yml down
```

- `docker compose down` **conserva** los volúmenes (datos de PostgreSQL y logs de Mosquitto).
- Para borrar todo el estado DEV (por ejemplo, datos corruptos): `docker compose -f docker-compose.dev.yml down -v`.

---

## 16. Troubleshooting

### password_file ausente

**Síntoma:** Mosquitto no inicia, log con:
```
password-file: Error: Unable to open pwfile "/mosquitto/config/password_file"
```

**Causa:** `docker/mosquitto/dev/password_file` no existe (clon fresco o archivo eliminado). Está gitignored.

**Solución:**
```powershell
# Windows
.\scripts\dev-mqtt-setup.ps1

# Linux/Mac
./scripts/create-mqtt-user.sh backend_bridge <password> dev
docker restart mush2-dev-mosquitto
```

### Conflictos de puertos

**Síntoma:** `docker compose up` falla con `port is already allocated`.

**Verificar:**
```bash
netstat -ano | findstr ":5433"
netstat -ano | findstr ":1884"
```

**Solución:** detener el proceso conflictivo o cambiar el mapeo en `docker-compose.dev.yml`.

### Backend no conecta a MQTT

**Síntoma:** log del backend con `MQTT connection failed` o `ECONNREFUSED :1884`.

**Verificar:**
1. ¿Mosquitto está corriendo? `docker ps | grep mush2-dev-mosquitto`
2. ¿El usuario `backend_bridge` está en el password_file? Re-ejecutar `dev-mqtt-setup.ps1` o `create-mqtt-user.sh`.
3. ¿Credenciales correctas? `docker logs mush2-dev-mosquitto | grep -i "auth\|denied"`

### Backend no conecta a PostgreSQL

**Síntoma:** log con `connect ECONNREFUSED :5433`.

**Verificar:**
1. ¿PostgreSQL está corriendo? `docker ps | grep mush2-dev-postgres`
2. ¿Las credenciales de `.env.development` coinciden con `docker-compose.dev.yml`? `DB_USER`, `DB_PASSWORD`, `DB_NAME` deben coincidir con `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

### Error de configuración fail-fast

**Síntoma:** el backend se detiene al arrancar con un mensaje de validación.

**Causa:** `backend/src/config/ConfigurationService.js` valida variables críticas al inicio. Si `NODE_ENV`, credenciales DB/MQTT o rutas obligatorias faltan, aborta con un mensaje descriptivo.

**Solución:** corregir `.env.development` según la sección [7](#7-variables-de-entorno) y reintentar.

### Reset de datos DEV

**Síntoma:** base de datos corrupta o datos inconsistentes tras pruebas.

**Solución:** eliminar volúmenes y reconstruir:
```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
pnpm --dir backend run db:sync
pnpm --dir backend run db:seed:dev
```

> `down -v` elimina **todos** los volúmenes DEV, incluidos datos de PostgreSQL y logs de Mosquitto.

---

## 17. Referencias

- `docker-compose.dev.yml` — definición del stack DEV (ADR-029)
- `docker-compose.yml` — stack local producción-like (backend contenerizado, no usar en DEV)
- `.env.development.example` — template de variables DEV
- `backend/src/config/env.js` — carga centralizada de configuración
- `backend/src/config/ConfigurationService.js` — validación fail-fast
- `scripts/dev-mqtt-setup.ps1` — provisioning MQTT DEV (Windows)
- `scripts/create-mqtt-user.sh` — gestión de usuarios MQTT (Linux/Mac)
- `docs/contracts/conformance/` — contratos canónicos MQTT (schemas y ejemplos)
- `docs/architecture/firmware.md` — firmware ESP32

# Despliegue — Mush2

## Entornos

| Entorno | Propósito | URL | DB |
|---|---|---|---|
| `development` | Desarrollo local | `localhost:3797` | PostgreSQL local |
| `production` | Render (web service `mush2`, plan free) | `https://mush2.onrender.com` | Render PostgreSQL (`mush2-db`) |

## Desarrollo Local

### Backend
```bash
cd backend
pnpm install
# Editar .env con credenciales locales (nunca commiteado)
pnpm run dev  # Node.js 22 --watch (--watch-path=src), puerto 3797
# Utilidades:
pnpm run db:migrate    # migraciones Sequelize
pnpm run db:seed       # seed base (node src/seed.js)
pnpm run db:seed:dev   # seed de desarrollo
pnpm run admin:create  # crear usuario admin/operador
```

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev  # Vite, puerto 5173, proxy /api y /events a localhost:3797
```

### Firmware
```bash
cd firmware
python generate_config.py ../.env  # genera config.h desde .env
pio run --target upload            # flashear ESP32-S3-DevKitC-1
pio device monitor                 # logs serial 115200 baud
```

## CI/CD (GitHub Actions)

Workflow en `.github/workflows/ci.yml` (gate de PR) y `.github/workflows/release.yml` (release train D11):

- **Firmware**: `pio run` compila el ESP32-S3; tests nativos + sketch build (workflow completo: `firmware` job)
- **Backend**: Jest + Vitest con PostgreSQL 16 y Node.js 22 (alineado con runtime de prod); incluye validación de versiones (`scripts/check-version-manifest.cjs`, I078)
- **Frontend**: `pnpm build` + tests con Vite
- **Security**: audit de dependencias (npm/pnpm + OSV) y gitleaks para secretos
- **Deploy (I067)**: en push a `main` dispara el hook de Render y verifica `GET /health` → 200 (activo solo si existe el secreto `RENDER_DEPLOY_HOOK`; sin URL falsa hardcodeada)
- **Release (I082/I062)**: en push a `develop` abre la PR "Release: version packages" (`pnpm version-packages`); al mergearla a `main` crea el tag `vX.Y.Z` + GitHub Release (`scripts/release.js`). Reemplaza el flujo manual de `scripts/release.bat`.

## Seed Data

```bash
cd backend
pnpm run db:seed  # node src/seed.js — crea datos base; usuarios admin/operador vía `pnpm run admin:create`
```

## Seguridad

### Secretos (ADR-013)
- `.env` NUNCA se commitea (añadido a `.gitignore`)
- `config.h` generado desde `.env` vía `generate_config.py`
- Firmware: credenciales migrando a NVS (no en `config.h` en texto plano)
- JWT_SECRET y ENCRYPTION_KEY son variables separadas

### Transporte
- Backend: TLS con Let's Encrypt (futuro)
- MQTT: TLS 8883 activo en el broker Mosquitto (ISSUE-074/075) con ACL por dispositivo (DECISION-006)
- **Broker MQTT (Mosquitto 2.x):** plan de despliegue en [`broker-deployment.md`](broker-deployment.md) — contenedor + TLS 8883 + ACL por dispositivo; **ejecutado** (provisioning ISSUE-081 y verificación automática ISSUE-065). Verificación: `bash scripts/verify-broker-provisioning.sh` (9/9 checks).

## Healthcheck (I069)

- `Dockerfile`: `HEALTHCHECK` sobre `GET http://127.0.0.1:3797/health` (público, 200/503)
- `docker-compose.yml`: healthchecks para `postgres` (`pg_isready`) y `mosquitto` (`nc -z 8883`); el backend arranca con `depends_on: condition: service_healthy`
- Render usa `healthCheckPath: /health` (`render.yaml`)

# Despliegue — Mush2

## Entornos

| Entorno | Propósito | URL | DB |
|---|---|---|---|
| `development` | Desarrollo local | `localhost:3797` | PostgreSQL local |

## Desarrollo Local

### Backend
```bash
cd backend
pnpm install
# Editar .env con credenciales locales (nunca commiteado)
pnpm run dev  # nodemon, puerto 3797, auto-sync DB
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

Workflow en `.github/workflows/ci.yml`:
- **Firmware**: `pio run` compila el ESP32-S3
- **Backend**: Jest + Supertest con PostgreSQL 16 (Node.js 22, alineado con runtime de prod)
- **Frontend**: `pnpm build` con Vite

## Seed Data

```bash
cd backend
node src/scripts/seed.js  # Crea usuario admin / admin123 (SUPER_ADMIN)
```

## Seguridad

### Secretos (ADR-013)
- `.env` NUNCA se commitea (añadido a `.gitignore`)
- `config.h` generado desde `.env` vía `generate_config.py`
- Firmware: credenciales migrando a NVS (no en `config.h` en texto plano)
- JWT_SECRET y ENCRYPTION_KEY son variables separadas

### Transporte
- Backend: TLS con Let's Encrypt (futuro)
- MQTT: deshabilitar bridge público o asegurar con TLS (ADR-013 Fase 1)
- **Broker MQTT (Mosquitto 2.x):** plan de despliegue en [`broker-deployment.md`](broker-deployment.md) (PR-G, ISSUE-065) — contenedor + TLS 8883 + ACL por dispositivo (DECISION-006); ejecución diferida a ISSUE-075/081.

## Broker MQTT de producción

El despliegue del broker Mosquitto de producción está **planificado pero no ejecutado** (PR-G, Ciclo 0). Ver [`broker-deployment.md`](broker-deployment.md) para: arquitectura, pasos, gestión de secretos, rollback, migración y verificación. No poblar `MQTT_BROKER_URL`/`MQTT_BROKER_PASS` en Render hasta cerrar ISSUE-075 (TLS) e ISSUE-081 (provisioning).

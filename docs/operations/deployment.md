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
cd firmware-esp32
python generate_config.py ../.env  # genera config.h desde .env
pio run --target upload            # flashear ESP32-S3-DevKitC-1
pio device monitor                 # logs serial 115200 baud
```

## CI/CD (GitHub Actions)

Workflow en `.github/workflows/ci.yml`:
- **Firmware**: `pio run` compila el ESP32-S3
- **Backend**: Jest + Supertest con PostgreSQL 18
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
- ThingSpeak: migrar a HTTPS (TS_PORT=443, WiFiClientSecure)
- Backend: TLS con Let's Encrypt (futuro)
- MQTT: deshabilitar bridge público o asegurar con TLS (ADR-013 Fase 1)

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
# Editar .env con credenciales locales
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
python generate_config.py ../.env  # genera config.h
pio run --target upload -e d1      # flashear LOLIN D1 R1
pio device monitor                 # logs serial 115200 baud
```

## CI/CD (GitHub Actions)

Workflow en `.github/workflows/ci.yml`:
- **Firmware**: `pio run -e d1` compila el ESP8266
- **Backend**: Jest + Supertest con PostgreSQL 18
- **Frontend**: `pnpm build` con Vite

## Seed Data

```bash
cd backend
node src/scripts/seed.js  # Crea usuario admin / admin123 (SUPER_ADMIN)
```

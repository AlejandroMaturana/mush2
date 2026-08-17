# ── Stage 1: Build frontend ──────────────────────────────────────
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS frontend-build

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

RUN pnpm install --frozen-lockfile

COPY frontend/ frontend/
RUN cd frontend && pnpm run build


# ── Stage 2: Production ─────────────────────────────────────────
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS production

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# docker-cli: MosquittoProvisioningService.reload() envía SIGHUP al contenedor del
# broker (recarga idempotente de password_file/acl_file sin downtime — I081/INF-022).
# El socket de Docker se monta en el stack prod-like local (docker-compose.yml);
# en el PaaS el mecanismo de recarga se define en el runbook (broker-deployment.md).
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY backend/package.json backend/

RUN pnpm install --frozen-lockfile --prod

COPY backend/ backend/
# Config de mosquitto en la imagen: preserva el path por defecto de
# MQTT_PROVISIONING.passwordFile (docker/mosquitto/prod/password_file), que en
# operación es un volumen compartido rw con el broker. Certs y password_file reales
# se excluyen en .dockerignore — nunca se hornean en la imagen (I081/INF-022).
COPY docker/mosquitto docker/mosquitto
COPY --from=frontend-build /app/frontend/dist backend/public

ENV NODE_ENV=production
ENV PORT=3797

EXPOSE 3797

# HEALTHCHECK operativo (I069/INF-010): /health es público en app.js; con
# start-period se evitan falsos negativos durante migraciones de arranque.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3797/health >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "cd backend && pnpm db:migrate && node src/server.js"]

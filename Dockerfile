# ── Stage 1: Build frontend ──────────────────────────────────────
FROM node:22-alpine AS frontend-build

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

RUN pnpm install --frozen-lockfile || pnpm install

COPY frontend/ frontend/
RUN cd frontend && pnpm run build


# ── Stage 2: Production ─────────────────────────────────────────
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY backend/package.json backend/

RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

COPY backend/ backend/
COPY --from=frontend-build /app/frontend/dist backend/public

ENV NODE_ENV=production
ENV PORT=3797

EXPOSE 3797

CMD ["node", "backend/src/server.js"]

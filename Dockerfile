FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

RUN pnpm install --frozen-lockfile

COPY frontend/ frontend/
RUN pnpm --filter mush2-frontend run build

RUN pnpm --filter mush2-backend deploy --prod /app/deploy

FROM node:20-alpine
WORKDIR /app/deploy
COPY --from=builder /app/deploy ./
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3797
ENV NODE_ENV=production
CMD ["node", "src/server.js"]

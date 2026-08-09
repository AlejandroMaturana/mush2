---
"mush2-backend": patch
---

feat(bootstrap): Production Bootstrap Hardening (ISSUE-060/061/068)

- Migraciones versionadas (Sequelize CLI) como único mecanismo de esquema en producción (DECISION-004 · ISSUE-061).
- Snapshot inicial versionado en `backend/src/db/migrations/20260808000001-create-initial-snapshot.cjs` (26 tablas + índices + FKs + enums).
- Scripts: `db:migrate`, `db:migrate:undo`, `db:seed:catalog`, `admin:create`.
- Dockerfile CMD: `cd backend && pnpm db:migrate && node src/server.js` (sin `sync-db.js` ni `seed.js`).
- Guard de `NODE_ENV` para seed (DECISION-008 · ISSUE-060/068): `sync-db.js` y `seed.js` rechazan ejecución en producción; catálogo idempotente separado de fixtures.
- CLI `create-admin.js` para bootstrap de usuario administrador.

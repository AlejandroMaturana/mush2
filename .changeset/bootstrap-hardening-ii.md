"mush2-backend": patch
---

feat(bootstrap): Bootstrap Hardening II (ISSUE-016/072)

- Seed hardening (ISSUE-016): bcrypt cost 10 → 12 en `seed.js` (constante exportada `SEED_BCRYPT_ROUNDS`) y en `create-admin.js` (CLI/secret), alineado con `auth.js`/`settings.js`.
- Fail-fast de configuración (ISSUE-072): `ConfigurationService.validate(env)` se ejecuta al inicio de `sync-db.js` y `seed.js`, antes de tocar la BD (ADR-029).
- Tests: `REG-011_bootstrap-config-failfast.test.ts` (7 aserciones estáticas).

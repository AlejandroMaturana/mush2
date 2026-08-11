"mush2-backend": patch
---

feat(security): Rate Limit Coverage (ISSUE-019)

- El rate limiter global ya no omite `GET /devices` ni `GET /actuators` (anti-enumeración). Límite anónimo por IP aplica a todos los endpoints `/api/v1/*`; franquicia autenticada intacta vía `subscriptionRateLimit.js`.
- Tests: `REG-012_rate-limit-coverage.test.ts` (6 aserciones estáticas).
- Impacto del polling anónimo del firmware documentado como dependencia de I59/PR-M.

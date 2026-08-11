"mush2-backend": patch
---

feat(security): Generic Error Responses (ISSUE-027)

- Middleware global de error `errorHandler.js` al final de la pila de `app.js`: cualquier `next(err)` responde `500 { error: 'SERVER_ERROR', message: 'Error interno del servidor' }` sin `err.message` al cliente; detalle logueado solo en servidor. Preserva `err.status` explícito y `res.headersSent`.
- Regresión: monitoring/admin siguen genéricos (PR-F).
- Tests: `REG-013_error-handler.test.ts` (6 aserciones) + `error-handler-global.test.ts` (2 funcionales).

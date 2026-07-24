# Definition of Done — Mush2

Checklist exhaustivo para marcar una tarea como **COMPLETADA**. Aplica a features, fixes, refactors y cualquier cambio de código.

## ✅ Checklist Técnico

### Código

- [ ] Código compila sin errores
- [ ] No hay warnings de compilador
- [ ] Sigue `coding-standards.md` (nomenclatura, estructura, patrones)
- [ ] JSDoc documentado (funciones públicas, servicios, middlewares)
- [ ] Sin código comentado/muerto
- [ ] Sin `console.log()` o `console.error()` innecesarios
- [ ] Logging con prefijos `[COMPONENT_NAME]`
- [ ] Sin secretos/tokens/contraseñas en código
- [ ] Variables/funciones con nombres descriptivos

### Tests

- [ ] Tests unitarios escritos (mínimo 60% cobertura en nuevos archivos)
- [ ] Tests pasan localmente (`pnpm test`)
- [ ] Tests pasan en CI (GitHub Actions)
- [ ] Casos de error testeados
- [ ] Tests tienen nombres descriptivos
- [ ] Mocks realizados correctamente (no side effects reales)

**Excepciones permitidas:**
- Configuración pura (`config/env.js`)
- Modelos simples sin lógica compleja
- Middleware singleton (e.g., auth)

### Seguridad

- [ ] Validación de entrada implementada (schema, tipos, ranges)
- [ ] No hay SQL injection (usando Sequelize parameterized queries)
- [ ] No hay XSS (React auto-escapa por defecto)
- [ ] Autenticación + RBAC verificadas en endpoints sensibles
- [ ] Rate limiting aplicado si es endpoint público
- [ ] Sin logging de datos sensibles (tokens, passwords, emails)
- [ ] Secretos en `.env`, NO en código

### Performance

- [ ] Database queries son eficientes (sin N+1)
- [ ] Índices creados si es necesario (nuevas tablas/columnas)
- [ ] No hay memory leaks (cleanup de listeners, timers)
- [ ] Paginación implementada en listados largos
- [ ] Frontend: bundle size verificado (`vite-bundle-visualizer`)
- [x] Firmware: memory footprint reasonable (<<80KB) — Verificado vía health_monitor.cpp (freeHeap > 30KB threshold)

---

## ✅ Checklist de Compatibilidad

### Protocolo MQTT

- [ ] Si hay cambio en tópicos MQTT: ADR creado + `docs/protocol/protocol-v1.md` actualizado
- [ ] Si hay cambio en payload: `docs/contracts/mqtt-contract.md` actualizado
- [ ] Si hay versión nueva de protocolo: `docs/protocol/VERSION` incrementado (MAJOR/MINOR/PATCH)
- [x] Backward compatibility verificada (firmware viejo vs backend nuevo) — Tests automatizados: `backward-compatibility.test.ts`

### Base de Datos

- [ ] Migración creada si hay cambios schema
- [ ] Migración es reversible (down function)
- [ ] Seeders actualizados si es necesario
- [ ] Índices definidos en migración
- [ ] DDL comentado (tablas, columnas, constraints)

### API REST

- [ ] Nuevo endpoint documentado en `docs/contracts/api-contract.md`
- [ ] Respuesta de error consistente `{ error: 'CODE', message: 'Descripción' }`
- [ ] HTTP status codes correctos (200, 201, 400, 401, 403, 404, 500)
- [ ] Versionado en URL (`/api/v1/...`)

---

## ✅ Checklist de Documentación

### Código

- [ ] JSDoc para funciones/métodos públicos
- [ ] Comentarios inline para lógica compleja (no obvio)
- [ ] README actualizado si es nuevo componente major
- [ ] Type hints (TypeScript/JSDoc) presente

### Arquitectura

- [ ] `docs/architecture/` actualizado si hay cambios significativos
- [ ] Diagrams actualizados (`.drawio`) si es visual importante
- [ ] ADR creado si es decisión arquitectónica importante

### Operacional

- [ ] `docs/deployment.md` actualizado si hay requisitos nuevos
- [ ] Variables de entorno nuevas documentadas en `.env.example`
- [ ] Instrucciones de desarrollo en `backend/README.md` o `frontend/README.md`

---

## ✅ Checklist de Historial

### Git

- [ ] Commits tienen mensajes descriptivos (`[type](scope): description`)
- [ ] Commits son atómicos (cada commit es cambio lógico)
- [ ] Commits están en orden correcto (dependencies primero)
- [ ] Sin commits "fix" arreglando commits anteriores

### Changelog

- [ ] `CHANGELOG.md` actualizado con sección `[Unreleased]`
- [ ] Entrada describe cambio en lenguaje usuario
- [ ] Formato Keep a Changelog (`### Added`, `### Fixed`, etc)

### Roadmap

- [ ] `docs/roadmap.md` actualizado si objetivo/timeline cambia
- [ ] Historias relacionadas linkadas

---

## ✅ Checklist de Review

### Review por Maintainer

- [ ] Revisor comprueba todos items arriba
- [ ] Revisor aprueba o solicita cambios específicos
- [ ] PR description tiene contexto + links de issues
- [ ] Commits están clean (no rebase hell)

### Self-Review

Antes de solicitar review:

- [ ] Correr tests localmente: `pnpm test`
- [ ] Correr linter: `pnpm run lint`
- [ ] Correr formatter: `pnpm run format:fix`
- [ ] Correr build: `pnpm run build`
- [ ] Revisar diff (`git diff`) line por line
- [ ] Verificar no hay secretos/console logs

---

## ✅ Checklist Final (Antes de Merge)

**En GitHub:**

- [ ] PR status: ✅ All checks passed
- [ ] PR review: ✅ Approved
- [ ] PR conversation: ✅ Resolved (sin comentarios pendientes)
- [ ] Branch: ✅ Up to date with base branch
- [ ] Protecciones de rama respetadas

**Post-merge:**

- [ ] Branch deletado
- [ ] Issue cerrado con link de commit
- [ ] Release notes preparadas si es release

---

## Excepciones y Contexto

### Cuándo NO aplicar todos los items

**Docs-only PRs:** Skip tests, skip changelog minor

```
✓ Documentación actualizada
✓ No hay cambios de código
- Pueden skipear tests
```

**Hotfixes Critical:** Skip refactor, pero SIEMPRE tests

```
✓ Tests de reproductor + fix
✓ Documentación si es compleja
! Mergear a main + develop
```

**Refactors puros:** Skip changelog (si no cambia funcionalidad)

```
✓ Tests nuevos de cobertura
✓ Performance verificado
? Changelog solo si mejora significativa
```

---

## Tabla de Severidades y Requisitos

| Tipo | Ejemplos | Mín. Cobertura | Docs | Changelog |
|---|---|---|---|---|
| Feature | Nuevo endpoint, sensor | 70% | ✅ | ✅ |
| Fix | Bug, crash | 80% | ✅ | ✅ |
| Refactor | Reorganizar código | 70% | Sí (si complejo) | — |
| Perf | Optimización | 60% | Si aplica | — |
| Security | Patch, vuln | 100% | ✅ | ✅ |
| Docs | README, specs | — | ✅ | — |
| Chore | Deps, config | — | — | — |

---

## Cómo Usar este Documento

1. **Al crear PR:** Copiar checklist en descripción
2. **Durante desarrollo:** Ir marcando items conforme avanzas
3. **Pre-review:** Asegurar todos items checked
4. **Review:** Revisor verifica checklist completo
5. **Merge:** Confirmar checklist 100% antes de mergear

---

## Preguntas Frecuentes

**¿Qué pasa si no cumplo un item?**  
No es "done" hasta completarlo. PR no se mergea.

**¿Puedo skipear tests?**  
No, excepto docs-only. Tests son mandatory.

**¿El checklist es muy largo?**  
Sí, a propósito. Garantiza calidad producción.

**¿Quién verifica?**  
Maintainer en review + author en self-review.

---

## Historial de esta Guía

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-06-13 | Inicial |

Cambios futuros requieren consenso del equipo → ADR.


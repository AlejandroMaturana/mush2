# Estrategia de Branching — Mush2

Estrategia Git Flow simplificada para mantener un flujo de trabajo limpio, escalable y predecible.

## Ramas Principales

### 1. `main` (Producción)

- **Protegida**: Requiere PR review + tests passing
- **Contenido**: Código listo para producción
- **Tagging**: Cada merge es un release (v0.1.0, v0.2.0, etc.)
- **Deploy**: Automático a producción cuando se mergea

**Regla:** NUNCA haces commit directo a `main`

### 2. `develop` (Integración)

- **Rama base para desarrollo**: Todos los features branch desde aquí
- **Estado**: Pre-producción, puede tener features en desarrollo
- **Testing**: Tests deben pasar, pero puede tener bugs menores
- **Deploy**: Automático a staging/QA

**Regla:** Requiere PR + 1 review antes de merge

---

## Tipos de Ramas

### Feature Branches: `feature/*`

Para nuevas funcionalidades o mejoras.

```bash
# Crear desde develop
git checkout develop
git pull
git checkout -b feature/mqtt-reconnection-logic

# Cuando terminas:
# 1. Push
git push origin feature/mqtt-reconnection-logic

# 2. Abre PR hacia develop
# 3. Espera review
# 4. Merge y delete branch
```

**Ejemplos válidos:**
- `feature/backend-rbac-middleware`
- `feature/frontend-dark-mode`
- `feature/firmware-ota-updates`
- `feature/device-provisioning-flow`

### Fix Branches: `fix/*`

Para correcciones de bugs.

```bash
git checkout develop
git checkout -b fix/mqtt-reconnection-timeout

# Cuando terminas:
git push origin fix/mqtt-reconnection-timeout
# Abre PR, espera review, merge
```

**Ejemplos válidos:**
- `fix/backend-sql-injection-vulnerability`
- `fix/frontend-race-condition-subscribe`
- `fix/firmware-memory-leak-mqtt`

### Hotfix Branches: `hotfix/*` ⚠️

Para correcciones críticas en **producción** que no pueden esperar a `develop`.

```bash
# Crear desde main (NO desde develop)
git checkout main
git pull
git checkout -b hotfix/critical-sensor-crash

# Cuando terminas:
git push origin hotfix/critical-sensor-crash

# 1. Abre PR hacia main
# 2. Urgente review + test
# 3. Merge a main → auto-deploy
# 4. IMPORTANTE: También mergear a develop
git checkout develop
git merge --no-ff hotfix/critical-sensor-crash
git push origin develop
```

**Requisitos:**
- ✅ Bug es critical (afecta producción)
- ✅ No puede esperar a release planeado
- ✅ SIEMPRE mergear también a develop

### Refactor Branches: `refactor/*`

Para restructuración de código, optimizaciones, deuda técnica.

```bash
git checkout develop
git checkout -b refactor/backend-service-layer-extraction

# Cuando terminas:
git push origin refactor/backend-service-layer-extraction
# Abre PR, review exhaustivo (cambios grandes), merge
```

**Diferencia con feature:**
- `feature/`: Agrega nueva funcionalidad
- `refactor/`: Mejora código existente, sin nueva funcionalidad

### Docs Branches: `docs/*`

Para actualización de documentación, sin cambios de código.

```bash
git checkout develop
git checkout -b docs/update-api-documentation

# Cambios en docs/, CHANGELOG, comentarios, pero NO en src/
git push origin docs/update-api-documentation
# Abre PR (puede auto-mergear si es simple)
```

### Test Branches: `test/*`

Para nuevos tests, cobertura, test fixtures.

```bash
git checkout develop
git checkout -b test/add-control-engine-tests

# Cambios en __tests__/, fixtures, pero NO lógica
git push origin test/add-control-engine-tests
# Abre PR, review, merge
```

### Chore Branches: `chore/*`

Tareas de mantenimiento: deps, config, CI/CD.

```bash
git checkout develop
git checkout -b chore/upgrade-express-to-5.0

# Cambios en package.json, .github/workflows/, config
git push origin chore/upgrade-express-to-5.0
# Abre PR con detalles, review, merge
```

---

## Flujo Visual

```
main (v0.1.0)
    ↑
    |
    └← PR merge: hotfix/critical-bug ← (solo emergencias)
        ↑
        |
develop (pre-production)
    ↑
    ├← feature/mqtt-reconnection
    ├← fix/memory-leak
    ├← refactor/service-layer
    └← test/control-engine-tests
```

---

## Reglas de Merge

### Merge a Develop (normal)

```bash
# 1. Asegura que branch esté actualizado
git fetch origin
git rebase origin/develop

# 2. Push nuevamente si rebased
git push origin feature/tu-feature

# 3. En GitHub: Abre PR
# 4. Review + tests deben pasar
# 5. Merge con "Squash and merge" (1 commit limpio)
#    Opcionalmente "Create a merge commit" si fueron muchos commits

# 6. Delete branch después
git branch -d feature/tu-feature
git push origin --delete feature/tu-feature
```

### Merge a Main (release)

```bash
# 1. Solo desde develop, via PR
# 2. TODOS los tests deben pasar
# 3. Mínimo 2 approvals
# 4. Merge con "Create a merge commit" (histórico importante)
# 5. Tag automático: git tag -a v0.2.0 -m "Release v0.2.0"
# 6. Deploy automático a producción
```

---

## Commit Messages

**Formato:** `[type](scope): description`

```bash
# Feature
git commit -m "feat(backend): add RBAC middleware"

# Fix
git commit -m "fix(firmware): prevent stack overflow in MQTT"

# Refactor
git commit -m "refactor(backend): extract validation to utils"

# Tests
git commit -m "test(frontend): add hooks integration tests"

# Docs
git commit -m "docs(api): update endpoint documentation"

# Chore
git commit -m "chore(deps): update express to 5.0"
```

**Si es complejo, agregar body:**

```
feat(backend): add RBAC middleware

Implement role-based access control for all API endpoints.
Validates JWT, extracts user role, checks permissions.

- Adds authenticate() middleware
- Adds requireMinRole() middleware
- Updates all routes to check permissions
- Adds tests for each role

Closes #123
Refs #456
```

---

## Protecciones y Automatización

### Branch Protection Rules

`develop` y `main` deben tener:

✅ Requiere PR review (mínimo 1)  
✅ Requiere tests pasen (CI checks)  
✅ Dismissable stale reviews si hay nuevos commits  
✅ Requiere branches actualizadas antes de mergear  
✅ Prohíbe forzar push (`git push --force`)

### Automatización (GitHub Actions)

| Rama | Trigger | Acciones |
|---|---|---|
| `feature/*` | Push | Tests, lint, build |
| `develop` | Merge | Tests, build, deploy staging |
| `main` | Merge | Tests, build, deploy prod, tag release |

---

## Ejemplos Prácticos

### Escenario 1: Nueva Funcionalidad

```bash
# 1. Fetch latest develop
git fetch origin
git checkout develop
git pull

# 2. Crea feature branch
git checkout -b feature/backend-alerts-system

# 3. Desarrolla (commits frecuentes)
git commit -m "feat(backend): add Alert model"
git commit -m "feat(backend): add alert service"
git commit -m "test(backend): add alert tests"

# 4. Push y PR
git push origin feature/backend-alerts-system
# Abre PR en GitHub → describe cambios, agradecer reviewers

# 5. Incorpora feedback
git commit -m "fix: address review comments"
git push

# 6. Merge
# GitHub: "Squash and merge" → borra branch local
git fetch origin
git checkout develop
git pull
git branch -D feature/backend-alerts-system
```

### Escenario 2: Bug Crítico en Producción

```bash
# 1. Crea hotfix desde main (NO develop!)
git fetch origin
git checkout main
git pull
git checkout -b hotfix/crash-on-low-memory

# 2. Corrige y testa
git commit -m "fix: prevent crash on low memory MQTT"
git push origin hotfix/crash-on-low-memory

# 3. PR to main (urgente!)
# GitHub: Abre PR, link issue, describe impacto

# 4. Merge a main (auto-deploy)
# GitHub: "Create merge commit" → crea tag v0.1.1

# 5. IMPORTANTE: Mergear también a develop
git checkout develop
git pull
git merge --no-ff hotfix/crash-on-low-memory
git push

# 6. Limpia
git branch -D hotfix/crash-on-low-memory
git push origin --delete hotfix/crash-on-low-memory
```

### Escenario 3: Refactor Grande (deuda técnica)

```bash
# 1. Crea refactor branch
git checkout develop
git pull
git checkout -b refactor/backend-middleware-reorganization

# 2. Refactor (múltiples commits)
git commit -m "refactor: move auth logic to separate file"
git commit -m "refactor: consolidate error handlers"
git commit -m "refactor: remove duplicate validation"
git commit -m "test: add comprehensive middleware tests"

# 3. Push
git push origin refactor/backend-middleware-reorganization

# 4. PR (description importante!)
# Explica POR QUÉ es necesario, QUÉ cambió, QUÉ NO cambió funcionalmente

# 5. Espera review exhaustivo (cambios grandes)
# Incorpora feedback

# 6. Merge
git push --force-with-lease  # Solo si rebased
# GitHub: "Squash and merge"
```

---

## Limpieza Regular

```bash
# Ver branches locales stale
git branch -v | grep "\[gone\]"

# Borrar branches marcadas como gone
git fetch origin --prune

# Ver branches remotas
git branch -r

# Borrar branches viejos (manuales)
git branch -D feature/old-feature
git push origin --delete feature/old-feature
```

---

## Troubleshooting

### ¿Commits están fuera de orden?

```bash
# Rebase interactivo (reordena commits)
git rebase -i HEAD~5  # Últimos 5 commits
# Mueve líneas para reordenar
# Save y exit
```

### ¿Mergié a la rama equivocada?

```bash
# Revierte el merge
git reflog  # Encuentra el commit anterior
git reset --hard HEAD@{N}  # N = número de steps atrás
```

### ¿Cómo sincronizar con develop después de mergear?

```bash
# Ya en main post-merge
git checkout develop
git pull
git merge --no-ff main  # Trae cambios de main a develop
git push
```

---

## Versionado de esta Guía

Última actualización: 2026-06-13  
Aplicable a: Mush2 v0.1.0+

Cambios en estrategia requieren ADR en `docs/ADR/`.

# Guía de Contribución — Mush2

¡Gracias por contribuir a Mush2! Esta guía te ayudará a colaborar de manera efectiva y consistente con el proyecto.

## Antes de Empezar

1. **Lee** `PROJECT_CONTEXT.md` — Entiende qué es este proyecto y sus reglas fundamentales
2. **Lee** `coding-standards.md` — Estándares que debes seguir
3. **Lee** `definition-of-done.md` — Requisitos para marcar una tarea como completa
4. **Lee** `branching-strategy.md` — Cómo nombrar y organizar branches

## Flujo de Trabajo

### 1. Reportar un Issue

Si encontraste un bug o tienes una idea de mejora:

```markdown
## Descripción
Breve descripción del problema o feature

## Contexto
- Componente afectado: [Backend/Frontend/Firmware]
- Versión: [0.1.0]
- Reproducción: [Pasos para reproducir si es bug]

## Comportamiento Esperado
Qué debería pasar

## Comportamiento Actual
Qué está pasando ahora

## Impacto
- Severidad: [Critical/High/Medium/Low]
- Usuarios afectados: [descripción]
```

### 2. Crear un Branch

```bash
# Asegúrate de estar en develop
git checkout develop
git pull origin develop

# Crea un branch con nombre descriptivo
# Formato: [type]/[scope]-[description]
git checkout -b feature/backend-rbac-middleware
```

**Prefijos válidos:**
- `feature/` — Nueva funcionalidad
- `fix/` — Corrección de bug
- `refactor/` — Mejora de código sin cambiar funcionalidad
- `docs/` — Documentación
- `test/` — Nuevos tests
- `chore/` — Tareas de mantenimiento

### 3. Desarrollo Local

#### Backend

```bash
cd backend

# Instalar dependencias (primera vez)
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# Base de datos
pnpm run db:reset      # Reset completo
pnpm run db:seed       # Datos de prueba

# Modo desarrollo (hot reload con nodemon)
pnpm run dev

# Tests
pnpm test                # Correr una vez
pnpm run test:watch      # Modo watch
pnpm run test:coverage   # Con cobertura
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
pnpm install

# Configurar .env.local (opcional, usa defaults)
# VITE_API_URL=http://localhost:3797

# Desarrollo
pnpm run dev

# Tests
pnpm test
pnpm run test:ui  # UI interactiva
```

#### Firmware

```bash
cd firmware

# Instalar PlatformIO (si no lo has)
pip install platformio

# Configurar placa y puerto
# Editar platformio.ini si es necesario

# Compilar
pio run

# Upload
pio run --target upload

# Monitor serial
pio device monitor --baud 115200
```

### 4. Hacer Cambios

**Reglas generales:**

- ✅ Un commit = un cambio lógico
- ✅ Commits frecuentes (cada 15-30 min de trabajo)
- ✅ Mensajes descriptivos (ver `coding-standards.md`)
- ✅ Tests mientras desarrollas (TDD)
- ❌ Commits gigantes ("agregué todo")
- ❌ Commits sin descripción ("fix" or "update")

**Ejemplo de sesión:**

```bash
# Desarrollo iterativo
git add src/middlewares/rbac.js
git commit -m "feat(backend): add role validator function"

# Tests
git add src/__tests__/rbac.test.js
git commit -m "test(backend): add comprehensive RBAC tests"

# Documentación
git add docs/api.md
git commit -m "docs(backend): document RBAC endpoints"

# Bugfixes encontrados
git add src/middlewares/rbac.js
git commit -m "fix(backend): prevent privilege escalation in RBAC"
```

### 5. Mantener Sincronizado

Si develop cambió mientras trabajabas:

```bash
# Opción 1: Rebase (preferible)
git fetch origin
git rebase origin/develop

# Si hay conflictos:
# 1. Resuelve conflictos en tu editor
# 2. git add [archivos resueltos]
# 3. git rebase --continue

# Opción 2: Merge (si rebase causa problemas)
git merge origin/develop
```

### 6. Tests y Linting

**Antes de pushear:**

```bash
# Backend
cd backend
pnpm test                    # Todos los tests deben pasar
pnpm run test:coverage       # Verifica cobertura >60%
pnpm run lint                # ESLint
pnpm run format:check        # Prettier

# Frontend
cd frontend
pnpm test                    # Tests deben pasar
pnpm run lint                # ESLint
pnpm run format:check        # Prettier

# Si hay errores de formato:
pnpm run format:fix          # Auto-corrige
```

### 7. Push y Pull Request

```bash
# Push a tu branch
git push origin [tu-branch-name]

# GitHub: Ve a https://github.com/[repo] y abre un PR

# Plantilla de PR:
```

**Título:**
```
[Component] Descripción breve
Ej: [Backend] Add RBAC middleware
```

**Descripción:**
```markdown
## 📝 Descripción
Qué cambió y por qué

## 🔗 Relacionado
Fixes #123
Refs #456

## ✅ Checklist
- [ ] Compila/No hay errores
- [ ] Tests nuevos + pasan
- [ ] Documentación actualizada
- [ ] CHANGELOG.md actualizado
- [ ] Compatible con protocolo MQTT
- [ ] Sin secretos en código

## 🧪 Cómo testear
Pasos para que el revisor pruebe

## 📸 Screenshots (si es frontend)
```

### 8. Revisión de Código

**Como Autor:**
- Responde todos los comentarios
- Haz cambios chiquitos (commit por comentario/grupo)
- Re-request review cuando termines
- Sé profesional y receptivo a feedback

**Como Revisor:**
- Verifica contra `coding-standards.md`
- Chequea tests y cobertura
- Busca vulnerabilidades de seguridad
- Propón mejoras, pero sé constructivo

### 9. Merge

Una vez aprobado:

```bash
# Rebase en develop (limpia historial)
git fetch origin
git rebase origin/develop

# Push
git push origin [tu-branch]

# Merge (botón en GitHub)
# Elige "Squash and merge" para un commit limpio
# O "Create a merge commit" si fue mucho trabajo
```

---

## Actualizar CHANGELOG

**Formato Keep a Changelog:**

```markdown
## [0.2.0] - 2026-06-20

### Added
- New RBAC middleware for role-based access control
- Support for custom recipes with multi-phase cycles

### Fixed
- Memory leak in MQTT message handler
- Incorrect CO2 sensor calibration

### Changed
- Improved error messages for invalid telemetry
- Database indexes on frequently queried columns

### Removed
- Deprecated `/api/v1/legacy/devices` endpoint

### Security
- Upgraded jwt package to patch CVE-2024-1234
- Added rate limiting to authentication endpoints

[Unreleased]: https://github.com/...
[0.2.0]: https://github.com/.../releases/tag/v0.2.0
```

---

## Actualizar Documentación

Si cambios afectan arquitectura, protocolo o configuración:

| Cambio | Documentos a Actualizar |
|---|---|
| Nuevo modelo/tabla | `docs/architecture/database.md`, schema diagram |
| Nuevo endpoint | `docs/contracts/api-contract.md` |
| Nuevo tópico MQTT | `docs/protocol/protocol-v1.md`, `docs/contracts/mqtt-contract.md` |
| Nueva configuración | `backend/README.md`, `docs/deployment.md` |
| Cambio de dependencias | `docs/governance/tech-debt.md` |

---

## Seguridad

**Reglas para Contribuidores:**

- ❌ NUNCA commitear `.env` o `config.local.json`
- ❌ NUNCA incluir contraseñas, tokens, o API keys en código
- ❌ NUNCA loguear información sensible
- ✅ SIEMPRE validar entrada de usuario
- ✅ SIEMPRE usar parametrized queries (Sequelize lo hace)
- ✅ SIEMPRE encriptar datos sensibles en tránsito (HTTPS)
- ✅ SIEMPRE usar JWT para auth, nunca sesiones en memoria

Si descubres una vulnerabilidad:
1. **NO** abras un issue público
2. Contacta a los maintainers via email privado
3. Proporciona: descripción, reproductor, impacto estimado

---

## Preguntas Frecuentes

### ¿Cómo agrego un nuevo sensor?

1. Crear `firmware/src/[sensor]_sensor.{h,cpp}` con `readSensor()`
2. Registrar en `state_machine.cpp`
3. Publicar en nuevo tópico MQTT o campo existente
4. Backend: Agregar `Sensor` model y `SensorType` enum
5. Crear migration de DB si es necesario
6. Tests: Mocking sensor en `__tests__/integration.test.js`
7. Docs: Actualizar `docs/protocol/protocol-v1.md`

### ¿Cómo cambio el protocolo MQTT?

1. IMPORTANTE: Incremental mayor en `docs/protocol/VERSION`
2. Actualizar `docs/contracts/mqtt-contract.md`
3. Backend: Validar `protocol` field en cada mensaje
4. Firmware: Ajustar publishers/subscribers
5. Add ADR en `docs/ADR/ADR-NNN-description.md`

### ¿Cuándo usar feature branch vs fork?

- **Branch**: Tienes push access al repo
- **Fork**: Contribuyente externo, creas PR desde fork

### ¿Cómo reporto un issue de seguridad?

Ver sección "Seguridad" arriba. Protocolo:
1. Email privado a maintainers
2. Espera confirmación (48h)
3. Puedes publicar después del fix o con embargo (90d)

---

## Recursos

- `PROJECT_CONTEXT.md` — Definición del proyecto
- `coding-standards.md` — Estándares de código
- `docs/architecture/` — Arquitectura detallada
- `docs/protocol/protocol-v1.md` — Protocolo MQTT
- `docs/contracts/` — Contratos API, MQTT, DB
- GitHub Issues/Discussions — Preguntas y sugerencias

---

**¡Gracias por contribuir a Mush2! 🍄**

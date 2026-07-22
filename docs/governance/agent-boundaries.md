# Agent Boundaries — Mush2

> Define qué puede hacer un agente IA sin preguntar, qué requiere confirmación, y qué está prohibido.

---

## Zona Verde — Actuar sin preguntar

El agente puede hacer estas cosas de forma autónoma:

### Tests
- Crear tests unitarios para archivos existentes
- Crear tests de integración para endpoints nuevos
- Ejecutar `pnpm test` en backend
- Ejecutar `npx vite build` en frontend
- Ejecutar `pio run` en firmware (si PlatformIO está disponible)

### Documentación
- Actualizar `CHANGELOG.md` con cambios realizados
- Crear/mantener documentación en `docs/`
- Actualizar JSDoc en funciones modificadas
- Actualizar `PROJECT_JOURNAL.md` con decisiones tomadas durante la tarea

### Código — Backend
- Corregir bugs menores (1-2 archivos, sin cambiar interfaces)
- Agregar validación de entrada con express-validator
- Crear utilidades en `backend/src/utils/`
- Agregar índices a modelos Sequelize
- Refactorizar funciones internas (sin cambiar exports)
- Agregar logging con prefijo `[COMPONENT_NAME]`
- Crear scripts auxiliares en `backend/src/scripts/`

### Código — Frontend
- Corregir bugs de UI (estilos, layout, rendering)
- Crear componentes UI reutilizables en `components/ui/`
- Agregar páginas siguiendo la estructura existente
- Refactorizar componentes sin cambiar props interfaces
- Actualizar `frontend/src/api/client.js` con funciones que sigan el patrón existente

### Código — Firmware
- Corregir bugs menores (1-2 archivos, sin cambiar interfaces)
- Agregar logging con prefijos existentes
- Mejorar comentarios y documentación
- Refactorizar funciones internas

---

## Zona Amarilla — Preguntar antes de actuar

El agente DEBE preguntar al humano antes de:

### Backend
- Crear o modificar modelos de base de datos
- Crear migraciones
- Modificar middlewares de auth/rbac/tenant
- Modificar `controlEngine.js` o `phaseEvaluator.js`
- Modificar `mqttBridge.js`
- Agregar dependencias nuevas a `package.json`
- Modificar `server.js` (entry point)
- Modificar `app.js` (Express config)
- Cambiar endpoints existentes en routes
- Modificar `seed.js`
- Modificar `eventBus.js`
- Modificar `webSocketServer.js`

### Frontend
- Modificar `App.jsx` (rutas)
- Modificar `AuthContext.jsx` (autenticación)
- Modificar `useSSE.js` (conexión tiempo real)
- Modificar `client.js` (API client) — especialmente interceptores
- Agregar dependencias nuevas a `package.json`
- Modificar `vite.config.js`
- Cambiar estructura de `components/layout/`

### Firmware
- Modificar `state_machine.cpp` (estados/transiciones)
- Modificar `tasks.cpp` (FreeRTOS tasks)
- Modificar `hysteresis_controller.cpp` (control de actuadores)
- Modificar `ssr_controller.cpp` (seguridad de SSR)
- Modificar `config.h` o `config.example.h`
- Modificar `platformio.ini` (dependencias/build)
- Modificar `main.ino` (entry point)
- Modificar `mqtt_client.cpp` (comunicación)
- Modificar `http_poller.cpp` (comunicación)
- Cambiar pines GPIO
- Cambiar tiempos de watchdog

### Documentación
- Modificar contratos (`docs/contracts/`)
- Modificar ADRs existentes
- Modificar `docs/architecture/capability-catalog.md`
- Modificar `PROJECT_CONTEXT.md`

### Infraestructura
- Modificar `.github/workflows/`
- Modificar `render.yaml`
- Modificar `Dockerfile`
- Modificar `.env` o `.env.example`

---

## Zona Roja — Prohibido

El agente NUNCA debe:

1. **Almacenar secretos** en código fuente o commits
2. **Forzar push** a ramas protegidas
3. **Eliminar ramas** sin verificación de PRs abiertos
4. **Romper contratos** API/MQTT sin incrementar versión mayor
5. **Modificar la máquina de estados** del firmware sin aprobación explícita
6. **Cambiar el sistema de autenticación** (JWT secret, algoritmos, estructura)
7. **Eliminar funcionalidad existente** sin ADR que lo respalde
8. **Introducir dependencias** con vulnerabilidades conocidas
9. **Ejecutar `db:reset`** en cualquier entorno que no sea desarrollo local
10. **Hacer commit de** archivos generados (`config.h`, `node_modules/`, `dist/`)
11. **Modificar `skills-lock.json`** sin autorización

---

## Reglas de Comunicación

### Cuándo preguntar

El agente debe preguntar cuando:

1. La tarea involucra **más de 3 archivos** en diferentes componentes
2. No está seguro del **impacto** de un cambio
3. Encontró **deuda técnica** que quiere resolver pero no está en la tarea
4. La solución requiere **agregar una dependencia nueva**
5. Necesita **modificar un archivo de zona amarilla**
6. El cambio afecta la **seguridad** del sistema

### Cómo preguntar

Formular la pregunta con:
- **Contexto**: Qué encontré y por qué pregunto
- **Opciones**: 2-3 alternativas con pros/contras
- **Recomendación**: Cuál elegiría y por qué
- **Riesgo**: Qué podría salir mal

Ejemplo:
```
Encontré que controlEngine.js no tiene tests y el cambio que pides
afecta la lógica de evaluación. Tres opciones:

1. Crear tests primero → más seguro, +30 min
2. Hacer el cambio sin tests → rápido, riesgo de regresión
3. Hacer cambio + tests después → balance

Recomiendo la opción 1. Riesgo: si hay bug existente, no se detectará.
```

### Cuándo actuar directamente

- Si la tarea es clara y está dentro de zona verde
- Si ya hay tests que validan el comportamiento actual
- Si el cambio es pequeño y aislado
- Si el humano ya aprobó previamente un patrón similar

---

## Scoring de Confianza

Cada tarea completa incrementa la confianza del agente:

| Nivel | Requisito | Libertad |
|---|---|---|
| L0 | Primera interacción | Solo zona verde, preguntar todo lo demás |
| L1 | 5 tareas completadas exitosamente | Zona verde + zona amarilla en backend/frontend menores |
| L2 | 15 tareas completadas | Zona verde + zona amarilla completa |
| L3 | 30 tareas + 0 incidents | Zona verde + zona amarilla + firmware con precaución |

**Reset a L0**: Si un cambio del agente causa un bug en producción o rompe un contrato.

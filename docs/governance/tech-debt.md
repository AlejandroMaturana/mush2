# Technical Debt Register — Mush2

Registro centralizado de deuda técnica: problemas conocidos, optimizaciones pendientes, refactors planeados.

## Formato

```
## [PRIORITY] Issue #NNN — Descripción (Componente)

**Severidad:** [Critical/High/Medium/Low]  
**Componente:** [Backend/Frontend/Firmware]  
**Estimación:** [1d / 2d / 3d / 1w / ???]  
**Estado:** [New/In Progress/Blocked/Planned]  
**Assignee:** @usuario  
**Due:** YYYY-MM-DD (opcional)

**Descripción:**
Qué es el problema y por qué importa

**Impacto:**
- Performance
- Escalabilidad
- Mantenibilidad
- Seguridad
- UX

**Solución propuesta:**
Cómo resolver

**Bloqueadores:**
- Si es dependiente de otro item

**Notas:**
- Contexto adicional
```

---

## Critical (Bloquean escalabilidad o seguridad)

### [CRITICAL] Issue #001 — Falta Connection Pooling en PostgreSQL (Backend)

**Severidad:** Critical  
**Componente:** Backend  
**Estimación:** 1d  
**Estado:** New  
**Assignee:** —

**Descripción:**
Cada request Node.js abre una nueva conexión a PostgreSQL. Sin connection pooling, llegará a límite de conexiones simultáneas (100-200 por defecto).

**Impacto:**
- Performance: queries lenta bajo load
- Escalabilidad: no escala horizontalmente
- Estabilidad: crashes cuando se alcanza límite conexiones

**Solución propuesta:**
Usar `pg` connection pool o `pgBouncer`:

```javascript
const pool = new Pool({
  max: 20,           // máx conexiones simultáneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Bloqueadores:** Ninguno  
**Notas:** Crítico antes de producción

---

### [CRITICAL] Issue #002 — Falta Rate Limiting en MQTT (Backend)

**Severidad:** Critical  
**Componente:** Backend  
**Estimación:** 1d  
**Estado:** New

**Descripción:**
Sin rate limiting en subscribers MQTT, un dispositivo malicioso puede floodearte con millones de mensajes/min, causando DoS.

**Impacto:**
- Seguridad: DoS vulnerability
- Stability: backend crash por memory exhaustion

**Solución propuesta:**
Implementar queue + rate limiter por deviceId:

```javascript
const queue = new PQueue({ concurrency: 1, interval: 1000, rate: 100 });
// máx 100 mensajes por segundo por device
```

**Bloqueadores:** Ninguno  
**Notas:** Requiere tests de carga

---

### [CRITICAL] Issue #003 — Sin Validación de Telemetría Outliers (Backend)

**Severidad:** Critical  
**Componente:** Backend + Frontend  
**Estimación:** 2d  
**Estado:** New

**Descripción:**
Si sensor falla, puede reportar valores extremos (temp -99°C, humedad 1000%). Estos valores no se validan y rompen gráficos/alertas.

**Impacto:**
- Data integrity: datos corruptos en DB
- UX: gráficos con picos imposibles
- Control: actuadores podrían reaccionar a valores falsos

**Solución propuesta:**
Implementar validador de rangos:

```javascript
const VALID_RANGES = {
  TEMPERATURE: { min: -10, max: 50 },
  HUMIDITY: { min: 0, max: 100 },
  CO2: { min: 300, max: 5000 },
};
```

**Bloqueadores:** Ninguno  
**Notas:** Alta prioridad, fácil de implementar

---

## High (Necesarios antes de producción)

### [HIGH] Issue #004 — Falta Índices en columnas de búsqueda (Backend)

**Severidad:** High  
**Componente:** Backend  
**Estimación:** 1d  
**Estado:** Planned

**Descripción:**
Queries a `Telemetry`, `Device`, `CultivationCycle` sin índices son O(n). Con millones de registros, esto mata performance.

**Impacto:**
- Performance: queries tardan segundos
- Escalabilidad: no escala con datos

**Solución propuesta:**
Agregar índices a Sequelize migrations:

```javascript
// migrations/YYYYMMDD-add-indexes.js
queryInterface.addIndex('telemetry', { fields: ['deviceId', 'timestamp'] });
queryInterface.addIndex('cultivation_cycles', { fields: ['status', 'currentPhase'] });
queryInterface.addIndex('devices', { fields: ['deviceId'] });
```

**Bloqueadores:** Ninguno  
**Notas:** Fácil de medir (EXPLAIN ANALYZE)

---

### [HIGH] Issue #005 — Frontend tiene bundle size de 500KB (Frontend)

**Severidad:** High  
**Componente:** Frontend  
**Estimación:** 2d  
**Estado:** New

**Descripción:**
Bundle minificado es 500KB, no incluye chart library (Chart.js +200KB). Muy lento en 3G.

**Impacto:**
- Performance: LCP > 3s
- UX: app tarda en cargar

**Solución propuesta:**
- Code splitting por ruta (React.lazy)
- Tree shake Chart.js
- Precarga crítica
- Analizar con `vite-bundle-visualizer`

**Bloqueadores:** Ninguno  
**Notas:** Medir con Lighthouse

---

### [HIGH] Issue #006 — Firmware tiene potencial memory leak en MQTT handler (Firmware)

**Severidad:** High  
**Componente:** Firmware  
**Estimación:** 1d  
**Estado:** In Progress  
**Assignee:** @[nombre]

**Descripción:**
`mqttService.connectMQTT()` puede no limpiar listeners en caso de error, causando acumulación de event listeners.

**Impacto:**
- Stability: gradual memory exhaustion
- Uptime: reboot necesario cada 7 días

**Solución propuesta:**
Ensure cleanup en desconexión:

```cpp
if (client) {
  client.disconnect(true);  // force=true
  delete client;
  client = nullptr;
  listenerCount = 0;  // reset
}
```

**Bloqueadores:** Ninguno  
**Notas:** Verificar con memory profiler

---

## Medium (Mejoras a mediano plazo)

### [MEDIUM] Issue #007 — Control engine no maneja fases de >30 días (Backend)

**Severidad:** Medium  
**Componente:** Backend  
**Estimación:** 1d  
**Estado:** New

**Descripción:**
Máquina de estados usa `cycleStartDate` vs `now`, pero si fase dura >30 días, hay drift por reinicio backend.

**Impacto:**
- Correctness: transiciones de fase pueden adelantarse/atrasarse
- User experience: ciclos desincronizados

**Solución propuesta:**
Usar `lastPhaseTransition` timestamp persistido y UTC:

```javascript
const lastTransition = new Date(cycle.lastPhaseTransition);
const elapsed = (now - lastTransition) / (1000 * 60 * 60 * 24);
```

**Bloqueadores:** Ninguno  
**Notas:** Bajo impacto, refactor

---

### [MEDIUM] Issue #008 — Frontend no cachea datos de recetas (Frontend)

**Severidad:** Medium  
**Componente:** Frontend  
**Estimación:** 2d  
**Estado:** Planned

**Descripción:**
Cada vez que abres página de recetas, re-fetcha. Sin caché, muchas requests.

**Impacto:**
- Performance: UX lenta
- Network: uso innecesario

**Solución propuesta:**
Implementar cache en Context + invalidation:

```javascript
const [recipesCache, setRecipesCache] = useState(null);
const [cacheExpiry, setCacheExpiry] = useState(null);

if (recipesCache && now < cacheExpiry) {
  return recipesCache;
}
```

**Bloqueadores:** Ninguno  
**Notas:** Considerar React Query

---

### [MEDIUM] Issue #009 — Sin dark mode (Frontend)

**Severidad:** Medium  
**Componente:** Frontend  
**Estimación:** 2d  
**Estado:** Backlog

**Descripción:**
Frontend está en modo claro. Para uso nocturno en laboratorio, falta dark mode.

**Impacto:**
- UX: eye strain en ambiente oscuro

**Solución propuesta:**
Context + CSS variables + localStorage:

```javascript
const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);
```

**Bloqueadores:** Ninguno  
**Notas:** Nice-to-have, no critical

---

## Low (Nice-to-have, futuro)

### [LOW] Issue #010 — Agregar GraphQL API (Backend)

**Severidad:** Low  
**Componente:** Backend  
**Estimación:** 1w  
**Estado:** Backlog

**Descripción:**
REST API funcionan, pero GraphQL permitiría queries más flexibles.

**Impacto:**
- Flexibility: clientes más eficientes

**Solución propuesta:**
Apollo Server + tipos autogenerados

**Bloqueadores:** REST API debe estar estable primero  
**Notas:** Post-v1.0

---

### [LOW] Issue #011 — Agregar soporte para múltiples brokers MQTT (Frontend)

**Severidad:** Low  
**Componente:** Frontend  
**Estimación:** 1d  
**Estado:** Backlog

**Descripción:**
UI permite solo 1 broker. Algunos usuarios quieren múltiples clusters.

**Impacto:**
- Flexibility: arquitecturas complejas

**Solución propuesta:**
Agregar array de brokers

**Bloqueadores:** Ninguno  
**Notas:** Demanda futura

---

## Resumen por Prioridad

| Nivel | Count | Estimación Total |
|---|---|---|
| Critical | 3 | 4d |
| High | 3 | 5d |
| Medium | 3 | 5d |
| Low | 2 | 1w+ |

---

## Decisión: Próximas Iteraciones

### Iteración 1 (Próximas 2 semanas) — CRITICAL

- [ ] Issue #001 — Connection pooling PostgreSQL
- [ ] Issue #002 — Rate limiting MQTT
- [ ] Issue #003 — Validación outliers telemetría

**Dependencias resueltas:**  
Estos 3 son bloqueadores de producción.

### Iteración 2 (Semanas 3-4) — HIGH

- [ ] Issue #004 — Índices DB
- [ ] Issue #005 — Bundle size frontend
- [ ] Issue #006 — Memory leak firmware

**Pendiente de:**  
Iteración 1 completada + Sprint planning

---

## Cómo usar este registro

1. **Crear nuevo item:** Copiar template arriba
2. **Priorizar:** Usar severidad + impacto
3. **Actualizar estado:** New → In Progress → Blocked → Done
4. **Revisión mensual:** Ajustar estimaciones y prioridades
5. **Cerrar:** Cuando PR merged, marcar Done + link commit

## Revisión Última

**Fecha:** 2026-06-13  
**Revisor:** @[maintainer]  
**Cambios:** Creación inicial del registro

---

**Próxima revisión:** 2026-07-13

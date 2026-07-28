# EDD-002 — Motor de Reglas y Recetas de Cultivo

## Metadata

| Campo             | Valor              |
| ----------------- | ------------------ |
| Autor             | AlejandroMaturana |
| Estado            | ACCEPTED           |
| Fecha             | 2026-06-15         |
| Versión           | 1.0.0              |
| ADRs relacionados | ADR-009, ADR-011   |
| RFC relacionados  | —                  |

---

## 1. Problema / Contexto

Cada especie de hongo adaptógeno requiere condiciones ambientales distintas en cada fase de su ciclo de vida. Un Reishi en FRUITING necesita CO₂ < 700ppm, mientras que en INCUBATION tolera hasta 5000ppm. Un Shiitake requiere un shock térmico (cold shock, ΔT -8°C por 48h) para iniciar la formación de primordios.

El sistema necesita un **motor de reglas** que:

1. Ejecute reglas locales en el firmware (sin red) con histéresis simple
2. Ejecute reglas complejas en el backend con acceso a la receta activa y datos históricos
3. Soporte recetas con múltiples fases y transiciones configurables

---

## 2. Objetivos

- Permitir que el firmware opere de forma autónoma durante interrupciones de red
- Soportar recetas con hasta 4 fases: `INCUBATION`, `PRIMORDIA`, `FRUITING`, `HARVESTING`
- Evaluar reglas en el backend cada 60 segundos basándose en la receta activa
- Prevenir oscilaciones de actuadores con histéresis configurable (T, HR, CO₂)
- Garantizar que los actuadores nunca queden en estado inseguro (overheat fail-safe)

---

## 3. No-objetivos

- Transiciones de fase automáticas por condición de sensor (planificadas en Fase 12 / EDD futuro)
- Lógica fuzzy de control avanzado (evaluada en ADR-009, diferida para versiones futuras)
- Control de iluminación por fotoperiodo con temporizador (pendiente, canal CH4 disponible)
- Optimización ML de setpoints (Fase 15)

---

## 4. Alternativas consideradas

### 4.1 Estrategia de control: ¿dónde vive la lógica?

| Opción                        | Pros                                                          | Contras                                                    | Decisión    |
| ----------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| **Dual (firmware + backend)** | Firmware autónomo en degraded; backend con contexto de receta | Mayor complejidad de sincronización                        | ✅ Elegida  |
| Solo firmware                 | Autónomo, sin red                                             | No puede aplicar recetas complejas; configuración limitada | ❌          |
| Solo backend                  | Recetas ricas, contexto completo                              | Si backend cae, actuadores sin control                     | ❌          |
| Edge computing (ESP-NN)       | Modelos ML en chip                                            | Complejidad excesiva para el estado actual                 | ❌ diferida |

### 4.2 Algoritmo de control

| Opción                          | Pros                                    | Contras                                     | Decisión             |
| ------------------------------- | --------------------------------------- | ------------------------------------------- | -------------------- |
| **Histéresis simple (elegida)** | Simple, predecible, fácil de configurar | No maneja sistemas con inercia térmica alta | ✅ Elegida — ADR-009 |
| PID                             | Preciso, elimina oscilaciones           | Requiere tuning por especie y hardware      | ❌ diferido          |
| Fuzzy Logic                     | Tolerante a incertidumbre               | Complejo de implementar en C++ embebido     | ❌ diferido para v3+ |
| Bang-bang puro                  | Muy simple                              | Oscilaciones frecuentes, desgaste de relés  | ❌                   |

---

## 5. Solución propuesta

### 5.1 Capa de firmware: histéresis local

El firmware implementa control por histéresis con banda configurable:

```
si temperatura < setpoint - histeresis_t → encender calefacción (CH2)
si temperatura > setpoint + histeresis_t → apagar calefacción
si humedad < setpoint - histeresis_h → encender humidificador (CH3)
si humedad > setpoint + histeresis_h → apagar humidificador
si co2 > umbral_co2 → encender ventilación (CH1)
si co2 < umbral_co2 - histeresis_co2 → apagar ventilación
```

Modos de operación por canal SSR:

- `LOCAL` — Control por histéresis del firmware
- `REMOTE` — Acepta comandos del backend vía HTTP polling
- `OFF` — Canal desactivado

Temporizadores de seguridad:

- `minOn`: tiempo mínimo que un actuador permanece encendido (evita flapping)
- `maxOn`: tiempo máximo de encendido continuo (protección de motores)

### 5.2 Capa de backend: motor de reglas con receta

```javascript
// controlEngine.js — evaluación cada 60s
async function evaluateRecipeRules(cycleId) {
  const cycle = await CultivationCycle.findByPk(cycleId, {
    include: [Recipe, CycleState],
  });
  const phase = cycle.currentPhase; // INCUBATION | PRIMORDIA | FRUITING | HARVESTING
  const setpoints = cycle.Recipe.stages[phase];
  const telemetry = await Telemetry.getLatestByDevice(cycle.deviceId);

  const rules = [
    {
      sensor: "temperature",
      channel: "CH2",
      setpoint: setpoints.temperature,
      hyst: 0.5,
    },
    {
      sensor: "humidity",
      channel: "CH3",
      setpoint: setpoints.humidity,
      hyst: 2.0,
    },
    { sensor: "co2", channel: "CH1", setpoint: setpoints.co2_max, hyst: 50 },
  ];

  for (const rule of rules) {
    const action = evaluateHysteresis(
      telemetry[rule.sensor],
      rule.setpoint,
      rule.hyst,
    );
    if (action !== null) {
      await publishCommand(cycle.deviceId, rule.channel, action);
    }
  }
}
```

### 5.3 Modelo de recetas (base de datos)

```
Recipe
├── id, name, species, description
├── stages: JSONB
│   ├── INCUBATION: { temperature, humidity, co2_max, ventilation_interval, duration_days }
│   ├── PRIMORDIA:  { ... }
│   ├── FRUITING:   { ... }
│   └── HARVESTING: { ... }
└── isTemplate, authorId

CultivationCycle
├── id, chamberDeviceId, recipeId
├── currentPhase: ENUM
├── startDate, estimatedEndDate
└── CycleStates[] — snapshots de transición de fase
```

### 5.4 Fail-safe Overheat

Implementado en firmware como override de máxima prioridad:

```cpp
// Estado evaluado antes que cualquier regla de receta
if (temperature > OVERHEAT_THRESHOLD) {
  // Override: todos los SSR a OFF excepto ventilación (CH1 ON)
  setSsrState(CH1, ON);   // Ventilación máxima
  setSsrState(CH2, OFF);  // Calefacción apagada
  setSsrState(CH3, OFF);  // Humidificador apagado
  reportAlarm(ALARM_OVERHEAT);
}
```

---

## 6. Impacto en componentes

| Componente    | Impacto | Archivos                                                                     |
| ------------- | ------- | ---------------------------------------------------------------------------- |
| Firmware      | Alto    | `hysteresis_controller.h/.cpp`, `ssr_controller.h/.cpp`, `state_machine.cpp` |
| Backend       | Alto    | `controlEngine.js`, `Recipe.js`, `CultivationCycle.js`, `CycleState.js`      |
| Frontend      | Medio   | `Recipes.jsx`, `Cycles.jsx`, `DeviceDetail.jsx` (panel de alarmas)           |
| Base de datos | Alto    | Migración: `Recipe`, `CultivationCycle`, `CycleState`, `Alarm`               |

---

## 7. Plan de implementación

Esta funcionalidad está **completamente implementada** en Fases 3 y 4 del roadmap.

Evolución planificada en Fase 12 (Automatización Adaptativa):

- Transiciones de fase por condición de sensor (no solo por tiempo)
- Histéresis configurable por canal (no global)
- Bitácora de transiciones con trazabilidad

---

## 8. Métricas de éxito

| Métrica                      | Objetivo                   | Estado |
| ---------------------------- | -------------------------- | ------ |
| Evaluación de reglas backend | Cada 60s                   | ✅     |
| Deduplicación de alarmas     | 60s backend, 120s firmware | ✅     |
| Histéresis evita flapping    | minOn configurable         | ✅     |
| Modo degradado sin red       | Histéresis local activa    | ✅     |
| Fail-safe overheat           | Threshold T > 32°C         | ✅     |

---

## 9. Riesgos y mitigaciones

| Riesgo                                          | Prob. | Impacto | Mitigación                                             |
| ----------------------------------------------- | ----- | ------- | ------------------------------------------------------ |
| Backend y firmware con setpoints distintos      | Media | Alto    | Backend envía setpoints al firmware vía polling        |
| Actuador bloqueado ON por firmware bug          | Baja  | Alto    | maxOn timer + fail-safe overheat                       |
| Sensor reporta valor erróneo → regla incorrecta | Media | Medio   | Validación de rangos + 3 lecturas inválidas → DEGRADED |
| Transición de fase incorrecta                   | Baja  | Medio   | Logs de CycleState + alerta al operador                |

---

## 10. Referencias

- [`docs/ADR/ADR-009-Estrategia-Control-Histeresis-Fuzzy.md`](../ADR/ADR-009-Estrategia-Control-Histeresis-Fuzzy.md)
- [`docs/ADR/ADR-011-Automatizacion-por-Etapas-Recipes.md`](../ADR/ADR-011-Automatizacion-por-Etapas-Recipes.md)
- [`docs/ADR/ADR-010-Mecanismo-Fail-Safe-Overheat.md`](../ADR/ADR-010-Mecanismo-Fail-Safe-Overheat.md)
- [`docs/architecture/backend.md`](../architecture/backend.md) — `controlEngine.js`
- [`docs/architecture/firmware.md`](../architecture/firmware.md) — `hysteresis_controller`

# ADR-009: Estrategia de Control con Histéresis y Jerarquía de Actuadores

**Estado:** Aceptado  
**Fecha:** 2026-06-21  
**Decisión:** Implementar control por histéresis (bang-bang con deadband) con jerarquía estricta de actuadores, priorizando ventilación sobre humidificación y calefacción.

## Contexto

El sistema cuenta con 4 actuadores SSR (ventilación, calefacción, humidificación ×2) y dos sensores (AHT21 + ENS160). La lógica de control original evaluaba cada actuador de forma independiente, permitiendo conflictos como:

- Humidificador activándose junto al ventilador (la niebla se expulsa antes de llegar al sustrato)
- Humidificador activándose a alta temperatura (empeora el estrés térmico)
- Ausencia de histéresis causando conmutación excesiva del SSR (>100 ciclos/min)

Se requiere una estrategia de control que respete la fisiología del cultivo: los hongos necesitan VPD (déficit de presión de vapor) estable, no variables individuales en conflicto.

## Decisión

### 1. Jerarquía de Prioridades (Estricta)

| Prioridad | Actuador | Condición ON | Condición OFF | Deadband |
|-----------|----------|-------------|---------------|----------|
| **1 (Urgencia)** | Ventilador | `Temp > 28.5°C` **O** `CO₂ > 1200 ppm` | `Temp < 27.0°C` **Y** `CO₂ < 900 ppm` | 1.5°C / 300 ppm |
| **2 (Confort)** | Manta Térmica | `Temp < 21.0°C` **Y** `Ventilador == OFF` | `Temp > 22.5°C` | 1.5°C |
| **3 (Recuperación)** | Humidificador | `Hum < 78%` **Y** `Temp < 27.5°C` **Y** `Ventilador == OFF` | `Hum > 85%` **O** `Temp > 28.0°C` **O** `Ventilador == ON` | 7% RH |
| **4 (Ciclo)** | Iluminación | Fotoperiodo (RTC/millis) | Fin del fotoperiodo | N/A |

### 2. Reglas de Interlocking

- **Ventilador bloquea humidificador**: Si el ventilador está ON, el humidificador se fuerza OFF independientemente de la humedad.
- **Temperatura bloquea humidificador**: Si `Temp > 27.5°C`, el humidificador no se activa aunque la humedad sea baja.
- **Manta térmica prioriza ventilación**: Si el ventilador está ON (por alta temp o CO₂), la manta no se enciende aunque la temp esté baja.
- **Iluminación independiente**: No interactúa con los demás actuadores.

### 3. Post-Humidificación (Post-Vent)

Cuando el ventilador se apaga (condiciones de temp y CO₂ normales):

1. Esperar 10 segundos (tiempo de estabilización del aire)
2. Encender humidificador por 30 segundos
3. Retornar al control normal de humedad

Esto repone la humedad perdida durante la extracción forzada.

### 4. Deadband Adaptativa (por Fase de Cultivo)

Los umbrales de histéresis se ajustan según la fase del ciclo:

| Fase | Temp | Humedad | CO₂ |
|------|------|---------|-----|
| Colonización (micelio) | ±1.5°C | ±10% | 200 ppm |
| Primordios | ±0.5°C | ±5% | 100 ppm |
| Fructificación | ±0.5°C | ±5% | 100 ppm |

### 5. Modos de Operación

- **LOCAL**: Control automático por histéresis en firmware (evaluación cada 10s)
- **REMOTE**: Control manual desde backend/dashboard (histeresis desactivada)
- **OFF**: Todos los actuadores apagados

## Consecuencias

### Positivas
- Elimina el conflicto ventilador↔humidificador
- Protege el SSR de conmutación excesiva (vida útil extendida)
- La post-humidificación mantiene VPD estable tras ciclos de FAE
- La jerarquía refleja la fisiología del hongo (primero aire, luego temperatura, luego humedad)

### Negativas
- Mayor complejidad en la máquina de estados del controlador
- La post-humidificación requiere temporizadores no-bloqueantes (millis)
- La deadband adaptativa requiere comunicación backend→firmware de la fase actual

## Implementación

- `hysteresis_controller.cpp`: Implementa `evaluate()` con la jerarquía completa y post-humidificación
- `hysteresis_controller.h`: Define `HYSTERESIS_BAND_TEMP`, `HYSTERESIS_BAND_HUM`, `HYSTERESIS_BAND_CO2`
- `config.h`: Setpoints por defecto alineados con la tabla de jerarquía
- `main.ino`: Integra post-humidificación, iluminación y fail-safe como capas adicionales

## Referencias

- `docs/roadmap/consideraciones.md` — Sección 2: Lógica de Control Reimplementada
- `docs/roadmap/otras-consideraciones.md` — Sección 2: Zona Muerta Adaptativa
- `docs/roadmap/consideraciones.md` — Sección 3D: Post-humidificación

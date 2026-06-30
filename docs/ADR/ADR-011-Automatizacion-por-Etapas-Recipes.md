# ADR-011: Automatización por Etapas con Recetas y Control por VPD

**Estado:** Aceptado  
**Fecha:** 2026-06-21  
**Decisión:** Implementar control automatizado por fases del ciclo de cultivo (INCUBATION → PRIMORDIA → FRUITING → HARVESTING), donde los setpoints y la estrategia de control se derivan de la receta activa y se ajustan por VPD (Déficit de Presión de Vapor).

## Contexto

El sistema M4 (Automatización) implementó un backend que evalúa ciclos activos y genera alertas, pero **no envía comandos a los actuadores**. El firmware opera en modo LOCAL con setpoints fijos de `config.h`. No hay integración entre:

- La fase del ciclo (INCUBATION vs FRUITING)
- Los umbrales definidos en la receta
- La estrategia de control del firmware
- El VPD (variable fisiológica clave para hongos)

Se requiere que el backend traduzca las evaluaciones en comandos concretos a los actuadores, y que el firmware reciba setpoints dinámicos según la fase.

## Decisión

### 1. Arquitectura de Control Híbrido (Local + Remoto)

```
Backend (controlEngine.js)
    │
    ├── Cada 60s: Evalúa telemetría vs umbrales de receta
    ├── Genera comandos HTTP → firmware (REMOTE)
    └── Fase por defecto: REMOTE (backend lidera)
    
Firmware (hysteresis_controller.cpp)
    │
    ├── Modo LOCAL: Control autónomo con últimos setpoints recibidos
    ├── Modo REMOTE: Ejecuta comandos del backend
    └── Modo OFF: Apagado total
```

### 2. Flujo de Automatización por Etapas

```
Receta → define umbrales por fase
   │
   ▼
CultivationCycle (backend) → evalúa cada 60s
   │
   ├── ¿Temp > threshold? → publishCommand(ventilador, ON)
   ├── ¿Hum < threshold? → publishCommand(humidificador, ON)
   └── ¿Fase completada? → transición automática
        │
        ▼
   Nuevos umbrales de fase → publishConfig() al firmware
```

### 3. Control por VPD (Variable Maestra)

El VPD reemplaza la humedad relativa como variable de control primaria para el humidificador:

```
VPD = ((100 - HR) / 100) * 0.6108 * e^((17.27 * T) / (T + 237.3))

Rangos objetivo por fase:
- Micelio:         VPD < 0.3 kPa  (ambiente casi saturado)
- Primordios:      VPD 0.5–0.8 kPa (estrés hídrico ligero)
- Fructificación:  VPD 0.4–0.6 kPa (equilibrio)
```

El backend calcula VPD en cada evaluación y puede comandar el humidificador para mantenerlo en rango. El firmware implementa una versión simplificada (HR con histéresis) como fallback local.

### 4. Sincronización Backend → Firmware

Ante un cambio de fase en el ciclo:

1. Backend detecta que se cumplió la duración de la fase actual
2. Transiciona el ciclo a la siguiente fase
3. Calcula nuevos umbrales desde la receta
4. Publica `mush2/cmd/{deviceId}/config` con los nuevos setpoints y modo LOCAL
5. El firmware actualiza su `HysteresisController` con los nuevos valores

### 5. Mapeo de Canales SSR (Revisado)

| Canal | GPIO | Actuador | Label |
|-------|------|----------|-------|
| CH1 | D5 (GPIO14) | Ventilación (extracción) | `vent` |
| CH2 | D7 (GPIO13) | Manta Térmica (calefacción) | `heat` |
| CH3 | D6 (GPIO12) | Humidificador (niebla) | `humid` |
| CH4 | D0 (GPIO16) | Iluminación (fotoperiodo) | `light` |

**Cambio crítico**: CH4 pasa de "segundo humidificador" a "iluminación", habilitando control de fotoperiodo para fructificación.

## Consecuencias

### Positivas
- El backend puede ajustar dinámicamente los setpoints según la fase del ciclo
- Control por VPD alinea el ambiente con la fisiología real del hongo
- La automatización es completa: desde sensor → evaluación → actuador
- El firmware mantiene capacidad de operación local (fallback)

### Negativas
- Dependencia de HTTP para sincronización de setpoints (si HTTP falla, firmware usa últimos valores de la cola persistente en DB)
- El VPD requiere ambos sensores (T + HR) funcionando correctamente
- La transición de fase agresiva puede estresar el cultivo si los sensores fallan

## Implementación

- `backend/src/services/controlEngine.js`: Extiende `evaluateCycle()` para encolar comandos HTTP a actuadores usando histéresis con deadband y jerarquía
- `backend/src/services/commandQueue.js`: Gestiona la cola de comandos persistente en PostgreSQL
- `firmware/src/main.ino`: Manejo de comandos REMOTE y actualización de setpoints vía `onConfig()`
- `firmware/src/config.h`: CH4 reasignado a iluminación; setpoints por defecto para Reishi

## Referencias

- `docs/roadmap/consideraciones.md` — Sección 5: Pseudocódigo de flujo de control
- `docs/roadmap/otras-consideraciones.md` — Sección 1: VPD (Ley No Negociable)
- `docs/roadmap/otras-consideraciones.md` — Sección 7: Fotoperiodo con Transición Suave
- `docs/roadmap/milestone.md` — M4: Automatización (Fase 4)

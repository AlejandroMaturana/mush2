# EDD-008 — Scenario Model

## Metadata

| Campo | Valor |
|-------|-------|
| Autor | Equipo Mush2 |
| Estado | DRAFT |
| Fecha | 2026-07-30 |
| ADRs rel. | ADR-026, ADR-031 |
| RFC rel. | RFC-0010 |

## 1. Problema / Contexto

La Simulation Platform necesita validar comportamiento del ecosistema ante condiciones variadas (invierno, verano, power loss, MQTT loss, sensor failure, CO₂ alto, night mode, stress test). Sin un modelo de escenario, cada condición exigiría cambiar configuración del simulador manualmente. Se requiere un **escenario** como una entidad configurable que altere el comportamiento del Virtual Device de forma determinista.

## 2. Objetivos

- Definir una estructura de escenario declarativa y externa.
- Alterar el comportamiento del Virtual Device (magnitudes, alarmas, desconexiones) de forma determinista.
- Permitir secuencias temporales de eventos.
- Mantener los mensajes dentro del contrato congelado.

## 3. No-objetivos

- Precisión científica del ambiente (FASE 3 define modelos; el escenario los orquesta).
- Multi-dispositivo (FASE 5).
- Tiempo virtual (FASE 6).
- Definir la implementación concreta (diseño).

## 4. Alternativas consideradas

| Alternativa | Decisión |
|-------------|----------|
| Escenarios embebidos en código | Descartada — no configurables |
| Perfil estático por dispositivo | Parcial — insuficiente para secuencias |
| Escenario declarativo externo (JSON) | **Adoptada** |

## 5. Solución propuesta

### 5.1 Estructura del escenario

```json
{
  "id": "invierno",
  "description": "Perfil de invierno",
  "seed": 42,
  "duration": 3600,
  "baseState": { "temperature": 8, "humidity": 70, "co2": 500 },
  "policies": [
    { "type": "drift", "target": "temperature", "rate": -0.1, "min": 5, "max": 12 }
  ],
  "events": [
    { "at": 600, "type": "sensor_failure", "sensor": "co2" },
    { "at": 900, "type": "mqtt_loss", "duration": 30 },
    { "at": 1200, "type": "alarm", "reason": "CO2_HIGH" }
  ]
}
```

### 5.2 Componentes del modelo

| Elemento | Descripción |
|----------|-------------|
| `baseState` | Estado inicial del Virtual Device al aplicar el escenario |
| `policies` | Reglas deterministas de evolución (drift, oscilación, decaimiento) |
| `events` | Perturbaciones en instantes determinados (t, tipo, parámetros) |
| `duration` | Duración simulada |
| `seed` | Semilla para cualquier componente aleatorio (determinismo) |

### 5.3 Tipos de eventos (catálogo inicial)

`power_loss`, `mqtt_loss`, `sensor_failure`, `alarm`, `command_override`, `telemetry_spike`, `maintenance_event`.

### 5.4 Determinismo

- Dado `(escenario, seed, reloj)`, la secuencia de estados y mensajes es idéntica.
- El reloj es el real hasta la FASE 6 (Virtual Time); el escenario solo define instantes relativos.

### 5.5 Aplicación

El Scenario Engine (FASE 4) carga el escenario, lo aplica al estado del Virtual Device y emite eventos a los mensajes del contrato. Ningún mensaje resultante puede violar los schemas de conformance.

## 6. Impacto en componentes

| Componente | Impacto |
|------------|---------|
| Virtual Device | Consume estado y perturbaciones del escenario |
| Backend | Ninguno |
| Contrato | Ninguno — los mensajes siguen siendo canónicos |

## 7. Plan de implementación

1. FASE 3: modelos de ambiente que el escenario referencia.
2. FASE 4: motor de escenarios + configuración declarativa.
3. FASE 5+: orquestación multi-dispositivo.

## 8. Métricas de éxito

- Un escenario declarativo produce una secuencia de mensajes conformes al contrato.
- Repetir el mismo escenario con la misma semilla produce la misma secuencia.
- Los eventos (p. ej. `mqtt_loss`) producen comportamiento observable esperado (desconexión/LWT).

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Escenario produce mensajes no conformes | Validadores de conformance como gate |
| No determinismo | `seed` obligatorio |
| Over-engineering del catálogo de eventos | Catálogo mínimo inicial, extensible |

## 10. Referencias

- `docs/contracts/conformance/README.md`
- `simulation-platform-roadmap.md`

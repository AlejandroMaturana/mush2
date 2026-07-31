# Engineering Design Documents (EDD) — Mush2

Los EDD documentan el **diseño técnico de alto nivel** de subsistemas complejos.

## ¿Cuándo crear un EDD?

Crea un EDD cuando:
- Diseñas un subsistema nuevo que involucra **2 o más componentes** (firmware + backend, backend + frontend, etc.)
- La solución tiene **múltiples alternativas no triviales** que deben evaluarse
- El riesgo de implementación es **alto** (seguridad, datos, comunicaciones en tiempo real)
- Necesitas **alineación del equipo** antes de escribir código

**No** crea un EDD para:
- Bugfixes o cambios menores
- Añadir un endpoint o modelo simple
- Cambios de UI sin impacto en lógica de negocio

## ¿En qué se diferencia de un ADR?

| EDD | ADR |
|-----|-----|
| Diseño **antes** de implementar | Registro de decisión **ya tomada** |
| Explora alternativas en profundidad | Documenta el porqué de la elección final |
| Puede ser rechazado y revisado | Es inmutable (se crea uno nuevo para reemplazarlo) |
| Vive en `docs/EDD/` | Vive en `docs/ADR/` |
| Referenciado en PRs y tareas | Referenciado en código y contratos |

## Ciclo de vida

```
DRAFT → REVIEW (7 días) → ACCEPTED / REJECTED / SUPERSEDED
```

| Estado | Descripción |
|--------|-------------|
| `DRAFT` | En redacción, no listo para revisión |
| `REVIEW` | Listo para comentarios del equipo |
| `ACCEPTED` | Aprobado; puede implementarse |
| `REJECTED` | Descartado con justificación documentada |
| `SUPERSEDED` | Reemplazado por EDD-NNN |

## Índice

| EDD | Título | Estado |
|-----|--------|--------|
| [EDD-001](EDD-001-sistema-control-ambiental.md) | Sistema de control ambiental end-to-end | ACCEPTED |
| [EDD-002](EDD-002-motor-reglas-recetas.md) | Motor de reglas y recetas de cultivo | ACCEPTED |
| [EDD-003](EDD-003-ota-v3-canary-deployment.md) | OTA v3 con canary deployment | ACCEPTED |
| [EDD-004](EDD-004-estrategia-multitenant.md) | Estrategia multi-tenant y escalabilidad | DRAFT |
| [EDD-005](EDD-005-BLE-provisioning.md) | BLE Provisioning — configuración inicial por Bluetooth | DRAFT |
| [EDD-006](EDD-006-mapeo-canales-actuadores.md) | Mapeo canónico de canales de actuadores | ACCEPTED |
| [EDD-007](EDD-007-virtual-device-model.md) | Virtual Device Model — modelo de dispositivo simulado | DRAFT |
| [EDD-008](EDD-008-scenario-model.md) | Scenario Model — escenarios declarativos | DRAFT |

## Template

Ver [template](template.md) para un ejemplo de EDD completo.

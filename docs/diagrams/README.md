# Diagramas — Mush2

> Política de diagramas, convenciones de nomenclatura y renders de referencia.

---

## Política de Diagramas

### Herramienta principal: Mermaid

Todos los diagramas del proyecto se mantienen en formato **Mermaid** (`.mmd`). Mermaid es el formato nativo para diagramas embebidos en Markdown y se renderiza directamente en GitHub, VitePress y la mayoría de editores de Markdown.

### Excepción: `state_machine.drawio`

El diagrama de la **máquina de estados del dispositivo** (`docs/diagrams/exports/state_machine.drawio`) se conserva como el **único archivo fuente de Draw.io** del proyecto. Esta es una **decisión deliberada de documentación**, no una limitación técnica:

- El diagrama de máquina de estados representa el **modelo operacional completo** de Mush2 y actúa como pieza central ("master diagram").
- Su función es servir como **referencia visual de alto nivel**, apta para impresión, revisión de diseño y comunicación técnica.
- El control manual de la composición, distribución espacial y jerarquía visual aporta un valor que excede el objetivo de los diagramas embebidos en Markdown.

**Ningún otro diagrama deberá crearse en Draw.io** salvo que una ADR futura modifique esta política.

---

## Convenciones de Nomenclatura

| Tipo de Diagrama | Formato | Nombre | Ejemplo |
|---|---|---|---|
| Arquitectura del sistema | `.mmd` | `architecture.mmd` | Diagrama de componentes y flujos |
| Modelo de datos | `.mmd` | `database.mmd` | Diagrama ER con entidades y relaciones |
| Secuencia de boot | `.mmd` | `sequence-boot.mmd` | Secuencia de arranque del firmware |
| Secuencia de telemetría | `.mmd` | `sequence-telemetry.mmd` | Flujo sensor → backend → dashboard |
| Secuencia de actuador | `.mmd` | `sequence-actuator.mmd` | Comando usuario → SSR → ACK |
| Secuencia de failover | `.mmd` | `sequence-failover.mmd` | Reconexión y modo degradado |
| Máquina de estados | `.drawio` | `exports/state_machine.drawio` | **Única excepción Draw.io** |

### Reglas

- Los archivos `.mmd` van en `docs/diagrams/` (raíz del directorio de diagramas).
- Los archivos `.drawio` van en `docs/diagrams/exports/` (solo `state_machine.drawio`).
- Los SVGs generados por herramientas externas van en `docs/diagrams/` pero **no se versionan** (están en `.gitignore` o se generan en CI).

---

## Archivos Actuales

### Mermaid (`.mmd`) — Fuentes principales

| Archivo | Tipo | Descripción |
|---|---|---|
| `architecture.mmd` | Block | Arquitectura del sistema: firmware, backend, DB, frontend, externos |
| `database.mmd` | ER | Modelo de base de datos: 25 entidades con relaciones |
| `sequence-boot.mmd` | Sequence | Boot del firmware: BOOT → INIT → WIFI → NORMAL |
| `sequence-telemetry.mmd` | Sequence | Flujo de telemetría: sensores → HTTP/MQTT → DB → SSE → Frontend |
| `sequence-actuator.mmd` | Sequence | Control de actuador: usuario → API → MQTT → firmware → ACK |
| `sequence-failover.mmd` | Sequence | Failover: broker caído → reconexión → modo degradado → safe mode |

### Draw.io (`.drawio`) — Excepción

| Archivo | Tipo | Descripción |
|---|---|---|
| `exports/state_machine.drawio` | StateDiagram | Máquina de estados del dispositivo: 8 estados (BOOT, INIT, WIFI, NORMAL, DEGRADED, ERROR, RECOVERY, SAFE) |

---

## Cómo Usar los Diagramas

### En Markdown (renderizado automático)

```markdown
```mermaid
graph TB
    A --> B
```​
```

GitHub y VitePress renderizan automáticamente los bloques ` ```mermaid `.

### Edición de `state_machine.drawio`

1. Abrir [app.diagrams.net](https://app.diagrams.net/)
2. Cargar `docs/diagrams/exports/state_machine.drawio`
3. Editar y guardar
4. El archivo se renderiza como imagen estática en GitHub (no como Mermaid)

---

## Referencias en Documentación

Los diagramas Mermaid se referencian directamente en los archivos Markdown donde se necesitan. No se mantienen archivos SVG pre-renderizados.

Para documentación que requiere imágenes estáticas (presentaciones, PDFs), se puede renderizar el `.mmd` a SVG con:

```bash
npx @mermaid-js/mermaid-cli mmdc -i docs/diagrams/architecture.mmd -o docs/diagrams/architecture.svg
```

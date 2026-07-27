# Draw.io Exports — Mush2

> Este directorio contiene el **único archivo fuente de Draw.io** del proyecto: `state_machine.drawio`.

---

## Política

Ver `docs/diagrams/README.md` para la política completa de diagramas.

Todos los demás diagramas se mantienen en Mermaid (`.mmd`) en `docs/diagrams/`. Solo `state_machine.drawio` se conserva en Draw.io como diagrama maestro del proyecto.

---

## Archivo Único

| Archivo | Descripción | Renderizado |
|---|---|---|
| [`state_machine.drawio`](state_machine.drawio) | Máquina de estados del dispositivo ESP32-S3: 8 estados (BOOT, INIT, WIFI, NORMAL, DEGRADED, ERROR, RECOVERY, SAFE) | Se renderiza como imagen estática en GitHub |

---

## Exportación de `state_machine.drawio`

### Opción A: Draw.io Web (Recomendado)

1. Abre [app.diagrams.net](https://app.diagrams.net/)
2. Carga `state_machine.drawio`
3. **Archivo** → **Exportar como** → **PNG...** o **SVG...**
4. Borde: 10, Tamaño: 100%
5. Guarda en `docs/diagrams/exports/`

### Opción B: VS Code Extension

1. Abre `state_machine.drawio` en VS Code (extensión Draw.io Integration)
2. Click derecho en la pestaña → **Export**

### Opción C: CLI

```bash
drawio -x -f png --page-index 0 \
  -o docs/diagrams/exports/state_machine.png \
  docs/diagrams/exports/state_machine.drawio
```

---

## Nota

Los diagramas Mermaid (`.mmd`) no requieren exportación — se renderizan automáticamente en GitHub y VitePress.

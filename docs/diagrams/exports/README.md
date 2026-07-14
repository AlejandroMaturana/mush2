# Exportación de Diagramas — Mush2

Los diagramas de arquitectura se editan en formato `.drawio` dentro de `docs/diagrams/` usando la herramienta [Draw.io](https://app.diagrams.net/). 

Para que estos diagramas sean visibles directamente en GitHub o en la documentación Markdown, deben exportarse en formato **PNG** o **SVG** dentro de esta carpeta (`docs/diagrams/exports/`).

---

## Procedimiento de Exportación

### Opción A: Usando la aplicación web de Draw.io (Recomendado)

1. Abre [app.diagrams.net](https://app.diagrams.net/).
2. Carga el archivo `.drawio` correspondiente (ej: `architecture.drawio`).
3. Ve a **Archivo** (File) → **Exportar como** (Export as) → **PNG...** o **SVG...**.
4. En las opciones de exportación:
   - Selecciona **Borde: 10** (para evitar recortes).
   - Asegúrate de marcar **Fondo transparente** si usas PNG (opcional).
   - Deja el tamaño al **100%**.
   - Haz click en **Exportar**.
5. Guarda el archivo con el mismo nombre base en `docs/diagrams/exports/` (ej: `architecture.png`).

### Opción B: Usando VS Code Extension (Draw.io Integration)

Si utilizas VS Code, puedes instalar la extensión **"Draw.io Integration"** de Henning Dieterichs:

1. Abre el archivo `.drawio` directamente en VS Code.
2. Haz click derecho en la pestaña del editor de Draw.io.
3. Selecciona **Export** o guarda directamente configurando el auto-export en los settings de la extensión.

### Opción C: Exportación automática por línea de comandos (CLI)

Si deseas automatizar la exportación en tus scripts o CI/CD, puedes usar la herramienta CLI de Draw.io:

```bash
# Exportar a PNG
drawio -x -f png --page-index 0 -o docs/diagrams/exports/architecture.png docs/diagrams/architecture.drawio

# Exportar a SVG
drawio -x -f svg --page-index 0 -o docs/diagrams/exports/architecture.svg docs/diagrams/architecture.drawio
```

---

## Archivos Requeridos

Cada archivo `.drawio` debe tener su correspondiente exportación actualizada:

| Archivo Fuente | Exportación Requerida | Renderizado en Markdown |
|---|---|---|
| [`architecture.drawio`](../architecture.drawio) | `architecture.png` | `![Arquitectura](exports/architecture.png)` |
| [`database.drawio`](../database.drawio) | `database.png` | `![Base de datos](exports/database.png)` |
| [`sequence.drawio`](../sequence.drawio) | `sequence.png` | `![Secuencia](exports/sequence.png)` |
| [`state_machine.drawio`](../state_machine.drawio) | `state_machine.png` | `![Máquina de estados](exports/state_machine.png)` |

# Design Tokens — Mush2 Frontend

> Sistema de tokens centralizado. Todos los valores provienen de `:root` en `src/index.css`.
> **Regla férrea:** Ningún componente debe usar valores hardcodeados. Siempre referenciar la variable CSS.

---

## 1. Color

### 1.1 Semantic palette

| Token | Valor | Uso |
|-------|-------|-----|
| `--spore-green` | `#6bfb9a` | Acción primaria, elementos activos, acento principal |
| `--teal` | `#44e2cd` | Acento secundario, hover state en sidebar |
| `--amber` | `#ffb657` | Advertencia, estado de alerta media |
| `--error-red` | `#ffb4ab` | Error, estado crítico, peligro |
| `--spore-glow` | `rgba(74, 222, 128, 0.2)` | Sombra glow de elementos activos |

### 1.2 Surface hierarchy

| Token | Valor | Rol |
|-------|-------|-----|
| `--bg-deep` | `#0a0f0d` | Fondo raíz (`body`) |
| `--surface-container-lowest` | `#0a0f0d` | Nivel más profundo (alias de bg-deep) |
| `--surface-dim` | `#0f1412` | Superficie base de paneles |
| `--surface-container-low` | `#181d1a` | Sidebar, fondos secundarios |
| `--surface-container` | `#1c211e` | Cards, contenedores estándar |
| `--surface-container-high` | `#262b29` | Hover de cards, headers de sección |
| `--surface-container-highest` | `#313633` | Input backgrounds, variante elevada |
| `--surface-variant` | `#313633` | Variante de superficie, item activo |
| `--surface-bright` | `#353a38` | Superficie brillante, hover de botones |

### 1.3 Outline

| Token | Valor | Uso |
|-------|-------|-----|
| `--outline-variant` | `#3d4a3e` | Bordes sutiles de cards, separadores |
| `--outline` | `#869486` | Bordes fuertes, íconos inactivos |

### 1.4 Texto (On-colors)

| Token | Valor | Uso |
|-------|-------|-----|
| `--on-surface` | `#dfe4e0` | Texto principal sobre superficies |
| `--on-surface-variant` | `#bccabb` | Texto secundario, labels, metadata |
| `--on-primary` | `#003919` | Texto sobre fondo primary (btn-primary) |
| `--on-primary-container` | `#005e2d` | Texto sobre primary-container |
| `--on-error` | `#690005` | Texto sobre fondo error |
| `--on-error-container` | `#ffdad6` | Texto sobre error-container |

### 1.5 Containers

| Token | Valor | Uso |
|-------|-------|-----|
| `--primary-container` | `#4ade80` | Fondo de contenedor primario (badges, alerts) |
| `--error-container` | `#93000a` | Fondo de contenedor de error |

### 1.6 Legacy aliases (compatibilidad)

| Alias | Resuelve a | Migrar a |
|-------|-----------|----------|
| `--bg` | `--surface-dim` | Usar `--surface-dim` |
| `--surface` | `--surface-container` | Usar `--surface-container` |
| `--surface2` | `--outline-variant` | Usar `--outline-variant` |
| `--text` | `--on-surface` | Usar `--on-surface` |
| `--text2` | `--on-surface-variant` | Usar `--on-surface-variant` |
| `--accent` | `--spore-green` | Usar `--spore-green` |
| `--green` | `--spore-green` | Usar `--spore-green` |
| `--red` | `--error-red` | Usar `--error-red` |
| `--orange` | `--amber` | Usar `--amber` |
| `--radius` | `--radius-lg` | Usar `--radius-lg` |

> **Nota:** Los aliases existen para componentes de la primera versión. Los componentes nuevos deben usar los tokens semánticos directamente.

---

## 2. Tipografía

### 2.1 Font families

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-body` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | Body, headings, texto general |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', monospace` | Data displays, labels, terminal, código |

### 2.2 Utility classes tipográficas

| Clase CSS | Font | Size | Weight | Letter-spacing | Uso |
|-----------|------|------|--------|---------------|-----|
| `.text-label-caps` | `--font-mono` | `10px` | `700` | `0.1em` | Labels, badges, headers de sección |
| `.text-headline-lg` | `--font-body` | `24px` | `600` | normal | Títulos de página, headlines grandes |
| `.text-headline-md` | `--font-body` | `18px` | `600` | normal | Subtítulos, títulos de card |
| `.text-body-md` | `--font-body` | `14px` | `400` | normal | Párrafos, contenido general |
| `.text-data-sm` | `--font-mono` | `12px` | `500` | normal | Data secundaria, timestamps |
| `.text-display-data` | `--font-mono` | `48px` | `600` | `-0.02em` | Valores numéricos grandes (responsive: 32px en mobile) |

### 2.3 Size utility classes

Clases atómicas para casos específicos: `.text-7px`, `.text-8px`, `.text-9px`, `.text-10px`, `.text-11px`, `.text-12px`, `.text-14px`, `.text-16px`, `.text-18px`, `.text-20px`, `.text-32px`, `.text-36px`, `.text-48px`, `.text-64px`, `.text-96px`.

---

## 3. Espaciado

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-unit` | `4px` | Unidad mínima de espaciado |
| `--space-stack-sm` | `8px` | Padding interno pequeño, gap entre elementos relacionados |
| `--space-stack-md` | `16px` | Padding interno estándar |
| `--space-gutter` | `12px` | Gap entre cards en grid |
| `--space-container-padding` | `24px` | Padding de página (`.app-content`) |

Gap utility classes: `.gap-1` (4px), `.gap-2` (8px), `.gap-3` (12px), `.gap-4` (16px), `.gap-5` (20px), `.gap-6` (24px), `.gap-8` (32px).

Padding/Margin: `.p-4` (16px), `.p-5` (20px), `.py-20` (80px), `.px-6` (24px), `.mt-2` (8px), `.mb-4` (16px), etc.

---

## 4. Border radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-xs` | `4px` | Skeleton lines, segmentos pequeños |
| `--radius-sm` | `6px` | Inputs, icon buttons |
| `--radius-md` | `8px` | Cards estándar, botones, paneles |
| `--radius-lg` | `12px` | Glass cards, modales, contenedores principales |
| `--radius-xl` | `16px` | Paneles grandes, contenedores especiales |
| `--radius-full` | `9999px` | Badges, dots, toggle switch, pills |

---

## 5. Efectos y sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--glow-primary` | `0 0 12px rgba(74, 222, 128, 0.2)` | Sombra glow en elementos primarios activos |
| `--glow-error` | `0 0 12px rgba(255, 180, 171, 0.3)` | Sombra glow en estados de error |
| `--glass-bg` | `rgba(19, 26, 23, 0.8)` | Fondo de glass cards (backdrop-filter: blur) |
| `--glass-border` | `#1f2924` | Borde de glass cards |

Clases de glow utilitarias:
- `.active-glow` → `box-shadow: var(--glow-primary)`
- `.active-glow-error` → `box-shadow: var(--glow-error)`

---

## 6. Animaciones

### 6.1 Keyframes definidos

| Nombre | Propósito | Duración |
|--------|-----------|----------|
| `shimmer` | Skeleton loading shimmer | 1.5s infinite |
| `breathe` | Pulso de opacidad y escala | 3s ease-in-out infinite |
| `breathe-node` | Breathing nodes decorativos | 6s ease-in-out infinite |
| `pulse-glow` | Glow pulsante con drop-shadow | 2s ease-in-out infinite |
| `pulse-glow-anim` | Glow con opacidad + filter (status) | 2s / 3s infinite |
| `status-pulse` | Status dot pulse | 2s cubic-bezier infinite |
| `pulse` | Opacidad simple | 2s cubic-bezier infinite |
| `pulse-slow` | Escala + opacidad lenta | 4s ease-in-out infinite |
| `spin` | Rotación 360° | 1s linear infinite |
| `drawPath` | Dash-offset para líneas SVG | 10s linear infinite |
| `scan` | Línea de escaneo vertical | 4s linear infinite |
| `glitchWave` | Glitch horizontal | 2s infinite linear |
| `fadeIn` | Opacidad 0→1 | 0.3s |
| `slideUp` | Opacidad + translateY | 0.3s |
| `slideDown` | Opacidad + translateY (-8px) | 0.3s |
| `shake` | TranslateX alternado | 0.3s |

### 6.2 Clases de animación

| Clase | Animación | Uso típico |
|-------|-----------|------------|
| `.breathing-pulse` | `breathe` | LEDs activos, dots de estado, nodos SVG |
| `.bioluminescent-path` | `drawPath` | Líneas decorativas SVG |
| `.glow-pulse` | `pulse-glow` | Botones primarios, cards activas |
| `.shimmer` / `.skeleton-shimmer` | `shimmer` | Skeleton loading |
| `.status-dot.pulse` | `status-pulse` | Dots de estado online/critical |
| `.animate-pulse` | `pulse` | Opacidad simple |
| `.animate-spin` | `spin` | Loaders, íconos de carga |
| `.animate-pulse-slow` | `pulse-slow` | Elementos decorativos |
| `.status-glow-running` | `pulse-glow-anim` | Indicadores de estado running |
| `.status-glow-paused` | `pulse-glow-anim` (3s) | Indicadores de estado paused |

---

## 7. Layout shell

| Variable implícita | Valor | Uso |
|--------------------|-------|-----|
| Sidebar width (desktop) | `80px` | Navegación principal |
| Sidebar width (tablet) | `64px` | Navegación colapsada |
| TopBar height | `64px` | Barra superior fija |
| StatusFooter height | `32px` | Barra de estado inferior |
| BottomNav height | `64px` | Navegación mobile |
| `.app-content margin-left` | `80px` (desktop) / `64px` (tablet) / `0` (mobile) | Área de contenido |
| `.app-content margin-top` | `64px` | Compensación de TopBar |
| Breakpoint tablet | `768px` | Sidebar colapsada |
| Breakpoint mobile | `480px` | BottomNav visible |

---

## 8. Z-index jerarquía

| Capa | Valor | Elementos |
|------|-------|-----------|
| Base | `1` | Contenido normal |
| TopBar | `30` | Barra superior |
| Sidebar | `40` | Barra lateral |
| BottomNav | `50` | Navegación mobile |
| Overlay | `100` | Modales, SystemAlert, OfflineOverlay |

---

## 9. Glass card spec

```
.glass-card
  background:   var(--glass-bg)
  border:       1px solid var(--glass-border)
  backdrop-filter: blur(8px)
  transition:   all 0.2s cubic-bezier(0.4, 0, 0.2, 1)

  &:hover
    border-color: var(--spore-green)
    box-shadow:   var(--glow-primary)
```

Variantes de borde-accento:
- `border-l-4 border-l-primary` — dato primario
- `border-l-4 border-l-secondary` — dato secundario
- `border-l-4 border-l-error` — estado crítico
- `border-t-2 border-t-secondary` — card de feature

---

## 10. Micro-interacciones estándar

| Elemento | Efecto |
|----------|--------|
| Botón clickeable | `hover:brightness-110 active:scale-95 transition-all` |
| Glass card hover | `hover:bg-surface-container-high transition-all duration-300` |
| Toggle switch | Transición de color + knob en 200ms |
| Input focus | `box-shadow: 0 0 12px rgba(107,251,154,0.25)` + borde primario |
| Focus visible global | `outline: 2px solid var(--primary); outline-offset: 2px` |

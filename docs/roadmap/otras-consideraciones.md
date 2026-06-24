# Backlog Técnico — Consideraciones Pendientes

> Documento derivado de la revisión técnica del sprint anterior. Los items aquí listados
> **no fueron implementados** y representan deuda técnica o mejoras futuras.
> Cada item está vinculado a la fase del roadmap donde corresponde abordarlo.

---

## Pendientes por Implementar

### 1. Deadband Adaptativa por Fase de Crecimiento
**Vinculado a**: Fase 12 — Automatización Adaptativa

Actualmente las bandas de histéresis son constantes de compilación (`#define HYSTERESIS_BAND_TEMP 1.0`, etc.).
El micelio genera calor metabólico que varía según la fase de crecimiento.

- **Colonización** (micelio activo): deadband de ±1.5°C y ±10% HR
- **Fructificación** (cuerpos frutales frágiles): deadband de ±0.5°C y ±5% HR

### 2. Secuencia de Arranque (Power-On Sequence)
**Vinculado a**: Fase 8 — Multi-Cámara / Fase 12

El ENS160 da lecturas erráticas de CO₂ (hasta 2000 ppm falsos) durante los primeros 3 minutos.
Secuencia propuesta:
1. **T=0s**: Solo sensores AHT21 + ENS160 (warm-up)
2. **T=5s**: Leer baseline de T°/HR
3. **T=10s**: Ventilador al 20% por 10s para purgar gases acumulados
4. **T=30s**: Habilitar control automático completo

### 3. Gestión Térmica del SSR
**Vinculado a**: Fase 5 — Hardening (mantención)

Los SSR de 2A disipan ~1.5W por canal. Sin disipación adecuada:
- No montar los 4 SSR juntos sin separación de 15mm
- Si temp del disipador >55°C: activar ventilador de 12V dedicado
- Reducir ciclo de trabajo de actuadores

### 4. Control de Calidad del Aire por TVOC
**Vinculado a**: Fase 12 — Automatización Adaptativa

El ENS160 reporta TVOC pero no se usa para control. Los hongos liberan etanol y VOC
durante la fructificación. Si TVOC >500 ppb:
- Activar ventilador en modo pulsos (30s ON / 2min OFF)
- Más efectivo que siempre ON: crea turbulencia sin secar demasiado

### 5. Recuperación del Bus I2C ante Fallos
**Vinculado a**: Fase 8 — Multi-Cámara / Hardening

Si la lectura del AHT21 falla 3 veces seguidas, actualmente se entra en modo seguro
pero no se recupera el bus I2C a nivel hardware. Mejora propuesta:
```cpp
Wire.end();
delay(100);
Wire.begin();
```

### 6. Cálculo de VPD en Firmware
**Vinculado a**: Fase 12 — Automatización Adaptativa

Actualmente el VPD se calcula solo en backend (`controlEngine.js`). Para control
en LOCAL mode (sin backend), el firmware debería calcular VPD:
```
PresiónVaporSaturación (kPa) = 0.6108 * e^((17.27*T)/(T+237.3))
VPD = ((100 - HR) / 100) * PresiónVaporSaturación
```

---

## Tabla de Prioridad

| # | Item | Fase Roadmap | Impacto | Esfuerzo Estimado |
|---|------|-------------|---------|-------------------|
| 1 | Deadband adaptativa | F12 | Medio | Pequeño |
| 2 | Power-on sequence | F8 / F12 | Alto (precisión CO₂) | Pequeño |
| 3 | SSR thermal management | F5 | Medio (vida útil HW) | Medio |
| 4 | TVOC-based fan pulsing | F12 | Bajo-Medio | Pequeño |
| 5 | I2C bus recovery | F8 | Bajo (resiliencia) | Mínimo |
| 6 | VPD en firmware | F12 | Alto (control LOCAL) | Medio |

---

*Revisado: 2026-06-24 — Items extraídos de `otras-consideraciones.md` original y
`consideraciones.md` (archivados por implementación completa en sprint anterior).*

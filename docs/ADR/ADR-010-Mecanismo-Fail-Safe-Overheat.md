# ADR-010: Mecanismo Fail-Safe de Sobretemperatura

**Estado:** Aceptado  
**Fecha:** 2026-06-21  
**Última actualización:** 2026-07-24

## Contexto

El sistema controla cargas de AC mediante relés de estado sólido (SSR). La temperatura del cultivo es una variable crítica: si supera un umbral de seguridad, la estructura del micelio sufre daños irreversibles. No existe actualmente un mecanismo que actúe de forma independiente del bucle de control normal para garantizar la integridad térmica ante fallos de sensor, control o hardware.

## Decisión

### 1. Override de Emergencia por Sobretemperatura

El sistema implementa un mecanismo de interrupción con **máxima prioridad** que se evalúa antes del bucle de control normal:

- **Detección:** Existe un umbral de activación configurable. La evaluación se realiza periódicamente en el mismo ciclo de lectura de sensores.
- **Acción al activar:** Todos los actuadores se apagan inmediatamente. El ventilador se fuerza al 100% de capacidad para disipar calor acumulado.
- **Recuperación:** Existe un umbral de recuperación diferencial (histéresis) que evita oscilaciones entre activación y desactivación. La recuperación es automática sin intervención externa.
- **Prioridad:** El override tiene precedencia sobre cualquier estado del bucle de control, modos de operación o comandos remotos.

### 2. Alarma de Sobretemperatura

Cuando se activa el override, el sistema genera una alarma de sobretemperatura para su consumo por capas superiores. La alarma es un evento independiente del mecanismo de transporte: puede ser consultada por cualquier componente del sistema que requiera conocer el estado de seguridad del dispositivo.

### 3. Detección de Fallo del Sensor de Temperatura

El sistema detecta fallos del sensor de temperatura principal mediante la observación de lecturas inválidas consecutivas:

- **Criterio de fallo:** Tres lecturas consecutivas marcadas como inválidas activan el estado de fallo.
- **Acción al detectar fallo:** Todos los apagadores se desactivan. El sistema transita a un estado seguro donde no se permite el control automático.
- **Recuperación:** La recuperación del estado de fallo requiere que el sensor proporcione lecturas válidas de nuevo.

### 4. Transición de Estado de Seguridad

El sistema distingue entre dos estados operacionales:

- **Normal:** El control de histéresis opera con lecturas válidas de temperatura.
- **Error:** El sensor ha fallado. Se suspende el control automático y se mantienen los actuadores apagados.

La transición de normal a error ocurre tras múltiples fallos consecutivos. La transición de error a normal ocurre cuando el sensor se recupera. Esta máquina de estados garantiza que un sensor intermitente no provoque ciclos de activación/desactivación inestables.

## Consecuencias

### Positivas
- El cultivo nunca supera el umbral crítico aunque fallen todos los controles normales
- El sistema se recupera automáticamente de fallos del sensor sin intervención externa
- La alarma permite a capas superiores notificar al operador

### Negativas
- El override puede causar ciclos de temperatura si el sensor falla de forma intermitente
- La acción de apagado total interrumpe control que podría estar operando correctamente

## Referencias

- `docs/roadmap/roadmap.md` — Fase 11 (Observabilidad): Fail-Safe Overheat
- Capacidades futuras:Power-On Sequence, gestión térmica del SSR, protección contra overshoot — documentadas en el roadmap

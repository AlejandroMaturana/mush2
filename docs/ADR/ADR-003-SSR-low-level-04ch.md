# ADR-003: Selección del módulo SSR de 4 canales para control de actuadores con ACK

**Fecha**: 2026-06-10 (actualizado 2026-06-21)
**Estado**: Aceptado

## Contexto
El sistema de control ambiental requiere actuar sobre cargas de corriente alterna (ventiladores, resistencias calefactoras, humidificadores) en respuesta a las lecturas de los sensores. Se necesita un módulo de conmutación que aísle galvánicamente la lógica de 3.3V del ESP8266 de la línea de 220V AC, que soporte al menos 2A por canal, y que pueda ser controlado directamente desde los GPIOs.

## Decisión
Usar un **módulo SSR de 4 canales** con activación por nivel alto (high-level trigger) a 3.3V, controlando:
- Canal 1 (D5/GPIO14): Ventilación
- Canal 2 (D7/GPIO13): Calefacción
- Canal 3 (D6/GPIO12): Humidificación
- Canal 4 (D0/GPIO16): Humidificación

## Motivos
1. **Aislamiento galvánico por optoacoplador**: Cada canal separa físicamente la lógica de control de la línea de potencia.
2. **Conmutación silenciosa**: SSRs con detección de cruce por cero eliminan ruido electromagnético.
3. **Ausencia de partes móviles**: Vida útil prácticamente ilimitada para cargas resistivas.
4. **Activación por nivel alto (high-level trigger)**: Compatible directamente con los GPIOs del ESP8266 a 3.3V.
5. **Cuatro canales para redundancia**: Cubren ventilación, calefacción y doble humidificación para ambientes que requieren mayor capacidad de generación de vapor.

## Consecuencias
- **Corriente máxima limitada a 2A por canal**: No apto para cargas de alta potencia (>400W).
- **Solo apto para cargas resistivas o ligeramente inductivas**: Verificar corriente de arranque de ventiladores.
- **Disipación térmica**: Cada SSR disipa ~0.8W por amperio conducido.
- **Necesidad de fuente externa de 5V**: Para la etapa de control del módulo SSR.
- **Incompatibilidad con dimming**: Solo conmutación ON/OFF completo.

## Alternativas descartadas
- **Módulo SSR de 2 canales**: Insuficiente para cubrir ventilación, calefacción y humidificación doble.
- **Relés electromecánicos**: Generan ruido audible, desgaste mecánico y requieren más corriente.
- **Módulo SSR individual (Fotek SSR-25DA)**: Mayor capacidad pero más costoso y voluminoso.
- **Triac + MOC3021 discreto**: Requiere diseño de PCB y mayor complejidad.

## Detalle técnico

### Mapeo de pines
| Canal | Pin ESP8266 | GPIO   | Actuador        |
|-------|-------------|--------|-----------------|
| 1     | D5          | GPIO14 | Ventilación     |
| 2     | D7          | GPIO13 | Calefacción     |
| 3     | D6          | GPIO12 | Humidificación  |
| 4     | D0          | GPIO16 | Humidificación  |

### Configuración en firmware
```cpp
// config.h
#define SSR_ACTIVE_HIGH 1
#define SSR1_PIN D5  // CH1 — Ventilación
#define SSR2_PIN D7  // CH2 — Calefacción (evita LED_BUILTIN en D4)
#define SSR3_PIN D6  // CH3 — Humidificación
#define SSR4_PIN D0  // CH4 — Humidificación
```

### Clase SSRController
El firmware implementa `SSRController` con las siguientes características:
- Control de 4 canales independientes
- Lógica activa en alto (`SSR_ACTIVE_HIGH=1`)
- Temporizadores de seguridad (`minOnTime`, `maxOnTime`)
- Respuesta a comandos MQTT (ON/OFF por canal)
- Publicación de estado de actuadores

### Control por histéresis
El `HysteresisController` evalúa las lecturas de sensores y activa/desactiva los SSRs:
- Temperatura < tempMin → activa calefacción (canal 2)
- Temperatura > tempMax → desactiva calefacción
- eCO₂ > co2Max → activa ventilación (canal 1)
- Humedad < humMin → activa humidificación (canales 3 y 4)
- Humedad > humMax → desactiva humidificación

## Referencias
- Implementación: `firmware/src/ssr_controller.cpp`, `firmware/src/hysteresis_controller.cpp`
- Configuración: `firmware/src/config.h`
- Ver también: ADR-001 (placa ESP8266)
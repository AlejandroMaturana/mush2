# ADR-018: Estabilización Funcional — Integridad de Datos entre Componentes

**Fecha**: 2026-07-15
**Estado**: Aceptado

## Contexto

Tras una auditoría completa de integridad funcional del sistema Mush2 (firmware + backend + frontend), se identificaron 28 hallazgos donde la aplicación muestra, comunica o asume estados que no han sido validados por la lógica de negocio o por evidencia real del sistema.

Los hallazgos críticos incluyen:

1. **Timestamps inválidos**: El firmware envía `millis()` (ms desde boot del ESP32) en lugar de timestamps epoch. Todos los registros en tablas de telemetría, salud y mantenimiento tienen fechas en enero de 1970.

2. **Estado de dispositivo siempre ONLINE**: El backend nunca mapea los estados del firmware (`NORMAL`, `DEGRADED`, `ERROR`, etc.) al ENUM `Device.status`. Un dispositivo en modo `ERROR` del firmware siempre muestra `ONLINE` en la UI.

3. **Setpoints incompletos vía MQTT**: Los comandos MQTT al firmware no incluyen `setpoints` ni `phase`. Los dispositivos conectados por MQTT operan con setpoints por defecto o desactualizados de NVS, ignorando las recetas del backend.

4. **Campo `aqi` descartado**: El sensor ENS160 reporta Air Quality Index que se parsea pero nunca se almacena.

5. **SSE incompleto**: Eventos de `health`, `maintenance` y `phase_transition` se emiten pero nunca llegan al frontend.

6. **Estado del firmware no persistido**: Las transiciones de estado del firmware se envían por SSE pero no se guardan en la base de datos.

7. **Frontend con datos hardcodeados**: Rangos de sensores, planes de suscripción y versiones están hardcodeados, no derivados del backend.

## Decision

Implementar una **fase de estabilización funcional** (Milestone 7e) que elimine todas las inconsistencias entre firmware, backend, base de datos y frontend, garantizando que la información operacional represente fielmente el estado real del hardware.

## Principios

1. **Ningún dato, estado o acción debe existir en la interfaz o en la API si no puede ser respaldado por la lógica de negocio o por una evidencia real del sistema.**
2. Los cambios se ejecutan por componente (Firmware → Backend → Frontend) para minimizar contexto cruzado.
3. Los datos hardcodeados del frontend se conectan al backend en lugar de eliminarse.
4. Los timestamps del firmware se corrigen en la fuente (getTimestamp()), no con workarounds en el backend.

## Consecuencias

### Positivas
- Telemetría con timestamps reales: gráficas históricas, retención de datos y filtros por fecha funcionan correctamente.
- Estado de dispositivos refleja condiciones reales del hardware: operadores ven `ERROR` o `MAINTENANCE` cuando corresponde.
- Setpoints y recetas se sincronizan correctamente con los controladores firmware via MQTT.
- El frontend no presenta estados simulados ni información engañosa.
- Base confiable para evolución futura (multi-cámara, gemelo digital, marketplace).

### Negativos
- Requiere nueva versión de firmware (v0.21.0) que debe flashearse a dispositivos desplegados.
- Migraciones de base de datos que pueden requerir downtime en producción.
- Cambios en el protocolo MQTT que deben mantenerse backward-compatible.

## Referencias

- Auditoría de integridad funcional: 28 hallazgos documentados
- `docs/roadmap/milestone.md` — M7e
- `docs/roadmap.md` — Fase 7e

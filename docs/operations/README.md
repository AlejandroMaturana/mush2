Para `operations` la intención es distinta a las anteriores: no es arquitectura ni gobierno, sino **operación, diagnóstico y mantenimiento del sistema**. Haría énfasis en runbooks, troubleshooting, despliegue y respuesta ante incidentes.

# Operaciones del Sistema — Mush2 LabTech

La documentación de **Operations** contiene procedimientos operativos para ejecutar, monitorear, diagnosticar y mantener el sistema Mush2 durante su ciclo de vida.

Estos documentos están orientados a resolver problemas reales de operación, facilitar la recuperación ante fallos y establecer prácticas repetibles para mantenimiento del sistema.

Incluye procedimientos para backend, frontend, firmware, base de datos, infraestructura y respuesta ante incidentes.

## ¿Cuándo consultar o actualizar Operations?

Consulta esta documentación cuando:

* Un servicio no inicia correctamente.
* Existen errores durante desarrollo o despliegue.
* Se requiere diagnosticar fallos en producción.
* Un dispositivo presenta problemas de conectividad.
* Se necesita ejecutar mantenimiento preventivo.
* Ocurre un incidente que requiere recuperación.

Actualiza estos documentos cuando:

* Aparece un nuevo error recurrente.
* Se descubre una solución permanente.
* Cambia un procedimiento operacional.
* Se incorporan nuevas herramientas de monitoreo.
* Evoluciona la arquitectura desplegada.

## Estructura del directorio

```text id="f3i3h7"
docs/operations/
├── README.md             # Este archivo
├── broker-deployment.md  # Plan de despliegue del broker MQTT (PR-G, ISSUE-065)
├── debug-runbook.md      # Diagnóstico rápido de problemas comunes
├── deployment.md         # Procedimientos de despliegue
└── runbook.md            # Guía operacional completa
```

## Índice de documentos

| Documento                         | Descripción                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Broker Deployment | Plan de despliegue del broker MQTT Mosquitto (TLS 8883, secretos, rollback, migración) — PR-G, ISSUE-065.                           |
| Debug Runbook | Guía rápida de resolución de errores frecuentes en backend, frontend, firmware, MQTT y base de datos.                                |
| [Deployment](deployment.md)       | Procedimientos de instalación, configuración y despliegue del sistema en distintos entornos.                                         |
| [Runbook](runbook.md)             | Guía operacional completa con monitoreo, troubleshooting, mantenimiento preventivo, incident response y recuperación ante desastres. |

## Áreas cubiertas

### Backend

Incluye procedimientos para:

* Arranque y diagnóstico del servidor.
* Problemas de conexión PostgreSQL.
* Fallos de autenticación.
* Errores MQTT.
* Problemas de rendimiento.
* Diagnóstico de memoria y procesos.

### Frontend

Incluye procedimientos para:

* Errores de compilación.
* Problemas de integración con API.
* Fallos de autenticación.
* Problemas de renderizado y comunicación SSE.

### Firmware

Incluye procedimientos para:

* Diagnóstico ESP32.
* Fallos de sensores.
* Problemas WiFi/MQTT.
* Errores de memoria.
* Watchdog resets.
* Fallos OTA.

### Datos e infraestructura

Incluye:

* Gestión de base de datos.
* Migraciones.
* Backups y restauración.
* Verificaciones de salud.
* Estrategias de recuperación.

## Flujo de diagnóstico

Ante un problema operativo seguir la siguiente secuencia:

```text id="slx5ip"
Incidente detectado
        ↓
Verificar servicios activos
        ↓
Revisar logs y métricas
        ↓
Consultar Debug Runbook
        ↓
Aplicar procedimiento conocido
        ↓
Registrar solución si es nueva
        ↓
Actualizar documentación
```

# Versionado — Mush2

Todos los componentes usan **Versionado Semántico** (`MAJOR.MINOR.PATCH`).

## Reglas SemVer

| Componente | MAJOR | MINOR | PATCH |
|---|---|---|---|
| **Firmware** | Cambio incompatible en protocolo o hardware | Nueva funcionalidad (sensor, actuador) | Bugfix, optimización |
| **Backend** | Breaking change en API REST | Nuevo endpoint, nuevo modelo DB | Bugfix, parche seguridad |
| **Frontend** | Rediseño completo, breaking UI | Nueva página, nuevo componente | Bugfix, ajuste CSS |
| **Protocol** | Cambio incompatible en tópicos/payloads | Nuevo tópico, nuevo campo opcional | Corrección de especificación |

## Archivos VERSION

Cada componente mantiene su versión en un archivo `VERSION`:

```
backend/VERSION     → 0.1.0
frontend/VERSION    → 0.1.0
firmware/VERSION    → 0.1.0
docs/protocol/VERSION → 1.0.0
```

## Matriz de Compatibilidad

| Firmware | Backend | Protocol | Estado |
|---|---|---|---|
| 0.1.x | 0.1.x | 1.0.x | Desarrollo |
| 1.0.x | 1.0.x | 1.0.x | Producción (futuro) |

El campo `protocol` en cada mensaje MQTT permite al backend validar compatibilidad en tiempo real.

## Changelog

Cada componente mantiene su propio `CHANGELOG.md`:

```
firmware/CHANGELOG.md
backend/CHANGELOG.md
frontend/CHANGELOG.md
CHANGELOG.md (raíz — cambios del proyecto completo)
```

Formato: [Keep a Changelog](https://keepachangelog.com/) v1.1.0.

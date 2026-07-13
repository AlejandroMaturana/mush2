# Documentación — Mush2

> Sistema IoT de control ambiental para hongos adaptógenos.
> Esta carpeta es el punto de entrada para toda la documentación técnica del proyecto.

---

## ¿Por dónde empezar?

| Si eres... | Lee primero... |
|---|---|
| Colaborador nuevo | [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) → [`docs/architecture/overview.md`](architecture/architecture.md) → [`docs/governance/contribution-guide.md`](governance/contribution-guide.md) |
| Agente IA | [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) → [`docs/contracts/`](contracts/) → ADR relevante al área de trabajo |
| Desarrollador firmware | [`docs/architecture/firmware.md`](architecture/firmware.md) → [`docs/protocol/protocol-v1.md`](protocol/protocol-v1.md) → [`docs/ADR/ADR-014-OTA-v3.md`](ADR/ADR-014-OTA-v3.md) |
| Desarrollador backend | [`docs/architecture/backend.md`](architecture/backend.md) → [`docs/contracts/api-contract.md`](contracts/api-contract.md) → [`docs/contracts/mqtt-contract.md`](contracts/mqtt-contract.md) |
| Desarrollador frontend | [`docs/architecture/frontend.md`](architecture/frontend.md) → [`docs/design/ui-standards.md`](design/ui-standards.md) |
| Operador / cultivador | [`docs/user/manual.md`](user/manual.md) → [`docs/operations/deployment.md`](operations/deployment.md) |

---

## Mapa de documentos

### 📐 Arquitectura (`docs/architecture/`)
Describe **cómo están construidos** los componentes del sistema.

| Documento | Contenido |
|---|---|
| [`architecture.md`](architecture/architecture.md) | Visión general: diagrama de componentes, flujos de datos, stack tecnológico |
| [`backend.md`](architecture/backend.md) | Estructura backend: rutas, servicios, modelos, middleware |
| [`firmware.md`](architecture/firmware.md) | Arquitectura firmware ESP32-S3: módulos, tareas FreeRTOS, pinout, state machine |
| [`frontend.md`](architecture/frontend.md) | Árbol de componentes React, routing, SSE, diseño |
| [`database.md`](architecture/database.md) | Esquema PostgreSQL: entidades, relaciones, índices |
| [`capability-catalog.md`](architecture/capability-catalog.md) | Catálogo de capacidades, recursos, cuotas y políticas por plan |
| [`authorization-model.md`](architecture/authorization-model.md) | Modelo de autorización: autenticación dual, RBAC, capacidades, tenant scope |
| [`qos-policy.md`](architecture/qos-policy.md) | Políticas de calidad de servicio: frecuencias, protocolos, degradación |

### 🤝 Contratos (`docs/contracts/`)
Define los **contratos de comunicación** entre componentes. Son inmutables sin incrementar versión.

| Documento | Contenido |
|---|---|
| [`api-contract.md`](contracts/api-contract.md) | Endpoints REST v1: request/response, autenticación, errores |
| [`mqtt-contract.md`](contracts/mqtt-contract.md) | Tópicos MQTT, payloads JSON, responsabilidades publisher/subscriber |

### 📡 Protocolo (`docs/protocol/`)
Versionado independiente del protocolo HTTP de comunicación firmware ↔ backend.

| Documento | Contenido |
|---|---|
| [`protocol-v1.md`](protocol/protocol-v1.md) | Especificación completa del protocolo HTTP polling v1 |
| [`compatibility-matrix.md`](protocol/compatibility-matrix.md) | Matriz de compatibilidad firmware ↔ backend ↔ protocolo |
| [`VERSION`](protocol/VERSION) | Versión actual del protocolo |

### 🏛️ Decisiones de Diseño (`docs/ADR/`)
Registro de **decisiones de arquitectura** tomadas y su justificación. Una vez aceptado, un ADR es inmutable.

| Rango | Contenido |
|---|---|
| ADR-001 a ADR-006 | Plataforma, sensores, SSR, ThingSpeak, PostgreSQL, logging |
| ADR-007 a ADR-010 | JWT/RBAC, protocolo HTTP, control histéresis, fail-safe |
| ADR-011 a ADR-014 | Recetas/ciclos, FreeRTOS, seguridad, OTA v3 |
| ADR-015 | Reestructuración de documentación |
| ADR-016 | Política de Capacidades Basada en Suscripción |

### 🧩 Engineering Design Documents (`docs/EDD/`)
Documentos de **diseño de alto nivel** para subsistemas complejos. Se crean _antes_ de implementar.

| Documento | Contenido |
|---|---|
| [`EDD-001`](EDD/EDD-001-sistema-control-ambiental.md) | Sistema de control ambiental end-to-end |
| [`EDD-002`](EDD/EDD-002-motor-reglas-recetas.md) | Motor de reglas y recetas de cultivo |
| [`EDD-003`](EDD/EDD-003-ota-v3-canary-deployment.md) | OTA v3 con canary deployment |
| [`EDD-004`](EDD/EDD-004-estrategia-multitenant.md) | Estrategia multi-tenant y escalabilidad |
| [`EDD-005`](EDD/EDD-005-BLE-provisioning.md) | BLE Provisioning — configuración inicial por Bluetooth |

### 💬 Propuestas (RFC) (`docs/RFC/`)
**Request for Comments** — propuestas formales para cambios significativos antes de decidir.

| Documento | Estado | Contenido |
|---|---|---|
| [`RFC-template.md`](RFC/RFC-template.md) | TEMPLATE | Plantilla base para nuevas RFCs |
| [`RFC-0001-https-tls-firmware.md`](RFC/RFC-0001-https-tls-firmware.md) | DRAFT | HTTPS/TLS en firmware (WiFiClientSecure) |
| [`RFC-0002-mqtt-v2-upgrade.md`](RFC/RFC-0002-mqtt-v2-upgrade.md) | DRAFT | Migración protocolo MQTT a v2 |
| [`RFC-0003-multi-device-dashboard.md`](RFC/RFC-0003-multi-device-dashboard.md) | DRAFT | Dashboard multi-dispositivo simultáneo |
| [`RFC-0004-notificaciones-push.md`](RFC/RFC-0004-notificaciones-push.md) | DRAFT | Sistema de notificaciones push |
| [`RFC-0005-BLE-Provisioning-&-Device-Bootstrap.md`](RFC/RFC-0005-BLE-Provisioning-&-Device-Bootstrap.md) | ACCEPTED | BLE Provisioning & Device Bootstrap |
| [`RFC-0006-realtime-streaming.md`](RFC/RFC-0006-realtime-streaming.md) | DRAFT | Real-Time Streaming y QoS |
| [`RFC-0007-device-limits.md`](RFC/RFC-0007-device-limits.md) | DRAFT | Límites de dispositivos por plan |

### 🎨 Diseño (`docs/design/`)
Lineamientos visuales, design tokens y decisiones de UX.

| Documento | Contenido |
|---|---|
| [`ui-standards.md`](design/ui-standards.md) | Sistema de diseño: tokens, tipografía, colores, componentes |

### 📋 Gobernanza (`docs/governance/`)
Normas y procesos para contribuir al proyecto de forma consistente.

| Documento | Contenido |
|---|---|
| [`contribution-guide.md`](governance/contribution-guide.md) | Flujo de trabajo completo para contribuidores |
| [`coding-standards.md`](governance/coding-standards.md) | Estándares de código por componente |
| [`branching-strategy.md`](governance/branching-strategy.md) | Estrategia de branches y nomenclatura |
| [`definition-of-done.md`](governance/definition-of-done.md) | Criterios de aceptación para toda tarea |
| [`tech-debt.md`](governance/tech-debt.md) | Registro centralizado de deuda técnica |
| [`versioning.md`](governance/versioning.md) | SemVer por componente |

### 🗺️ Roadmap (`docs/roadmap/`)
Planificación estratégica del proyecto.

| Documento | Contenido |
|---|---|
| [`roadmap.md`](roadmap/roadmap.md) | **Fuente única de verdad**: fases 0–18, dependencias, skills |
| [`milestone.md`](roadmap/milestone.md) | Detalle de milestones completados con criterios de aceptación |
| `archive/` | Roadmaps específicos históricos (frontend, OTA, consolidación) |

### ⚙️ Operaciones (`docs/operations/`)
Procedimientos de despliegue y operación del sistema.

| Documento | Contenido |
|---|---|
| [`deployment.md`](operations/deployment.md) | Entornos, instrucciones de despliegue, CI/CD |

### 📊 Diagramas (`docs/diagrams/`) — Pendiente
Diagramas de arquitectura visual. **Contenido pendiente de definir/actualizar** — se completará en una iteración posterior.

| Diagrama | Contenido |
|---|---|
| `architecture.drawio` | 🔄 Pendiente — Diagrama de componentes del sistema (actualizar con capability model) |
| `database.drawio` | 🔄 Pendiente — Esquema de base de datos con relaciones (incluir Subscription) |
| `sequence.drawio` | 🔄 Pendiente — Diagramas de secuencia de flujos críticos (incluir flujo de autorización) |
| `state_machine.drawio` | 🔄 Pendiente — Máquina de estados del firmware |
| `exports/` | 🔄 Pendiente — Imágenes exportadas (PNG/SVG) para visualización en GitHub |

### 👤 Usuario (`docs/user/`)
Documentación para operadores y cultivadores.

| Documento | Contenido |
|---|---|
| [`manual.md`](user/manual.md) | Manual de usuario completo |

### 📐 Otros documentos en raíz

| Documento | Contenido |
|---|---|
| [`requirements.md`](requirements.md) | Requerimientos funcionales y no funcionales (con estado de implementación) |
| [`scalability.md`](scalability.md) | Guía de escalabilidad: Nivel 1 (dev) → Nivel 5 (miles de dispositivos) |
| [`operations.md`](operations.md) | Guía de operaciones del sistema |

---

## Estado de la documentación

| Sección | Estado | Última actualización |
|---|---|---|---|
| `architecture/` | ✅ Completo (5 docs: 3 actualizados + 2 nuevos capability/authorization/qos) | 2026-07-11 |
| `contracts/` | ✅ Completo | 2026-06-30 |
| `protocol/` | ✅ Completo | 2026-06-30 |
| `ADR/` | ✅ 16 ADRs (001–016) | 2026-07-11 |
| `EDD/` | 🟡 En construcción | 2026-07-05 |
| `rfc/` | 🟡 7 RFCs (0001–0005, 0012–0013) | 2026-07-11 |
| `design/` | ✅ Completo | 2026-07-05 |
| `governance/` | ✅ Completo | 2026-06-30 |
| `roadmap/` | ✅ Consolidado | 2026-07-05 |
| `diagrams/` | 🔄 Pendiente — pendiente de actualizar | 2026-07-11 |
| `operations/` | 🟡 Solo dev local | 2026-07-05 |
| `user/` | 🟡 Manual básico | 2026-06-30 |

---

## Reglas de documentación

1. **Un archivo = una responsabilidad**: No mezclar arquitectura con operaciones.
2. **Cambio de contrato = nueva versión**: Protocolo HTTP y contratos MQTT tienen versionado independiente.
3. **ADR es inmutable**: Una vez aceptado, un ADR no se modifica; se crea uno nuevo que lo reemplaza.
4. **RFC antes de implementar**: Todo cambio de protocolo, seguridad o arquitectura requiere RFC aprobado.
5. **EDD antes de diseñar**: Sistemas complejos requieren EDD revisado antes de escribir código.
6. **CHANGELOG.md siempre**: Todo merge a `main` o `develop` requiere entrada en CHANGELOG.

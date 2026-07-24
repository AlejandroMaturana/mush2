# Architecture Decision Records (ADR) — Mush2

Los **Architecture Decision Records (ADR)** documentan las **decisiones arquitectónicas significativas** tomadas durante el desarrollo de Mush2, registrando el contexto, las alternativas evaluadas, la decisión adoptada y sus consecuencias.

Los ADR constituyen la memoria técnica del proyecto y permiten comprender **por qué** la arquitectura evolucionó de la forma actual.

## ¿Cuándo crear un ADR?

Crea un ADR cuando debas:

* Registrar una decisión de arquitectura relevante y de largo plazo.
* Adoptar o reemplazar una tecnología, framework o protocolo.
* Definir una estrategia técnica que afecte múltiples componentes.
* Documentar un cambio importante en la arquitectura del sistema.
* Registrar una decisión cuya justificación deba conservarse en el tiempo.

**No** crees un ADR para:

* Propuestas que aún requieren discusión (usa RFC).
* Modelado del dominio o reglas de negocio (usa DDD).
* Guías de uso, tutoriales o documentación operativa.
* Correcciones menores, bugs o refactorizaciones sin impacto arquitectónico.

## Estructura del directorio

```text
docs/ADR/
├── README.md                                        # Este archivo
├── template.md                                      # Template para nuevos ADR
├── ADR-001-ESP32.md
├── ADR-002-AHT21-ENS160-sensors.md
├── ADR-003-SSR-low-level-04ch.md
├── ADR-004-ThingSpeak.md
├── ADR-005-PostgreSQL-SequelizeORM.md
├── ADR-006-Logs-Monitoreo-estrategia.md
├── ADR-007-JWT-RBAC.md
├── ADR-008-HTTP-Command-Protocol.md
├── ADR-009-Estrategia-Control-Histeresis-Fuzzy.md
├── ADR-010-Mecanismo-Fail-Safe-Overheat.md
├── ADR-011-Automatizacion-por-Etapas-Recipes.md
├── ADR-012-FreeRTOS.md
├── ADR-013-Seguridad-Estrategia.md
├── ADR-014-OTA-v3.md
├── ADR-015-docs-restructure.md
├── ADR-016-capability-based-subscription.md
├── ADR-017-Event-Bus.md
├── ADR-018-functional-integrity-stabilization.md
├── ADR-019-domain-first.md
├── ADR-020-run-replaces-cultivationcycle.md
├── ADR-021-control-engine-as-orchestrator.md
├── ADR-022-history-as-active-service.md
├── ADR-023-Secure-MQTT-Infrastructure.md
└── ADR-024-HTTPS-Deployment-Strategy.md
```

## Índice de documentos

| ID                                                        | Documento                            | Descripción                                                         |
| --------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| [ADR-001](ADR-001-ESP32.md)                               | ESP32 como plataforma base           | Selección de la plataforma principal de hardware.                   |
| [ADR-002](ADR-002-AHT21-ENS160-sensors.md)                | Sensores AHT21 + ENS160              | Estrategia de sensores ambientales para temperatura, humedad y VOC. |
| [ADR-003](ADR-003-SSR-low-level-04ch.md)                  | SSR Low Level 4CH                    | Selección del módulo de relés de estado sólido para actuadores.     |
| [ADR-004](ADR-004-ThingSpeak.md)                          | Integración con ThingSpeak           | Publicación de telemetría y monitoreo remoto.                       |
| [ADR-005](ADR-005-PostgreSQL-SequelizeORM.md)             | PostgreSQL + Sequelize ORM           | Persistencia y acceso a datos del sistema.                          |
| [ADR-006](ADR-006-Logs-Monitoreo-estrategia.md)           | Estrategia de Logs y Monitoreo       | Observabilidad y registro de eventos del sistema.                   |
| [ADR-007](ADR-007-JWT-RBAC.md)                            | JWT + RBAC                           | Estrategia de autenticación y autorización.                         |
| [ADR-008](ADR-008-HTTP-Command-Protocol.md)               | HTTP Command Protocol                | Protocolo para despacho de comandos entre componentes.              |
| [ADR-009](ADR-009-Estrategia-Control-Histeresis-Fuzzy.md) | Control Histeresis + Fuzzy           | Estrategia híbrida para el control ambiental.                       |
| [ADR-010](ADR-010-Mecanismo-Fail-Safe-Overheat.md)        | Fail-Safe por Sobretemperatura       | Protección frente a condiciones críticas de operación.              |
| [ADR-011](ADR-011-Automatizacion-por-Etapas-Recipes.md)   | Automatización mediante Recipes      | Modelo de automatización basado en etapas de cultivo.               |
| [ADR-012](ADR-012-FreeRTOS.md)                            | FreeRTOS                             | Adopción del sistema operativo para firmware embebido.              |
| [ADR-013](ADR-013-Seguridad-Estrategia.md)                | Estrategia de Seguridad              | Principios generales de seguridad del sistema.                      |
| [ADR-014](ADR-014-OTA-v3.md)                              | OTA v3                               | Estrategia de actualización remota del firmware.                    |
| [ADR-015](ADR-015-docs-restructure.md)                    | Reestructuración de la documentación | Organización de la documentación técnica del proyecto.              |
| [ADR-016](ADR-016-capability-based-subscription.md)       | Capability-Based Subscription        | Modelo de suscripción basado en capacidades.                        |
| [ADR-017](ADR-017-Event-Bus.md)                           | Event Bus                            | Estrategia de comunicación basada en eventos.                       |
| [ADR-018](ADR-018-functional-integrity-stabilization.md)  | Functional Integrity Stabilization   | Estabilización funcional previa a nuevas características.           |
| [ADR-019](ADR-019-domain-first.md)                        | Domain First                         | El dominio guía las decisiones de arquitectura.                     |
| [ADR-020](ADR-020-run-replaces-cultivationcycle.md)       | Run reemplaza CultivationCycle       | Evolución del modelo de dominio.                                    |
| [ADR-021](ADR-021-control-engine-as-orchestrator.md)      | Control Engine como Orquestador      | Centralización de la lógica de control.                             |
| [ADR-022](ADR-022-history-as-active-service.md)           | History como Servicio Activo         | Evolución del servicio de historial y trazabilidad.                 |
| [ADR-023](ADR-023-Secure-MQTT-Infrastructure.md)          | Infraestructura MQTT Segura          | TLS, autenticación y ACLs para MQTT.                                |
| [ADR-024](ADR-024-HTTPS-Deployment-Strategy.md)           | Estrategia de Despliegue HTTPS       | Terminación TLS en la infraestructura, no en Express.               |

## Numeración

* Los ADR se numeran secuencialmente: ADR-001, ADR-002, etc.
* El identificador es permanente y nunca se reutiliza.
* Si una decisión cambia, se crea un nuevo ADR que reemplaza o complementa al anterior.

## Template

Ver [template.md](template.md) para crear un nuevo Architecture Decision Record.

## Relación con otros documentos

| Tipo          | Uso                                              | ADR no reemplaza                                              |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| **DDD**       | Modelo de dominio y reglas de negocio            | ADR registra por qué se tomó una decisión arquitectónica.     |
| **RFC**       | Propuestas abiertas y discusión técnica          | ADR documenta únicamente decisiones aprobadas.                |
| **Contratos** | Especificaciones de APIs, MQTT, BLE y protocolos | ADR explica por qué esos contratos existen o fueron elegidos. |

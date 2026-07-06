# Descripción

La documentación deja deuda técnica e incoherencia, adelante el detalle:

## Sobre las incoherencias y deuda técnica

| RFC | Estado doc | Realidad | Desfase |
|---|---|---|---|
| RFC-0002 (HTTPS/TLS) | DRAFT | No hay código, planificado para Fase 9 | Por delante (futuro aspiracional) |
| RFC-0003 (MQTT v2) | DRAFT | No hay código, broker público aún, planificado Fase 9 | Por delante |
| RFC-0004 (Multi-device) | DRAFT | Parcialmente implementado a pesar de estar DRAFT; el dashboard ya muestra grid multi-dispositivo, agregados y selector. Solo falta el endpoint /summary | Realidad adelantada al RFC |
| RFC-0005 (Push) | DRAFT | No hay código, planificado Fase 10 | Por delante |
| RFC-0006 (BLE) | ACCEPTED | Completamente implementado (firmware/frontend/backend). Pero falta ADR-016 (mencionado como "por crear") | OK, pero ADR-016 es deuda |

En resumen: los RFCs son mayoritariamente aspiracionales y reflejan el roadmap, no lo construido. Solo RFC-0004 y RFC-0006 tienen correlato real en código.

---
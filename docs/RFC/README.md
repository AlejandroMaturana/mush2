# Request for Comments (RFC) — Mush2

Los RFC son propuestas formales para cambios significativos que requieren discusión antes de implementarse.

## ¿Cuándo crear un RFC?

Crea un RFC cuando quieras proponer:
- Cambios en el **protocolo de comunicación** (HTTP, MQTT)
- Nuevas **características de seguridad** (auth, cifrado, credenciales)
- Cambios de **arquitectura** que afectan 2 o más componentes
- Nuevas **dependencias externas** significativas (servicios, librerías de seguridad)
- Cambios que pueden romper **compatibilidad** con versiones existentes

**No** crea un RFC para:
- Bugfixes
- Nuevos endpoints que no cambian la arquitectura
- Cambios de UI sin impacto en comunicación
- Refactors internos sin interfaz pública

## Proceso RFC

```
1. Cualquier colaborador crea RFC-NNNN-titulo.md
2. Estado inicial: DRAFT
3. Período de comentarios: 7–14 días (documentado en el RFC)
4. Si es ACCEPTED → se crea un ADR como registro de la decisión tomada
5. Si es REJECTED → se documenta el rechazo con justificación
```

## ¿En qué se diferencia de un ADR?

| RFC | ADR |
|-----|-----|
| **Propuesta** abierta a debate | **Registro** de decisión ya tomada |
| Estado mutable (DRAFT → REVIEW → ...) | Inmutable |
| Puede ser rechazado | Siempre fue aceptado |
| Se crea **antes** de decidir | Se crea **después** de decidir |
| Referenciado en Issues y Discussions | Referenciado en código y contratos |

## Ciclo de vida

```
DRAFT → REVIEW (7-14 días) → ACCEPTED → genera ADR
                            → REJECTED → archivado con justificación
                            → WITHDRAWN → retirado por el autor
```

| Estado | Descripción |
|--------|-------------|
| `DRAFT` | En redacción, no listo para revisión |
| `REVIEW` | Publicado para comentarios del equipo |
| `ACCEPTED` | Decisión tomada; se implementa y genera ADR |
| `REJECTED` | Descartado; justificación en el documento |
| `WITHDRAWN` | Retirado voluntariamente por el autor |
| `SUPERSEDED` | Reemplazado por RFC-NNNN |

## Índice

| RFC | Título | Estado | Área |
|-----|--------|--------|------|
| [RFC-0001](RFC-0001-https-tls-firmware.md) | HTTPS/TLS en firmware | DRAFT | Firmware / Seguridad |
| [RFC-0002](RFC-0002-mqtt-v2-upgrade.md) | Migración MQTT a v2 | DRAFT | Protocolo |
| [RFC-0003](RFC-0003-multi-device-dashboard.md) | Dashboard multi-dispositivo | DRAFT | Frontend |
| [RFC-0004](RFC-0004-notificaciones-push.md) | Notificaciones push | DRAFT | Backend / Mobile |
| [RFC-0005](RFC-0005-BLE-Provisioning-&-Device-Bootstrap.md) | BLE Provisioning & Device Bootstrap | ACCEPTED | Firmware / Frontend / Backend |

## Template

Ver [RFC-template.md](RFC-template.md) para el template base de un nuevo RFC.

## Numeración

- Los RFC se numeran secuencialmente: RFC-0001, RFC-0002, etc.
- El número es permanente; si un RFC es reemplazado, se crea uno nuevo con el siguiente número.
- Los números no se reutilizan.

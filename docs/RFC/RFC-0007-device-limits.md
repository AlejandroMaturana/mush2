# RFC-0007 — Device Limits

## Metadata

| Campo | Valor |
|-------|-------|
| Autor | AlejandroMaturana |
| Estado | DRAFT |
| Fecha de apertura | 2026-07-11 |
| Fecha de cierre | 2026-07-25 |
| ADR resultado | ADR-016 |
| RFC relacionados | — |

## Resumen

Definir las reglas para la administración de dispositivos dentro de la plataforma, especificando cómo se asignan, contabilizan y limitan los dispositivos por suscriptor, así como las políticas para su registro, transferencia, archivado y eliminación, asegurando una distribución controlada de los recursos de infraestructura según el plan contratado.

## Motivación

Actualmente la plataforma permite registrar dispositivos sin límite, independientemente del plan de suscripción. A medida que la base de usuarios crece, es necesario establecer límites predecibles para dimensionar la infraestructura y evitar que un solo usuario consuma recursos desproporcionados.

Sin este RFC:
- No hay control sobre la cantidad de dispositivos por usuario.
- Un usuario FREE podría registrar cientos de dispositivos, afectando la calidad del servicio para todos.
- No existe un mecanismo de archivado o transferencia de dispositivos entre usuarios.

## Diseño detallado

### Límites por plan

| Plan | Dispositivos | Usuarios compartidos por dispositivo |
|------|-------------|--------------------------------------|
| FREE | 1 | 1 (solo propietario) |
| BASIC | 5 | 3 |
| PREMIUM | Ilimitado | 10 |

### Enforcement

- **Al registrar dispositivo** (`POST /devices`): verificar `count(devices) WHERE userId = ?` contra `Subscription.plan`.
- **Al compartir dispositivo** (`POST /devices/:id/claim` o `UserChamberAccess`): verificar `count(accesses) WHERE deviceId = ?`.
- Si se excede el límite, retornar `403` con código `DEVICE_LIMIT_EXCEEDED`.

### Archivado

- Dispositivos inactivos (sin telemetría por > 30 días) pueden ser archivados automáticamente.
- Los dispositivos archivados no cuentan para el límite.
- El usuario puede restaurar un dispositivo archivado (si tiene capacidad disponible).

### Transferencia

- Un dispositivo puede transferirse entre usuarios via `POST /devices/:id/transfer`.
- El destino debe tener capacidad disponible en su plan.
- Se registra en AuditLog.

## Alternativas consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| Límite por plan | Alineado con modelo de negocio | Requiere middleware nuevo |
| Sin límite | Simple | Insostenible |
| Límite basado en actividad | Justo | Complejo de medir |

## Impacto en compatibilidad

- Los usuarios existentes que excedan el límite de su plan actual serán grandfathered: no se les eliminarán dispositivos, pero no podrán registrar nuevos hasta que estén dentro del límite o hayan hecho upgrade.

## Plan de migración

1. Middleware `checkDeviceLimit` en `backend/src/middlewares/`.
2. Agregar columna `archivedAt` a Device (soft archive).
3. Job de archivado automático (inactividad > 30 días).
4. Validación en `POST /devices` y `POST /devices/:id/claim`.
5. Período de coexistencia: 30 días con logging de violaciones sin bloqueo.

## Preguntas abiertas

1. ¿Los dispositivos archivados deben ser visibles en la UI o completamente ocultos?
2. ¿La transferencia de dispositivos requiere aceptación del usuario destino?

---

_Extracto referenciado desde docs/catastro-tecnico-frontend.md_

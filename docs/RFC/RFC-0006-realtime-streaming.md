# RFC-0006 — Real-Time Streaming

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

Definir las políticas y mecanismos para la entrega de datos en tiempo real desde los dispositivos IoT hacia la plataforma, estableciendo frecuencias de actualización, protocolos de comunicación (Polling, SSE, WebSocket, MQTT), niveles de calidad de servicio (QoS), límites de consumo y estrategias de degradación alineadas al plan de suscripción.

## Motivación

Actualmente la plataforma entrega telemetría en vivo sin distinción por plan de suscripción. Esto no es sostenible a medida que crece la base de usuarios: las conexiones WebSocket persistentes y el streaming continuo consumen recursos de infraestructura que deben asignarse según el nivel de servicio contratado.

Sin este RFC:
- No hay un mecanismo claro para limitar conexiones WebSocket por plan.
- La frecuencia de refresco del dashboard es fija para todos los usuarios.
- No existe degradación controlada ante sobreconsumo.

## Diseño detallado

Ver `docs/architecture/qos-policy.md` para la definición de niveles de QoS por plan.

### Protocolos por nivel

| QoS | Polling REST | WebSocket | SSE | MQTT directo |
|-----|-------------|-----------|-----|--------------|
| 1 (FREE) | 30s | ❌ | ❌ | ✅ (siempre) |
| 2 (BASIC) | 10s | 5s updates | Alarmas HIGH+ | ✅ |
| 3 (PREMIUM) | Opcional | < 1s | Todos los eventos | ✅ |

### WebSocket Auth

- Al establecer conexión WS, validar JWT y verificar que el plan del usuario tenga QoS >= 2.
- Si no corresponde, cerrar conexión con código `4403` (QoS insufficient).

### Degradación

Aplicar en orden: reducir frecuencia de refresco → cerrar WebSocket → filtrar SSE → bloquear exportaciones.

## Alternativas consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| QoS por plan | Alineado con modelo de negocio, escalable | Mayor complejidad en middleware |
| Rate limit global | Simple de implementar | Injusto para usuarios de pago |
| Sin límites | Experiencia uniforme | Insostenible a escala |

## Impacto en compatibilidad

- Las conexiones WebSocket actuales seguirán funcionando hasta que se implemente la verificación de QoS.
- El cambio es transparente para el firmware (no se modifica).

## Plan de migración

1. Implementar middleware de verificación de QoS en WebSocket.
2. Agregar `qosLevel` al payload de Subscription.
3. Periodo de coexistencia: 30 días con logging de degradaciones sin aplicar bloqueos.
4. Activar enforcement completo.

## Preguntas abiertas

1. ¿Debemos mantener la frecuencia de refresco del dashboard en UserPreference o centralizarla en Subscription?
2. ¿SSE debe depender del plan o es un recurso gratuito para todos?

---

_Extracto referenciado desde docs/catastro-tecnico-frontend.md_

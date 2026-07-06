# RFC-0001 — HTTPS/TLS en Firmware (WiFiClientSecure)

## Metadata

| Campo             | Valor                |
| ----------------- | -------------------- |
| Autor             | Alejandro Maturana   |
| Estado            | DRAFT                |
| Fecha de apertura | 2026-07-05           |
| Fecha de cierre   | 2026-07-19           |
| ADR resultado     | Pendiente            |
| Área              | Firmware / Seguridad |

---

## Resumen

Migrar las comunicaciones HTTP del firmware de texto plano (HTTP en puerto 80) a HTTPS con TLS (puerto 443), usando `WiFiClientSecure` del Arduino Core para ESP32.

---

## Motivación

Actualmente el firmware envía telemetría y recibe comandos a través de HTTP sin cifrado. Esto expone:

1. **Credenciales de API key** (`X-Device-Key`) viajando en texto plano
2. **Datos de telemetría** (temperatura, CO₂, estado de actuadores) interceptables en la red local
3. **Comandos de control** (ON/OFF de relés) que podrían ser manipulados por un actor en la misma red

El ADR-013 (Seguridad) ya identifica esta necesidad. Esta RFC propone el diseño específico de implementación.

En el estado actual (solo entorno local), el riesgo es bajo. Sin embargo, cuando el sistema esté expuesto a Internet (Fase 9, MQTT propio + backend en servidor público), el riesgo es **crítico**.

---

## Diseño detallado

### Cambio en cliente HTTP

```cpp
// Actual (HTTP plano)
HTTPClient http;
WiFiClient client;
http.begin(client, "http://backend.local:3797/api/v1/telemetry");

// Propuesto (HTTPS con TLS)
#include <WiFiClientSecure.h>
HTTPClient http;
WiFiClientSecure client;

// Opción A: Verificación completa (más seguro, requiere certificado en firmware)
client.setCACert(ROOT_CA_CERT);

// Opción B: Sin verificación de certificado (menos seguro, más fácil de desplegar)
client.setInsecure(); // Solo para desarrollo/piloto

http.begin(client, "https://api.mush2.io/api/v1/telemetry");
```

### Opciones de gestión de certificados

| Opción                                | Seguridad | Complejidad | Mantenimiento                 |
| ------------------------------------- | --------- | ----------- | ----------------------------- |
| `setInsecure()` (sin verificar)       | Baja      | Muy baja    | Ninguno                       |
| Certificado hardcodeado en flash      | Media     | Media       | Actualizar con OTA al expirar |
| Let's Encrypt via backend (HPKP-like) | Alta      | Alta        | Automático con certbot        |
| Provisioning via NVS + OTA            | Alta      | Alta        | Requiere infraestructura PKI  |

**Recomendación para Fase 9:** Opción B (sin verificación) en piloto → Opción A (certificado Let's Encrypt) en producción.

### Impacto en configuración

```cpp
// config.h (generado por generate_config.py)
// Actual:
#define BACKEND_PORT 3797
#define BACKEND_PROTOCOL "http"

// Propuesto:
#define BACKEND_PORT 443
#define BACKEND_PROTOCOL "https"
#define TLS_VERIFY 1  // 0 = setInsecure(), 1 = verificar CA
```

### Impacto en ThingSpeak

ThingSpeak ya soporta HTTPS. El cambio es mínimo:

```cpp
// Actual:
#define TS_PORT 80

// Propuesto:
#define TS_PORT 443  // Ya documentado en docs/operations/deployment.md
```

### Impacto en RAM y flash

El módulo `WiFiClientSecure` tiene overhead:

- **RAM adicional**: ~30–40KB para el buffer TLS (de 512KB disponibles, < 8%)
- **Flash adicional**: ~80KB para mbedTLS (de 8MB, < 1%)
- Compatible con el presupuesto actual del firmware (ADR-012)

---

## Alternativas consideradas

| Opción                    | Pros                    | Contras                                                | Descartado por                     |
| ------------------------- | ----------------------- | ------------------------------------------------------ | ---------------------------------- |
| Mantener HTTP plano       | Sin cambios             | Inseguro en producción                                 | Riesgo de seguridad                |
| VPN (WireGuard en router) | Sin cambios en firmware | Requiere configuración de red del usuario; no portable | Fricción excesiva                  |
| MQTTS (MQTT sobre TLS)    | Latencia mínima         | El firmware ya no usa MQTT; sería un paso atrás        | Incompatible con arquitectura HTTP |

---

## Impacto en compatibilidad

- **Firmware** → Backend: requiere cambio de `http://` a `https://` en URLs hardcodeadas
- Dispositivos con firmware anterior (HTTP) seguirán funcionando si el backend expone ambos puertos durante la transición
- **Período de transición sugerido**: 2 releases (firmware v0.9.x soporta ambos, v1.0.0 solo HTTPS)

---

## Plan de migración

1. Backend: habilitar HTTPS (Nginx reverse proxy + Let's Encrypt)
2. Firmware: agregar `WiFiClientSecure`, habilitar vía `#define TLS_VERIFY`
3. OTA: enviar firmware v0.9.x con TLS habilitado a todos los dispositivos
4. Monitorear: verificar que todos los dispositivos reportan via HTTPS
5. Backend: deshabilitar endpoint HTTP (solo HTTPS)

---

## Preguntas abiertas

1. ¿Se gestiona el certificado Let's Encrypt en el propio servidor backend o en un proxy separado (Nginx/Caddy)?
2. ¿Cuándo caduca el certificado Let's Encrypt (90 días), se actualiza automáticamente con certbot o requiere OTA de firmware?
3. ¿Se mantiene `setInsecure()` como fallback de desarrollo en el `.env`?

---

## Comentarios del equipo

_Período de comentarios abierto hasta 2026-07-19_

---

## Decisión

**Estado final:** DRAFT — Pendiente de revisión

**ADR generado:** Pendiente de aceptación

# ADR-028: Identidad MQTT por Dispositivo

**Estado:** Propuesto  
**Fecha:** 2026-07-26  
**Autores:** Opencode  
**Decisores:** Alejandro Maturana

---

## Resumen

Cada dispositivo IoT obtiene un par de credenciales MQTT único (`mqttUser`, `mqttPass`) generado por el backend durante el registro HTTP. Las credenciales se entregan al firmware vía la respuesta HTTP de registro, se almacenan en NVS, y se usan en cada conexión MQTT. La gestión de credenciales en el broker se abstrae tras un servicio intercambiable (`MQTTProvisioningService`), desacoplada del mecanismo concreto de Mosquitto.

---

## Contexto

### Problema actual

Ambos dispositivos (`mush2_A0F262E55CBC`, `mush2_DCB4D913DF7C`) comparten las mismas credenciales MQTT (`device_001:mush2device`) definidas en `config.h`. Esto causa:

1. **Fallo de autenticación en el segundo dispositivo**: Mosquitto 2.x con `allow_anonymous false` y ACLs basadas en `%c` (client_id) permite la conexión, pero la sesión comparte identidad — conflicto cuando ambos están conectados simultáneamente.
2. **Imposibilidad de revocación individual**: no se puede revocar el acceso de un dispositivo sin afectar al otro.
3. **Sin trazabilidad**: los logs de Mosquitto no distinguen qué dispositivo envió cada mensaje.
4. **Violación de ADR-023-R03**: "Credenciales por dispositivo, nunca shared secret."

### Limitaciones del diseño actual

- Las credenciales son constantes de compilación (`#define MQTT_USER`/`MQTT_PASS`).
- No hay flujo de aprovisionamiento que entregue credenciales al firmware.
- El `password_file` de Mosquitto solo tiene un usuario de dispositivo.
- No hay columnas de credenciales en el modelo `Device` de la DB.

---

## Decisión

### 1. Modelo de identidad

| Campo | Convención | Ejemplo |
|---|---|---|
| MQTT Username | `dev_{deviceId}` | `dev_mush2_A0F262E55CBC` |
| MQTT Password | Generado por backend (32 chars, alfanumérico) | `k8x2mN7pQ3rT5wY9...` |
| MQTT ClientId | `deviceId` (sin cambio) | `mush2_A0F262E55CBC` |

El `clientId` se mantiene como `deviceId` porque las ACLs de Mosquitto usan `%c` (client_id) para aislar topics. El username es exclusivamente para autenticación.

### 2. Flujo de aprovisionamiento

```
Dispositivo                Backend                     MQTTProvisioningService
    │                         │                              │
    │── POST /register ──────>│                              │
    │   {deviceId, mac, fw}   │                              │
    │                         │── provisionDevice() ────────>│
    │                         │                              │── mosquitto_passwd -b
    │                         │                              │── reload()
    │<── 200 {mqtt} ──────────│                              │
    │                         │                              │
    │  (guarda en NVS)        │                              │
    │── MQTT CONNECT ────────>│                              │
```

### 3. Abstracción del servicio de provisioning

Toda interacción con el broker se encapsula en `MQTTProvisioningService`, una interfaz con métodos:

- `provisionDevice(deviceId, mqttUser, mqttPass)` — Crear/actualizar credenciales
- `revokeDevice(deviceId)` — Revocar credenciales
- `reload()` — Recargar configuración del broker (hot-reload si soportado)

La implementación concreta (`MosquittoProvisioningService`) usa `mosquitto_passwd` + restart del contenedor. Futuras implementaciones pueden usar LDAP, DB interna de Mosquitto, `mosquitto_ctrl`, o un plugin de autenticación personalizado.

### 4. Respuesta del endpoint de registro

```json
{
  "status": "ok",
  "message": "Device registered",
  "mqtt": {
    "user": "dev_mush2_A0F262E55CBC",
    "pass": "k8x2mN7pQ3rT5wY9bL2..."
  }
}
```

El campo `mqtt` solo se incluye cuando se generan credenciales nuevas (primer registro o re-provisionamiento).

### 5. Migración del firmware

El firmware nuevo implementa fallback:

1. Al boot, intentar leer credenciales MQTT de NVS.
2. Si NVS tiene credenciales → usarlas.
3. Si NVS está vacía → usar `MQTT_USER`/`MQTT_PASS` de `config.h` (defaults compilados).
4. Al completar `POST /devices/register`, el backend devuelve credenciales nuevas → firmware las guarda en NVS.
5. Subsiguientes boots usan las credenciales de NVS.

Esto permite OTA incremental: dispositivos viejos siguen funcionando con defaults hasta que registran y obtienen credenciales nuevas.

---

## Justificación

### Ventajas

- **Seguridad**: Cada dispositivo tiene identidad única. Revocación individual posible.
- **Trazabilidad**: Logs de Mosquitto muestran qué dispositivo envió cada mensaje.
- **Desacoplamiento**: `MQTTProvisioningService` permite migrar de Mosquitto a cualquier broker/plugin sin cambiar lógica de negocio.
- **MVP-compatible**: Sin cambios en BLE, sin TLS, sin NVS adicional más allá de 2 strings.
- **Forward-compatible**: Preparado para aprovisionamiento automático futuro (registration tokens, rotación de credenciales).

### Trade-offs aceptados

- Password en texto plano en NVS del ESP32 (aceptable para red local; futuros: encriptación con clave hardware).
- Restart breve de Mosquitto al actualizar credenciales (<1s downtime). Futuro: `mosquitto_ctrl` para hot-reload.
- `POST /devices/register` sin autenticación retorna credenciales (aceptable para red local; futuros: registration tokens).

---

## Alternativas consideradas

| Opción | Pros | Contras | Descartado por |
|---|---|---|---|
| HMAC derivada (deviceId + secret) | Sin provisión HTTP, sin NVS extra | Secret compartido en firmware, imposible revocar individual sin rotar secret global | Revocación imposible |
| BLE provisioning de credenciales | Máxima seguridad | Requiere nuevo contrato BLE, más cambios firmware+frontend | Complejidad MVP |
| Certificados mTLS | Seguridad máxima | Gestión de certificados compleja en ESP32 | Complejidad operativa |

---

## Consecuencias

### Positivas
- Autenticación fuerte por dispositivo
- Trazabilidad completa en logs del broker
- Servicio abstracto preparado para migraciones
- Migración incremental vía OTA (sin breaking change)

### Negativas
- ~200 bytes adicionales de NVS por dispositivo
- Dependencia de `mosquitto_passwd` CLI para la implementación concreta (mitigada por la abstracción)
- Backend requiere acceso al filesystem del contenedor Mosquitto (o volumen compartido)

---

## Impacto en la arquitectura

| Componente | Impacto |
|---|---|
| Firmware | `mqtt_client` usa credenciales dinámicas. `http_poller` parsea respuesta de registro. `config.h` sin hardcoded MQTT creds |
| Backend | Nuevo servicio `MQTTProvisioningService`. Modelo `Device` con columnas `mqttUser`/`mqttPassword`. Endpoint de registro retorna credenciales |
| Frontend | Sin cambios (no maneja credenciales MQTT) |
| Broker | `password_file` gestionado por servicio. ACLs sin cambios (usan `%c`) |
| DB | Columnas nuevas en `devices` (sync automático) |
| BLE | Sin cambios |

---

## Reglas derivadas

| ID | Regla | Severidad |
|---|---|---|
| ADR-028-R01 | Ningún módulo de negocio puede invocar `mosquitto_passwd` directamente; debe usar `MQTTProvisioningService` | HIGH |
| ADR-028-R02 | El firmware debe tener fallback a credenciales compiladas si NVS está vacía | HIGH |
| ADR-028-R03 | Las credenciales MQTT nunca se loguean en texto plano | HIGH |
| ADR-028-R04 | El endpoint de registro solo retorna credenciales en el primer registro de un dispositivo | MEDIUM |

---

## ADR relacionados

- ADR-023 — Infraestructura MQTT Segura (TLS, auth por dispositivo, ACLs)
- ADR-007 — JWT + RBAC
- ADR-013 — Estrategia de Seguridad

---

## Referencias

- `mqtt-contract.md` — Contrato MQTT formal
- `ble-contract.md` — Contrato BLE (sin cambios)
- `RFC-0005` — BLE Provisioning
- Mosquitto docs: `mosquitto_passwd(8)`, `mosquitto.conf(5)`

---

## Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-07-26 | Opencode | Creación del documento |

---

*Documento generado como parte del proceso de Architecture Decision Records de Mush2.*

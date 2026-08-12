# Plan de Despliegue — Broker MQTT (Mosquitto 2.x)

> **Estado:** PLAN DE DESPLIEGUE — configuración versionada lista para deploy (Ciclo 2, PR-A: I074/I075)
> **ISSUE:** ISSUE-065 (INF-006) · EPIC-BROKER · Ini 1.6 · **P0**
> **Decisión:** DECISION-006 · ACCEPTED — contenedor Mosquitto + volumen persistente + TLS 8883, ACL por dispositivo
> **Cierre:** requiere ISSUE-081 (provisioning/INF-022) y DECISION-011 (plan free → pago/VPS) — Ciclo 3
> **Última actualización:** 2026-08-12

---

## 1. Resumen

El broker MQTT de producción **no está desplegado** (`render.yaml` envVars comentadas; `env.js` default `mqtt://localhost:1883`). Esto deja el núcleo del producto inoperativo en producción: telemetría, comandos, control engine y eventos SSE dependen del puente `mqttBridge` ↔ broker.

Este documento es el **plan de despliegue** aprobado por el Ciclo 0 (PR-G). No despliega nada en el ciclo: define arquitectura, pasos, secretos, rollback, migración y verificación para ejecutar al cerrar ISSUE-075/081.

---

## 2. Arquitectura objetivo

```
Firmware (ESP32-S3)
  │ WiFiClientSecure · puerto 8883 (MQTTS) · user/pass por dispositivo
  ▼
Mosquitto 2.x (contenedor) ── broker de producción
  ├── listener 1883  → solo red interna (backend bridge, sin TLS)
  ├── listener 8883  → TLS (cafile/certfile/keyfile), externo (firmware)
  ├── allow_anonymous false
  ├── password_file  → credenciales hasheadas (`mosquitto_passwd`)
  ├── acl_file       → ACL por client_id (`%c`) y por usuario bridge
  └── volúmenes: /mosquitto/data (persistencia) · /mosquitto/log · /mosquitto/certs
  │
  ▼
Backend (mqttBridge.js) ── usuario `backend_bridge` · env `MQTT_BROKER_URL/PASS`
```

Referencias de contrato: `docs/contracts/mqtt-contract.md` (QoS 1, topics `mush2/{deviceId}/*`, LWT, retains).

---

## 3. Prerrequisitos

1. **Contenedor desplegable en un PaaS** que soporte volumen persistente (Render/Railway/Fly.io) o VPS (opción (c) de DECISION-006). La elección se decide en operación y **se enlaza a DECISION-011** (plan free → pago/VPS).
2. **Certificados TLS** para el listener 8883 (I75): un CA root (`ca.crt`), cert de servidor (`server.crt`) y key (`server.key`) montados en `/mosquitto/certs`. CA root de Let's Encrypt para compatibilidad con el firmware (ADR-023 §2).
3. **`password_file`** de producción poblado:
   - `backend_bridge:<hash>` (puente backend)
   - `dev_{deviceId}:<hash>` por dispositivo (ADR-028) — provisionado dinámicamente por `MosquittoProvisioningService`.
4. **ACL de producción** alineado con el contrato (incluye `alarm`, `ota/#`, `actuators`).
5. **Variables de entorno del backend** en Render:
   - `MQTT_BROKER_URL=mqtts://<host>:8883` (o `mqtt://<host>:1883` solo si broker en la misma red)
   - `MQTT_BROKER_USER=backend_bridge`
   - `MQTT_BROKER_PASS=<generado>` (nunca en el repo)

---

## 4. Pasos de despliegue

### 4.1 Preparar el contenedor

Reutilizar la configuración ya versionada en `docker/mosquitto/prod/`:

| Artefacto | Ubicación | Uso |
|---|---|---|
| `mosquitto.conf` | `docker/mosquitto/prod/mosquitto.conf` | listeners 1883/8883, `password_file`, `acl_file` |
| `acl.conf` | `docker/mosquitto/prod/acl.conf` | ACL por `%c` + bridge |
| `password_file` | `docker/mosquitto/prod/password_file` | credenciales (gitignored) |
| `certs/` | `docker/mosquitto/certs/` | `ca.crt` / `server.crt` / `server.key` |

### 4.2 Publicar el servicio

```bash
# Local (validación pre-deploy)
docker compose --env-file .env.production up -d mosquitto
docker compose logs -f mosquitto
```

En el PaaS objetivo (Render/Railway/Fly): crear el servicio de contenedor `eclipse-mosquitto:2` con:

- Volumen persistente montado en `/mosquitto/data` (y `/mosquitto/log`).
- Config/ACL/certs montados read-only en `/mosquitto/config` y `/mosquitto/certs` (o embebidos en una imagen propia).
- Puerto público 8883 habilitado; **1883 solo dentro de la red privada del PaaS** (nunca expuesto a Internet).

### 4.3 Activar TLS en el listener 8883

> **Hecho en Ciclo 2 (PR-A, ISSUE-074/075):** el bloque `listener 8883` ya está **activo** en `mosquitto.prod.conf` y `docker-compose.yml` ya no publica el puerto 1883 al host (solo `8883:8883`). Verificado localmente: handshake TLS ok y conexión en claro al 8883 rechazada (evidencia ISSUE-015).

Config actual en `docker/mosquitto/prod/mosquitto.conf`:

```ini
listener 8883
cafile /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
require_certificate false
allow_anonymous false
password_file /mosquitto/config/password_file
acl_file /mosquitto/config/acl.conf
```

Al desplegar solo queda: montar los certs reales en `./docker/mosquitto/certs/` (o volumen del PaaS en `/mosquitto/certs`) antes de arrancar el contenedor.

### 4.4 Poblar credenciales

```bash
./scripts/create-mqtt-user.sh backend_bridge "<generado>" prod
# por dispositivo, el backend lo hace vía MosquittoProvisioningService al registrarse
```

### 4.5 Poblar env vars del backend en Render

Descomentar y fijar en `render.yaml` (o en el dashboard del PaaS):

```yaml
- key: MQTT_BROKER_URL
  value: mqtts://mush2-mqtt.<host>:8883
- key: MQTT_BROKER_USER
  value: backend_bridge
- key: MQTT_BROKER_PASS
  sync: false          # valor fijado en el dashboard, nunca en el repo
```

> **Regla:** `MQTT_BROKER_PASS` se genera y fija exclusivamente por secret management (dashboard/CLI del PaaS). Nunca se commitea.

### 4.6 Verificar el bridge

El backend arranca con `MQTT_BROKER_URL` poblado; `mqttBridge.js` conecta con `backend_bridge`. Verificar con `GET /monitoring/health/db` y logs del bridge (`MQTT CONNECTED`).

---

## 5. Gestión de secretos

| Secreto | Generación | Almacenamiento |
|---|---|---|
| `MQTT_BROKER_PASS` | `openssl rand -base64 32` | Secret management del PaaS; NUNCA en el repo |
| Credenciales por dispositivo | Backend (`crypto.randomBytes(32).toString('base64url')`) | `password_file` hasheado + NVS del firmware |
| Claves TLS (`server.key`) | Autoridad certificadora | `/mosquitto/certs` (volumen privado); NUNCA en el repo |
| CA root | Let's Encrypt / ISRG Root X1 | Embebida en firmware (`config.h`) y `certs/` del broker |

Reglas ADR-023-R01..R04 y ADR-028-R01..R04 aplican.

---

## 6. Rollback

| Escenario | Acción |
|---|---|
| Broker roto / TLS mal configurado | `docker compose down mosquitto`; el backend sigue vivo sin bridge (fallo no bloqueante) |
| URL del broker incorrecta | Revertir `MQTT_BROKER_URL` al valor anterior en el dashboard; backend reconecta con backoff |
| Credenciales bridge comprometidas | Regenerar `MQTT_BROKER_PASS`, actualizar `password_file` (`mosquitto_passwd -b`), reiniciar contenedor y backend |
| ACL incorrecta | Restaurar `acl.conf` previo (versionado), reiniciar contenedor |
| Pérdida de persistencia | Restaurar volúmenes `mosquitto-data` desde backup del PaaS (si aplica) |

**Red de seguridad:** el backend NO bloquea el arranque si el broker no está disponible (verde→rojo→verde de ISSUE-065: hoy "verde" = broker inoperativo; el deploy es el "verde" objetivo).

---

## 7. Qué deja este PR (Ciclo 0) vs. qué se ejecuta después

| Hito | Estado tras PR-A (Ciclo 2) | Dónde |
|---|---|---|
| Plan de despliegue documentado | ✅ Entregado | este documento |
| ACL prod alineado con contrato (`alarm`, `ota/#`, `actuators`) | ✅ Entregado | `docker/mosquitto/prod/acl.conf` |
| Config prod con bloque TLS 8883 **activo** | ✅ Entregado (listener TLS descomentado) | `docker/mosquitto/prod/mosquitto.conf` |
| compose sin 1883 público (solo 8883 TLS) | ✅ Entregado | `docker-compose.yml` |
| Contrato MQTT §2 con entorno prod | ✅ Entregado | `docs/contracts/mqtt-contract.md` |
| `render.yaml` con envVars MQTT | ⏳ Diferido (no inventar valores) | al desplegar |
| Certs TLS 8883 reales | ⏳ **Provisioning en operación** (issue: montar en contenedor) | deploy (depende de DECISION-011) |
| Provisioning de credenciales por dispositivo en el contenedor | ⏳ **ISSUE-081 (INF-022)** | Ciclo 3 |
| Broker desplegado y bridge conectado | ⏳ Ejecución del plan | tras I081/DECISION-011 |

**Estado del ISSUE:** ISSUE-065 permanece `IN_PROGRESS` tras PR-A (avance: config TLS activa y verificada localmente; cierre exige ISSUE-081 + DECISION-011 en C3).

---

## 8. Verificación final (runbook post-deploy)

```bash
# 1. Broker arriba y listener TLS escuchando
docker compose exec mosquitto mosquitto_sub -h localhost -p 8883 --cafile /mosquitto/certs/ca.crt -t '#' -v  # timeout tras 5s esperado si no hay tráfico; el ERROR 5 es señal de TLS ok

# 2. Conectividad bridge (backend)
#    Logs: "MQTT CONNECTED" sin ERROR

# 3. Test negativo TLS (ISSUE-015): conexión SIN TLS al 8883 debe FALLAR
mosquitto_sub -h <host> -p 8883 -t '#'    # debe rechazar (handshake TLS)

# 4. Telemetría cifrada: publicar telemetría de un dispositivo y verificar persistencia en /devices
```

Criterio de salida (§8.2 de este plan): `MQTT_BROKER_URL` poblado + bridge conectado + telemetría fluyendo cifrada.

---

## Referencias

- `docs/project/architecture-decisions-pending.md` — DECISION-006 (broker) y DECISION-011 (plan free).
- `docs/ADR/ADR-023-Secure-MQTT-Infrastructure.md` — TLS + auth + ACL.
- `docs/ADR/ADR-028-Per-Device-MQTT-Identity.md` — identidad por dispositivo y provisioning.
- `docs/contracts/mqtt-contract.md` — contrato formal MQTT.
- `docker/mosquitto/prod/` — configuración de producción versionada.
- `docker-compose.yml` — stack prod-like local (ADR-029).
- `backend/src/services/mqttBridge.js`, `backend/src/services/mosquittoProvisioningService.js`.

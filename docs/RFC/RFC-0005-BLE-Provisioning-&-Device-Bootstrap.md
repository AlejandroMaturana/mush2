# RFC-0005 — BLE Provisioning & Device Bootstrap

---

## Metadata

| Campo            | Valor                                      |
| ---------------- | ------------------------------------------ |
| Autor            | Alejandro Maturana                         |
| Estado           | ACCEPTED                                   |
| Prioridad        | Alta                                       |
| Tipo             | Feature / Arquitectura                     |
| Fecha apertura   | 2026-07-05                                 |
| Fecha cierre     | 2026-07-06                                 |
| ADR resultado    | ADR-016 (por crear)                        |
| Dependencias     | Ninguna                                    |
| Impacto          | Firmware / Frontend / Backend / Docs       |

---

## Resumen

Implementar provisioning inicial por BLE en el firmware ESP32-S3, permitiendo configurar credenciales Wi-Fi desde un navegador web (Web Bluetooth API) sin recompilar el firmware. El dispositivo pasa de fábrica sin configuración, se configura por BLE en su primer arranque, y luego opera exclusivamente por Wi-Fi con BLE desactivado.

---

## Contexto

### Situación actual

El firmware Mush2 requiere credenciales Wi-Fi definidas en `config.h` al compilar. Cada dispositivo debe ser compilado y grabado individualmente con sus credenciales. No existe mecanismo de configuración runtime.

### Problema

- Imposible producir unidades en lotes sin configurar cada una manualmente.
- Un cambio de router requiere recompilar y regrabar.
- Mantenimiento en terreno requiere acceso físico con computador.

### Restricciones

- **Hardware:** ESP32-S3 con BLE 5.0 integrado (no requiere HW adicional).
- **Memoria:** ~50 KB flash adicional para BLE stack + provisioning service.
- **Compatibilidad:** No romper OTA v3 existente ni el state machine actual.
- **Seguridad:** Sin credenciales hardcodeadas. Sin pairing en v1 (añadible después).

---

## Objetivos

### Objetivos

- Provisioning por BLE sin conexión a Internet.
- Sin recompilar firmware para cambiar configuración.
- DeviceID automático desde MAC.
- Persistencia en NVS con flag de provisioning.
- Registro automático en backend post-Wi-Fi.
- Factory reset vía BLE o físico.

### No objetivos

- OTA por BLE.
- Telemetría por BLE.
- Control remoto por BLE.
- Pairing con PIN o bonding.
- Cifrado de credenciales en BLE (v1).
- Portal cautivo Wi-Fi.
- Substituir Wi-Fi como medio operativo.

---

## Arquitectura propuesta

### Diagrama de flujo

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  ESP32-S3    │────▶│  BLE GATT Server │◀───▶│  Frontend Web  │
│  sin Wi-Fi   │     │  (PROVISIONING)  │     │  (Chrome/Edge) │
└──────┬───────┘     └────────┬─────────┘     └────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐     ┌──────────────────┐
│  NVS Storage │     │  Wi-Fi Connect   │
│  ssid/pass   │────▶│  + Backend Reg   │
└──────────────┘     └──────────────────┘
```

### GATT Profile

| Char        | UUID suffix | Properties | Payload                    |
|-------------|-------------|------------|----------------------------|
| DEVICE_INFO | 1           | READ       | `{"deviceId":"mush2_..", "fwVer":"0.9.1", "hwRev":"1.0"}` |
| WIFI_SSID   | 2           | WRITE      | `"MiRedWiFi"`             |
| WIFI_PASS   | 3           | WRITE      | `"MiClave123"`            |
| PROV_CMD    | 4           | WRITE      | `"provision"`, `"reset"`, `"factory_reset"` |
| PROV_STATUS | 5           | READ+NOTIFY| `{"status":"ok"}`, `{"status":"error","msg":"..."}` |

Service UUID base: `a7c3d6e0-f1b2-4a5b-8c9d-0e1f2a3b4c5d`

---

## Diseño técnico

### Firmware (cambios)

- **Nuevo:** `ble_provisioning.h/.cpp` — clase `BLEProvisioning`.
- **Modificar:** `state_machine.h/.cpp` — agregar `ST_PROVISIONING`.
- **Modificar:** `wifi_manager.h/.cpp` — credenciales runtime desde NVS.
- **Modificar:** `main.ino` — bifurcación en setup según provisioning.
- **Modificar:** `config.example.h` — constantes BLE.

### Backend (cambios mínimos)

- `POST /api/v1/devices` ya permite registrar dispositivos.
- Opcional: `POST /api/v1/devices/register` público para autoregistro sin JWT.

### Frontend (nuevo)

- `pages/Provisioning.jsx` — wizard Web Bluetooth.
- Ruta `/provisioning` en App.jsx.

---

## Interfaces

### BLE (contrato)

Ver sección GATT Profile arriba. Documento completo: `docs/contracts/ble-contract.md`.

### HTTP (existente, sin cambios)

- `GET /api/v1/actuators?deviceId=X` — polling de comandos.
- `POST /api/v1/devices` — registro de dispositivo (con JWT).

---

## Modelo de datos

### NVS (nuevo namespace: `mush2_prov`)

| Key         | Type   | Descripción                  |
|-------------|--------|------------------------------|
| `ssid`      | String | SSID provisionado            |
| `password`  | String | Password provisionado        |
| `provisioned` | Bool | Flag de provisioning completo |

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Credenciales incorrectas | Alto | Si Wi-Fi falla tras N intentos, volver a provisioning |
| Corte de energía durante escritura NVS | Medio | Flag `provisioned` se escribe al final |
| BLE desconectado durante provisioning | Alto | Timeout de advertising, reintento en boot |
| Web Bluetooth no compatible | Bajo | Mensaje claro con navegadores soportados |

---

## Alternativas consideradas

| Alternativa | Ventajas | Desventajas | Decisión |
|-------------|----------|-------------|----------|
| Portal Cautivo Wi-Fi | Sin BLE | Peor UX, cambiar red es complejo | ❌ |
| Serial USB | Simple | Requiere computador físico | ❌ |
| QR + App Móvil | Cómodo | Requiere app nativa | ❌ |
| **BLE + Web Bluetooth** | Rápido, sin app, reusable | Mayor complejidad inicial | ✅ |

---

## Compatibilidad

### Backward Compatibility

- Total. El provisioning es un flujo nuevo que solo se activa si no hay credenciales.
- Dispositivos existentes con credenciales compiladas siguen funcionando igual.

### Forward Compatibility

- El GATT profile permite agregar nuevas characteristics sin romper las existentes.
- Versionado del servicio GATT en el UUID.

---

## Roadmap de implementación

Ver [RM-005](../roadmap/roadmap-ota-ble.md).

Resumen:
1. M0: Contrato y diseño
2. M1: Firmware (BLE service + state machine + wifi manager)
3. M2: Frontend (Web Bluetooth wizard)
4. M3: Backend (registro post-provisioning)
5. M4: Testing integral

---

## Testing

### Unit Test (firmware)
- Compilación con `-Wall -Werror`.
- Pruebas de escritura/lectura NVS.

### Integration Test
- Flujo completo: flash → BLE → enviar credenciales → reboot → Wi-Fi → backend.
- Factory reset recovery.
- Credenciales incorrectas → retorno a BLE.

### Hardware Test
- ESP32-S3 real con frontend Chrome/Edge.
- Múltiples dispositivos cercanos (no interferencia).

---

## Observabilidad

- Logs con prefijos: `[BLE]`, `[PROV]`, `[NVS]`.
- Estado de provisioning en characteristic PROV_STATUS.
- Evento MQTT opcional: `device/{id}/provisioned`.

---

## Documentación requerida

- [x] EDD-005 (actualizado)
- [x] Roadmap RM-005 (creado)
- [ ] ADR-016 (por crear)
- [ ] BLE Contract v1 (por crear)
- [ ] Changelog

---

## Definition of Done

- [ ] Flujo de provisioning completo validado en HW real.
- [ ] Pruebas de factory reset exitosas.
- [ ] Web Bluetooth funciona en Chrome/Edge.
- [ ] Documentación actualizada.

---

## Decisión

**ACCEPTED** — 2026-07-06

Se implementa provisioning por BLE + Web Bluetooth como mecanismo de bootstrap.
No se implementa OTA por BLE en este hito; queda como evolución futura.

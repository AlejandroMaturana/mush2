# EDD-005 — BLE Provisioning: Configuración Inicial por Bluetooth

---

## Metadata

| Campo             | Valor                                                   |
| ----------------- | ------------------------------------------------------- |
| Autor             | AlejandroMaturana                                      |
| Estado            | DRAFT                                                   |
| Fecha             | 2026-07-06                                              |
| Versión           | 2.0.0                                                   |
| Prioridad         | Alta                                                    |
| RFC relacionado   | RFC-0005                                                |
| ADRs relacionadas | ADR-001, ADR-004, ADR-012, ADR-014                      |

---

## 1. Problema / Contexto

Actualmente el firmware de Mush2 requiere que las credenciales Wi-Fi y la configuración del backend estén definidas en tiempo de compilación (`config.h`). Esto fuerza a:

- Modificar manualmente `config.h` o el archivo `.env` para cada dispositivo.
- Recompilar el firmware con `pio run`.
- Grabar vía USB cada unidad por separado.

Este proceso es inviable para producción de múltiples unidades, mantenimiento en terreno o reemplazo de router.

### Realidad del proyecto

Mush2 ya cuenta con:

- **OTA v3 funcional** vía Wi-Fi (HTTP + MQTT) — 4 capas: Decisor, Safe Shutdown, Executor, Post-Boot Confirmation con rollback nativo.
- **7 tareas FreeRTOS** en 2 núcleos — sensores, SSR, WiFi, HTTP Poller, MQTT, OTA, Telemetría.
- **Device ID derivado de MAC** (`mush2_XXXXXXXXXXXX`) persistido en NVS (`Preferences`).
- **Backend Express 5** con registro de dispositivos vía `POST /api/v1/devices`.
- **Frontend React 18** con diseño bioluminescente.

El provisioning por BLE debe integrarse a esta arquitectura sin romperla.

---

## 2. Objetivos

### Funcionales

- Detectar primer arranque (sin credenciales) y entrar en modo provisioning BLE.
- Exponer un servicio GATT que permita:
  - Leer información del dispositivo (DeviceID, versión firmware, HW rev).
  - Escribir credenciales Wi-Fi (SSID + password).
  - Ejecutar comandos: provision, factory reset, reboot.
  - Leer estado del provisioning.
- Guardar credenciales en NVS.
- Reiniciar el dispositivo tras recibir configuración válida.
- Conectar a Wi-Fi automáticamente tras el reinicio.
- Mantener `POST /api/v1/devices` para registro post-provisioning.
- Deshabilitar BLE durante operación normal.

### Arquitectónicos

- **Componente nuevo:** `BLEProvisioning` class en firmware, encapsulada y testeable.
- **Modificaciones mínimas** al state machine existente (añadir `ST_PROVISIONING`).
- **WiFiManager extendido** para aceptar credenciales runtime desde NVS.
- **Frontend** con Web Bluetooth API para descubrir, conectar y configurar.
- **Backend** sin cambios mayores (el endpoint de registro ya existe).

---

## 3. No Objetivos

Este hito NO contempla:

- OTA por BLE.
- Telemetría por BLE.
- Control remoto por BLE.
- Streaming de sensores.
- Pairing con PIN o bonding.
- Cifrado de credenciales en tránsito BLE (v1).
- Substituir Wi-Fi como medio de comunicación operativo.
- Portal cautivo Wi-Fi.
- Matter, Thread, Zigbee.

---

## 4. Arquitectura Propuesta

```
[Dispositivo nuevo] ── arranca ──▶ sin Wi-Fi config
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  PROVISIONING    │
                               │  BLE Advertising │
                               │  "Mush2-XXXX"    │
                               └────────┬────────┘
                                        │
                              Web Bluetooth API
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  Frontend Web    │
                               │  Escanea         │
                               │  Conecta         │
                               │  Envía SSID/PASS │
                               └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  Firmware        │
                               │  Guarda en NVS   │
                               │  Reinicia        │
                               └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  WIFI            │
                               │  Conecta         │
                               │  HTTPS poller    │
                               │  MQTT            │
                               └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  Backend API     │
                               │  Registra device │
                               │  Asocia usuario  │
                               └─────────────────┘
```

### GATT Profile

| Characteristic   | UUID (base: `a7c3d6e0-f1b2-4a5b-8c9d-0e1f2a3b4c5d`) | Properties   | Descripción                          |
|------------------|------------------------------------------------------|--------------|--------------------------------------|
| `DEVICE_INFO`    | `a7c3d6e1-...` (idx 1)                               | READ         | JSON: deviceId, fwVer, hwRev, rssi  |
| `WIFI_SSID`      | `a7c3d6e2-...` (idx 2)                               | WRITE        | SSID de la red Wi-Fi                 |
| `WIFI_PASS`      | `a7c3d6e3-...` (idx 3)                               | WRITE        | Contraseña Wi-Fi                     |
| `PROV_CMD`       | `a7c3d6e4-...` (idx 4)                               | WRITE        | Comando: `provision`, `reset`, `factory_reset` |
| `PROV_STATUS`    | `a7c3d6e5-...` (idx 5)                               | READ+NOTIFY  | JSON: status, message                |

**Servicio UUID:** `a7c3d6e0-f1b2-4a5b-8c9d-0e1f2a3b4c5d`

---

## 5. Impacto en Componentes

| Componente    | Cambios                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| Firmware      | Nuevo: `ble_provisioning.h/.cpp`. Mod: `state_machine`, `wifi_manager`, `main.ino`, `config.example.h` |
| Backend       | Bajo. Endpoint `POST /api/v1/devices` ya existe. Opcional: endpoint público de pre-registro. |
| Frontend      | Media. Nueva página/ruta `/provisioning` con Web Bluetooth.              |
| Documentación | Alta. EDD, roadmap, RFC, ADR, BLE contract.                              |
| QA            | Alto. Pruebas de flujo completo con ESP32.                              |

---

## 6. Especificación Técnica

### 6.1 Firmware — `BLEProvisioning`

**Responsabilidades:**
- Inicializar BLE server con GATT service.
- Manejar escritura de SSID/password en callbacks.
- Persistir/leer credenciales desde NVS (namespace `mush2_prov`).
- Ejecutar comandos: `provision` (guardar + reboot), `factory_reset` (limpiar NVS + reboot).
- Controlar tiempo de vida del advertising (timeout configurable).

**Interfaz:**
```cpp
class BLEProvisioning {
public:
  void init(const char* deviceId, const char* fwVer);
  void start();
  void stop();
  bool isActive();
  bool isProvisioned();
  String getStoredSSID();
  void clearCredentials();
};
```

### 6.2 WiFiManager

**Cambios:**
- Nuevo método: `void setProvisionedCredentials(const char* ssid, const char* pass)`
- `init()` ahora carga credenciales desde NVS si existen, antes de usar las compiladas.
- Si hay credenciales provisionadas, se usan como red primaria.

### 6.3 State Machine

**Nuevo estado:** `ST_PROVISIONING` (valor 9)

**Transiciones válidas:**
| Desde       | Hacia           | Condición                         |
|-------------|-----------------|-----------------------------------|
| ST_INIT     | ST_PROVISIONING | No hay credenciales Wi-Fi en NVS |
| ST_PROVISIONING | ST_WIFI     | Provisioning completado, antes de reboot |
| ST_PROVISIONING | ST_ERROR   | Error en provisioning (timeout)   |

### 6.4 Flujo de arranque (setup)

```
setup()
├── Serial, WDT, LED
├── sm.init() → ST_INIT
├── deviceManager.init()
├── nvsInit()
├── bleProvisioning.init(deviceId, fwVersion)
│
├── if (bleProvisioning.isProvisioned())
│   ├── wifi.init()         // carga creds desde NVS
│   ├── wifi.connect()
│   ├── ... resto de inicialización normal
│   └── sm.fsmTransition(ST_WIFI)
│
├── else
│   ├── bleProvisioning.start()
│   ├── sm.fsmTransition(ST_PROVISIONING)
│   └── solo tarea BLE se ejecuta
│
└── crear tareas FreeRTOS (según modo)
```

### 6.5 NVS Storage

**Namespace:** `mush2_prov`

| Key           | Tipo   | Descripción                    |
|---------------|--------|--------------------------------|
| `ssid`        | String | SSID de la red Wi-Fi           |
| `password`    | String | Contraseña Wi-Fi               |
| `provisioned` | Bool   | Flag de provisioning completo  |

### 6.6 Advertisement

- **Name:** `Mush2-{last4mac}` (ej: `Mush2-A3F1`)
- **Appearance:** `ESP_GAP_BLE_APPEARANCE_GENERIC_TAG`
- **Interval:** 100ms (rápido para descubrimiento)
- **Timeout:** 5 minutos (se desactiva para ahorrar energía)

---

## 7. Plan de Implementación

### Fase 1 — Firmware Core
- [ ] Agregar `ble_provisioning.h/.cpp` con servicio GATT, callbacks, NVS.
- [ ] Modificar `state_machine.h/.cpp` — agregar `ST_PROVISIONING` y transiciones.
- [ ] Modificar `wifi_manager.h/.cpp` — soporte para credenciales runtime desde NVS.
- [ ] Modificar `main.ino` — bifurcación provisioning vs normal en setup.
- [ ] Modificar `config.example.h` — definir `BLE_PROV_TIMEOUT_MS`, `BLE_DEVICE_NAME_PREFIX`.
- [ ] Modificar `platformio.ini` — agregar dependencia BLE si es necesario.
- [ ] Verificar compilación.

### Fase 2 — Frontend
- [ ] Nueva página `Provisioning.jsx`.
- [ ] Componente `BLEProvisioningWizard`: escanear, conectar, enviar credenciales.
- [ ] Ruta en `App.jsx`.
- [ ] Estilos consistentes con diseño existente.

### Fase 3 — Backend
- [ ] Verificar que `POST /api/v1/devices` funciona para registro.
- [ ] Opcional: endpoint público `POST /api/v1/devices/claim` para asociar usuario.

### Fase 4 — Testing
- [ ] Prueba: primer arranque → BLE advertising.
- [ ] Prueba: enviar credenciales → reboot → Wi-Fi → backend.
- [ ] Prueba: factory reset → vuelve a BLE.
- [ ] Prueba: timeout de provisioning.
- [ ] Prueba: credenciales incorrectas → error recovery.

---

## 8. Riesgos y Mitigaciones

| Riesgo                       | Impacto | Mitigación                          |
| ---------------------------- | ------- | ----------------------------------- |
| Credenciales incorrectas     | Alto    | Validación en firmware: si Wi-Fi falla tras N intentos, volver a provisioning |
| Pérdida de conexión BLE      | Medio   | Timeout de advertising (5 min), reintento en siguiente boot |
| Corte de energía durante escritura NVS | Medio | Escribir flag `provisioned` al final (escritura atómica conceptual) |
| Múltiples dispositivos cerca | Bajo    | El usuario selecciona por nombre único en frontend |
| Web Bluetooth no compatible  | Bajo    | Mensaje claro al usuario con navegadores soportados |

---

## 9. Definition of Done

- [ ] Dispositivo sin credenciales → advertising BLE en < 3s tras boot.
- [ ] Frontend puede descubrir y conectar mediante Web Bluetooth.
- [ ] Envío de credenciales → guardado en NVS → reboot automático.
- [ ] Tras reboot, dispositivo conecta Wi-Fi y se registra en backend.
- [ ] BLE desactivado durante operación normal (solo Wi-Fi).
- [ ] Factory reset (comando BLE o físico) → dispositivo vuelve a advertising.
- [ ] Flujo completo documentado.
- [ ] Pruebas funcionales aprobadas.

---

## 10. Evolución Futura

Este diseño deja preparada la arquitectura para:

- **BLE OTA** — agregar characteristic `OTA_DATA` con escritura por chunks.
- **BLE Diagnostics** — characteristic `DIAG` para logs en vivo.
- **Secure Provisioning** — pairing + bonding + cifrado.
- **Múltiples redes** — soporte para SSID failover provisionado.
- **Claim Codes** — QR + BLE para asociación segura con backend.

---

## 11. Referencias

- Firmware: `wifi_manager.h/.cpp`, `state_machine.h/.cpp`, `device_manager.h/.cpp`, `ota_nvs.h/.cpp`
- Backend: `routes/api.js` (`POST /api/v1/devices`)
- Frontend: `App.jsx`, `pages/`
- BLE Contract v1 en `docs/contracts/ble-contract.md` (por crear)
- Web Bluetooth API: https://web.dev/articles/bluetooth
- ESP32 BLE Arduino docs: https://docs.espressif.com/projects/arduino-esp32/en/latest/api/ble.html

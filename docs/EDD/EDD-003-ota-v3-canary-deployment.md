# EDD-003 — OTA v3 con Canary Deployment

## Metadata

| Campo             | Valor              |
| ----------------- | ------------------ |
| Autor             | Alejandro Maturana |
| Estado            | ACCEPTED           |
| Fecha             | 2026-06-21         |
| Versión           | 1.0.0              |
| ADRs relacionados | ADR-014-OTA-v3     |
| RFC relacionados  | —                  |

---

## 1. Problema / Contexto

Actualizar firmware en un dispositivo IoT en producción es una operación de alto riesgo: si el nuevo firmware tiene un bug crítico, el dispositivo puede quedar inoperable ("bricked") y requerir acceso físico para recuperarlo. En un sistema de control ambiental que opera sin supervisión constante, un dispositivo bricked puede arruinar un ciclo de cultivo completo.

El diseño anterior (OTA v1/v2 en ESP8266) carecía de:

- Rollback automático si el nuevo firmware no arranca correctamente
- Validación antes de flashear (verificación de hash, condiciones mínimas)
- Safe shutdown de actuadores antes de actualizar
- Telemetría del resultado de la actualización

---

## 2. Objetivos

- Actualizar firmware **sin intervención física** con probabilidad de brick < 0.1%
- **Rollback automático** si el firmware nuevo no confirma su validez en el primer boot
- **Safe shutdown** previo: apagar todos los SSR antes de flashear
- **Validación de condiciones**: no actualizar si temperatura > 30°C, batería baja, o ciclo crítico activo
- Telemetría del resultado: éxito / fallo + causa enviada al backend

---

## 3. No-objetivos

- Canary deployment automático (rollout gradual a % de dispositivos) — diferido
- Firma criptográfica del firmware (Secure Boot v2 — ADR-013 Fase 4)
- OTA por BLE o USB (solo WiFi + HTTP)
- Delta updates (solo imagen completa)

---

## 4. Alternativas consideradas

### 4.1 Estrategia de rollback

| Opción                                             | Pros                                                                           | Contras                                                    | Decisión   |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- | ---------- |
| **Rollback nativo del bootloader ESP32 (elegida)** | Automático, sin código extra; `esp_ota_mark_app_invalid_rollback_and_reboot()` | Solo disponible en ESP32, no en ESP8266                    | ✅ Elegida |
| EEPROM counter + manual reboot                     | Compatible con ESP8266                                                         | Requiere lógica custom compleja y propensa a errores       | ❌         |
| Bootloader custom                                  | Control total                                                                  | Muy compleja, riesgo de brick durante el custom bootloader | ❌         |
| Sin rollback                                       | Simple                                                                         | Inaceptable en producción                                  | ❌         |

### 4.2 Trigger de actualización

| Opción                     | Pros                                                            | Contras                          | Decisión                      |
| -------------------------- | --------------------------------------------------------------- | -------------------------------- | ----------------------------- |
| **HTTP polling (elegida)** | Compatible con arquitectura existente; firmware ya hace polling | Latencia del polling (500ms)     | ✅ Elegida                    |
| MQTT push                  | Inmediato                                                       | Requiere MQTT siempre conectado  | ❌ complementario             |
| ArduinoOTA (WiFi mDNS)     | Fácil desarrollo                                                | No funciona a través de internet | ✅ Solo para desarrollo local |

---

## 5. Solución propuesta

### Arquitectura de 4 capas

```
┌─────────────────────────────────┐
│         DECISOR OTA             │  ← ¿Debo actualizar ahora?
│  FSM · validación · condiciones │    bool: sí / no + causa
└────────────┬────────────────────┘
             │ solo si true
┌────────────▼────────────────────┐
│       SAFE SHUTDOWN             │  ← Prepara entorno físico
│  SSR off · sensores en reposo   │    ¿todos los actuadores seguros?
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│        EJECUTOR OTA             │  ← Descarga, verifica, flashea
│  HTTPUpdate · tarea FreeRTOS    │    éxito / fallo + causa
└────────────┬────────────────────┘
             │ reboot automático
┌────────────▼────────────────────┐
│    CONFIRMACIÓN POST-BOOT       │  ← ¿El nuevo firmware es válido?
│  self-test · rollback nativo    │    mark_valid() o rollback
└─────────────────────────────────┘
```

### Capa 1: Decisor OTA

Condiciones para rechazar una actualización:

```cpp
bool OtaHandler::shouldUpdate(const OtaPayload& payload) {
  if (temperature > OTA_MAX_TEMP)   return false; // > 30°C
  if (getState() == DEGRADED)        return false; // sensores fallando
  if (getState() == SAFE)            return false; // modo safe, no actualizar
  if (payload.version == currentVersion) return false; // misma versión
  if (!verifyHash(payload.url, payload.sha256)) return false; // hash inválido
  return true;
}
```

### Capa 2: Safe Shutdown

```cpp
void OtaHandler::safeShutdown() {
  ssrController.setAll(OFF);           // Todos los actuadores OFF
  hysteresisController.setMode(OFF);   // Suspender control local
  vTaskDelay(pdMS_TO_TICKS(2000));     // Esperar 2s para estabilización mecánica
  reportState(STATE_OTA_IN_PROGRESS);  // Reportar al backend (best-effort)
}
```

### Capa 3: Ejecutor OTA

```cpp
void OtaHandler::executeUpdate(const String& url) {
  WiFiClient client;
  ESP32HTTPUpdate updater;
  updater.setLedPin(LED_PIN);
  updater.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);

  auto result = updater.update(client, url);
  if (result == HTTP_UPDATE_OK) {
    // ESP reinicia automáticamente después del flasheo
  } else {
    reportOtaResult(FAIL, updater.getLastErrorString());
    // Volver al estado NORMAL sin cambios
  }
}
```

### Capa 4: Confirmación Post-Boot

```cpp
void OtaHandler::postBootValidation() {
  // 1. Verificar que los sensores responden
  if (!ahtSensor.begin() || !ens160Sensor.begin()) {
    esp_ota_mark_app_invalid_rollback_and_reboot(); // ROLLBACK
    return;
  }
  // 2. Verificar WiFi conecta en < 30s
  if (!wifiManager.waitForConnection(30000)) {
    esp_ota_mark_app_invalid_rollback_and_reboot(); // ROLLBACK
    return;
  }
  // 3. Todo OK → marcar como válido
  esp_ota_mark_app_valid_cancel_rollback();
  reportOtaResult(SUCCESS, currentVersion);
}
```

### Tabla de particiones

```
# firmware/partitions.csv
# Name,   Type, SubType, Offset,   Size, Flags
nvs,       data, nvs,     0x9000,   0x5000,
otadata,   data, ota,     0xe000,   0x2000,
app0,      app,  ota_0,   0x10000,  0x1E0000,
app1,      app,  ota_1,   0x1F0000, 0x1E0000,
spiffs,    data, spiffs,  0x3D0000, 0x30000,
```

---

## 6. Impacto en componentes

| Componente | Impacto | Archivos                                                    |
| ---------- | ------- | ----------------------------------------------------------- |
| Firmware   | Alto    | `ota_handler.h/.cpp`, `state_machine.cpp`, `partitions.csv` |
| Backend    | Medio   | `POST /api/v1/devices/:id/ota`, `OtaEvent` model            |
| Frontend   | Bajo    | Botón "Actualizar firmware" + estado OTA en DeviceDetail    |

---

## 7. Plan de implementación

Implementado en **Fase 7** del roadmap. Ver [`docs/ADR/ADR-014-OTA-v3.md`](../ADR/ADR-014-OTA-v3.md) para detalle completo.

Evolución planificada:

- **Canary deployment** (Fase 14): rollout gradual a % de dispositivos con monitoreo de telemetría
- **Firma criptográfica** (ADR-013 Fase 4): Secure Boot v2 + verificación RSA del binario

---

## 8. Métricas de éxito

| Métrica                       | Objetivo                              | Estado           |
| ----------------------------- | ------------------------------------- | ---------------- |
| Tasa de rollback exitoso      | > 99.9%                               | ✅ Implementado  |
| Brick rate                    | < 0.1%                                | ✅               |
| Tiempo de actualización       | < 60s (binario ~400KB en WiFi 2.4GHz) | ✅               |
| Actuadores en OFF durante OTA | 100%                                  | ✅ Safe Shutdown |
| Telemetría resultado OTA      | Siempre reportada                     | ✅               |

---

## 9. Riesgos y mitigaciones

| Riesgo                            | Prob.    | Impacto | Mitigación                                          |
| --------------------------------- | -------- | ------- | --------------------------------------------------- |
| WiFi cae durante descarga         | Media    | Medio   | Timeout en HTTPUpdate → abortar, NORMAL sin cambios |
| Nuevo firmware loop-crashea       | Baja     | Crítico | Rollback automático en primer boot                  |
| TWDT dispara durante flasheo      | Muy baja | Crítico | Flasheo en tarea dedicada con TWDT propio           |
| Hash inválido (descarga corrupta) | Baja     | Alto    | Verificación SHA-256 antes de flashear              |

---

## 10. Referencias

- [`docs/ADR/ADR-014-OTA-v3.md`](../ADR/ADR-014-OTA-v3.md) — Decisión completa de OTA v3
- [`docs/ADR/ADR-012-FreeRTOS.md`](../ADR/ADR-012-FreeRTOS.md) — Diseño de tareas
- [`docs/architecture/firmware.md`](../architecture/firmware.md) — Arquitectura del firmware
- [Espressif OTA docs](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/ota.html)

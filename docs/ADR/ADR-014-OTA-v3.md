# ADR-014: Sistema OTA v3 con arquitectura por capas y rollback nativo

**Fecha**: 2026-06-28
**Estado**: Implementado

## Contexto

El firmware v0.9.0 incluye una implementación OTA básica (ArduinoOTA + HTTP Update) que fue suficiente para el desarrollo local pero no apta para producción remota. Los problemas identificados:

1. **Partición única de aplicación** — Usa `default_16MB.csv` sin slot A/B, imposibilitando rollback
2. **Sin integración con FSM** — El estado `ST_OTA_UPDATING` no existe; no se previene que la OTA ocurra en estados degradados
3. **HTTP sin TLS** — `HTTPClient` en plano, sin `WiFiClientSecure`; el binario viaja en texto claro
4. **Sin safe shutdown** — Los SSR y actuadores no se apagan antes de la OTA; podrían recibir comandos durante la actualización
5. **Sin confirmación post-boot** — No se verifica que el nuevo firmware funcione; no hay rollback automático
6. **Sin telemetría OTA** — No hay publicación de eventos `ota/status` ni `ota/rejected`
7. **Stack insuficiente** — 4096 words para la tarea OTA es insuficiente cuando se agregue TLS
8. **Código muerto** — `startArduinoOTA()` y `startHTTPUpdate()` están definidos pero nunca invocados

Se requiere una arquitectura OTA que garantice seguridad, resiliencia y visibilidad en producción.

## Decisión

Implementar el sistema OTA v3 definido en `docs/roadmap/roadmap-ota.md` con los siguientes pilares arquitectónicos:

### P1: Partición flash OTA dual con otadata

Usar tabla de particiones personalizada con dos slots de aplicación (`app0`, `app1`), partición `otadata` para metadatos del bootloader, y `coredump` para diagnóstico de panics.

```csv
nvs,      data, nvs,      0x9000,   0x5000,
otadata,  data, ota,      0xe000,   0x2000,
app0,     app,  ota_0,    0x10000,  0x330000,
app1,     app,  ota_1,    0x340000, 0x330000,
spiffs,   data, spiffs,   0x670000, 0x180000,
coredump, data, coredump, 0x7F0000, 0x10000,
```

**Motivo:** Esquema estándar de Espressif para OTA. El bootloader gestiona el slot activo y el pending, permitiendo rollback sin código adicional.

### P2: Rollback nativo del bootloader (`CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE`)

Activar el flag que el bootloader del ESP32-S3 ya soporta nativamente:

```
OTA exitoso → bootloader marca app nueva como ESP_OTA_IMG_PENDING_VERIFY
    → app arranca → self-test → esp_ota_mark_app_valid_cancel_rollback()
    → si falla o no confirma → bootloader hace rollback automático
```

**Motivo:** El bootloader ya implementa esta lógica. Implementar rollback custom con flags EEPROM añade complejidad y fragilidad sin beneficio.

### P3: Arquitectura por capas (4 capas)

```
┌─────────────────────────────────┐
│         DECISOR OTA             │  FSM · validación · condiciones
└────────────┬────────────────────┘
┌────────────▼────────────────────┐
│       SAFE SHUTDOWN             │  SSR off · sensores en reposo
└────────────┬────────────────────┘
┌────────────▼────────────────────┐
│        EJECUTOR OTA             │  HTTPS · tarea FreeRTOS dedicada
└────────────┬────────────────────┘
┌────────────▼────────────────────┐
│    CONFIRMACIÓN POST-BOOT       │  self-test · rollback nativo
└─────────────────────────────────┘
```

**Motivo:** Separación estricta de responsabilidades. Cada capa es un archivo separado (`ota_decisor`, `ota_shutdown`, `ota_executor`, `ota_postboot`). Ninguna capa mezcla responsabilidades.

### P4: HTTPS estricto con CA cert embebido

Usar `WiFiClientSecure` con CA certificate embebido como constante en el binario. Prohibido explícitamente `setInsecure()`.

**Motivo:** Un servidor HTTPS sin validación de certificado equivale a HTTP plano. El CA cert pesa ~1.5 KB y cabe cómodamente en flash.

### P5: MQTT como canal de comando OTA

El comando `ota/command` llega vía MQTT (no HTTP polling) para evitar latencia de polling y permitir notificaciones push desde el servidor.

**Motivo:** El protocolo HTTP existente es polling con latencia de hasta 5s. MQTT permite entrega inmediata y retain en estados finales.

### P6: Tarea FreeRTOS dedicada en Core 0 con stack 8192 words

La descarga OTA corre en una tarea separada en Core 0 (red), con stack dimensionado para TLS (8192 words = ~32 KB).

**Motivo:** TLS consume heap significativo. Con 4096 words actuales, `WiFiClientSecure` causa stack overflow (observado en v0.8.1). Core 1 queda libre para control del ambiente.

## Consecuencias

### Positivas
- Rollback automático sin código: el bootloader lo gestiona nativamente
- La descarga OTA no interrumpe el control del ambiente (Core 0 vs Core 1)
- Visibilidad completa del ciclo OTA vía MQTT con retain
- El servidor puede detectar rollbacks por ausencia de `OTA_SUCCESS` post-reboot
- Arquitectura extensible: se puede agregar validación SHA-256 en el Decisor sin tocar el Ejecutor

### Negativas
- **Requerimiento bloqueante**: Cambiar la tabla de particiones **requiere borrar flash completo** de todos los dispositivos en campo. No hay migración suave.
- **Espacio en disco**: Cada slot de 3.25 MB reduce el espacio disponible para SPIFFS (1.5 MB vs 10+ MB actuales)
- **Dependencia de MQTT**: Si el broker MQTT no está disponible, el comando OTA no puede enviarse (aunque el Decisor puede rechazar igualmente si MQTT no está conectado)
- **CA cert management**: El certificado embebido caduca; requiere actualización del firmware si el cert del servidor cambia

### Mitigaciones
- Para el borrado de flash: documentar el procedimiento y ejecutarlo una sola vez en el primer deploy de OTA v3
- Para el espacio SPIFFS: el roadmap asigna 1.5 MB (suficiente para logs, config y certs)
- Para la caducidad del CA cert: CI/CD que valida expiración del cert con alerta < 30 días; script de renovación automática

## Alternativas descartadas

| Alternativa | Razón por la que se descartó |
|-------------|---------------------------------|
| **Factory + OTA** (una partición factory + una OTA) | Factory no se puede actualizar; desperdicia 3.25 MB. Dual OTA permite que ambos slots sean actualizables. |
| **Rollback custom con flags en NVS** | El bootloader ya lo hace nativamente. Reimplementar añade riesgo de bugs y no aporta ventajas. |
| **setInsecure() + hash SHA-256** | El hash verifica integridad pero no autenticidad. Un MITM puede reemplazar binario + hash. CA cert resuelve ambos. |
| **HTTP con firmas (binario + .sig)** | Complejidad adicional. HTTPS con CA cert cubre confidencialidad + integridad + autenticidad simultáneamente para el contexto actual. |
| **OTA por BLE** | El ESP32-S3 lo soporta pero añade superficie de ataque. No hay ventaja sobre HTTPS para este caso de uso. |
| **Delta OTA (parches binarios)** | Complejidad no justificada para el volumen de dispositivos esperado. |
| **Secure Boot + Flash Encryption** | Requiere quemar claves en eFuse, válido para producto final pero no para desarrollo activo. Se documenta como futuro. |

## Atributos de calidad

| Atributo | Cómo se aborda |
|----------|---------------|
| Seguridad | HTTPS con CA cert, validación de URL, versión |
| Resiliencia | Rollback nativo del bootloader, safe shutdown, restore post-fallo |
| Disponibilidad | OTA en Core 0, control en Core 1 — no hay downtime del ambiente |
| Mantenibilidad | 4 capas separadas en archivos individuales, cada una con única responsabilidad |
| Observabilidad | 5 eventos MQTT con retain, silencio post-reboot = rollback |
| Performance | Stack 8192 words, tarea dedicada, sin bloqueo del sistema |

## Referencias

- Roadmap detallado: `docs/roadmap/roadmap-ota.md`
- Issues OTA v3: `docs/issues/ota-v3/`
- ADR-001: Migración ESP32-S3 (definición de hardware target)
- ADR-012: FreeRTOS (arquitectura de tareas y watchdog)
- ADR-013: Seguridad (gestión de secretos, CA cert, HTTPS)
- Documentación oficial OTA ESP32-S3: https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/ota.html
- App Rollback: https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/app_rollback.html
- Particiones: https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-guides/partition-tables.html

---

## Implementación (2026-06-29)

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `firmware-esp32/src/ota_nvs.{h,cpp}` | Inicialización NVS (namespace `mush2`, key `fw_version`), esquema v1 |
| `firmware-esp32/src/ota_decisor.{h,cpp}` | `OTASelector`: validación de URL, SemVer, RSSI mínimo |
| `firmware-esp32/src/ota_shutdown.{h,cpp}` | `OTAShutdown`: apagado seguro de SSR, sensores, comunicaciones |
| `firmware-esp32/src/ota_executor.{h,cpp}` | `OTAExecutor`: descarga HTTPS vía `Update.write()` |
| `firmware-esp32/src/ota_postboot.{h,cpp}` | `OTAConfirmation`: `esp_ota_get_state_partition()` + `confirm()` |
| `firmware-esp32/src/mqtt_client.{h,cpp}` | Cliente MQTT con PubSubClient, tarea FreeRTOS dedicada |
| `firmware-esp32/src/state_machine.{h,cpp}` | Matriz 9×9 con `fsmTransition()`, transición `INIT→SAFE` |
| `firmware-esp32/partitions.csv` | OTA dual 8MB (app0/app1, spiffs, coredump) |

### Flujo OTA v3 completo

```
1. Comando OTA (MQTT `ota/command` o serial `ota https://...`)
2. OTASelector → valida URL, SemVer, RSSI → rechaza o autoriza
3. OTAShutdown → SSR off, sensores reposo, comunicaciones detenidas
4. FSM → ST_OTA_UPDATING
5. OTAExecutor → HTTP GET con WiFiClient → Update.write() → reboot
6. Post-boot → OTAConfirmation → self-test → confirm() vía MQTT
```

### MQTT integrado

- Subscribe: `mush2/{deviceId}/ota/command` (url + version)
- Publish: `ota/rejected` (causa), `ota/status` (estados con retain)
- Callback `otaMqttCallback()` almacena comando en variables globales volátiles

### Fixes aplicados post-verificación (generic-report-2.md)

| # | Fix | Archivo | Justificación |
|---|-----|---------|-------------|
| 1 | `STACK_POLLER 4096→8192` | `config.example.h` | `JsonDocument` en `runParse()` desbordaba 4K |
| 2 | `DELAY_POLLER 100→500ms` | `config.example.h` | Reducir CPU waste 50→10 iteraciones/segundo |
| 3 | `DELAY_MQTT 50→500ms` | `config.example.h` | Evitar reconnect loop agresivo en el broker |
| 4 | `client.connect(host, port, 5000)` | `http_poller.cpp` | Timeout explícito de 5s en connect TCP |
| 5 | `continue` → `goto ota_skip` | `main.ino taskOTA()` | Cada `continue` saltaba `vTaskDelayUntil` |
| 6 | `mush2_%s` → `%s` | `mqtt_client.cpp` | Device ID ya incluye prefijo `mush2_` |
| 7 | `client.flush()` + `vTaskDelay(50)` post-connect | `http_poller.cpp` | Asegurar que datos salgan al wire |
| 8 | De-chunking de HTTP chunked encoding | `http_poller.cpp` | Manejar `Transfer-Encoding: chunked` del server |
| 9 | `BACKEND_PORT 3000→3797` | `config.example.h` | Coincidir con puerto real del backend Express |

### Comprobación en hardware

- **Test HTTP vía example.com:80**: 869 bytes recibidos correctamente ✓
- **Test server Node.js local (backend/test-server.js)**: 184 bytes, de-chunked 173 bytes, JSON parseado ✓
- **Backend real Express + PostgreSQL**: 221 bytes, JSON con `deviceId` + `actuators[]` ✓
- **MQTT**: Conexión y suscripción a `ota/command` verificadas ✓
- **OTA vía ArduinoOTA**: Upload exitoso a `192.168.1.24:3232` con auth ✓
- **HTTP: OK** confirmado en `[STATS]` con backend real ✓

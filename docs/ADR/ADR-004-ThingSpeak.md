# ADR-004: Uso de ThingSpeak como canal secundario de telemetría

**Fecha**: 2026-06-10 (actualizado 2026-08-09 y 2026-08-12)
**Estado**: ~~Aceptado~~ → **SUPERSEDED** (DECISION-012, 2026-08-12)

> **Actualización 2026-08-12 (DECISION-012 / SUPERsesión):** ThingSpeak queda fuera de la arquitectura objetivo. La telemetría se consolida por **MQTT como canal canónico** (canal primario existente). Este ADR queda **SUPERSEDED**; el canal auxiliar ThingSpeak (firmware `thingspeak_client.cpp` + backend `thingSpeakSync.js`) se depreca y elimina. La actualización previa del transporte HTTPS (2026-08-09) queda sin efecto operativo y será limpiada junto con el canal.

## Contexto
El sistema necesita un canal de telemetría de respaldo. El canal principal es HTTP polling → Backend → PostgreSQL. Se requiere un segundo canal independiente que bufferé datos durante caídas del canal principal.

## Decisión
Usar ThingSpeak como canal secundario. El firmware envía un HTTP GET a ThingSpeak API en cada ciclo de telemetría (cada 20 segundos). El backend puede sincronizar datos históricos desde ThingSpeak cuando el dispositivo se recupera.

> **Actualización 2026-08-09 (DECISION-007 / ISSUE-051):** el transporte del mismo diseño pasa de HTTP plano (puerto 80) a **HTTPS obligatorio** (puerto 443) con `WiFiClientSecure` + CA root embebida (`thingspeak_ca_root.h`), y la API key viaja en el header `X-ApiKey` en lugar del query string. No se modifica el rol de ThingSpeak ni se sustituye este ADR; solo se endurece el canal. La clave se migrará a NVS en ISSUE-050.

## Motivos
1. **Independencia**: ThingSpeak no depende del backend HTTP.
2. **Simplicidad**: HTTP GET, sin librerías adicionales en el ESP32-S3.
3. **Gratuito**: Plan gratuito suficiente para prototipado (~8200 mensajes/día).
4. **Buffer de respaldo**: Retiene datos aunque el backend esté caído.

## Consecuencias
- El firmware envía datos duplicados (HTTP telemetry + ThingSpeak). Es intencional.
- Se necesita almacenar la API key de ThingSpeak en el firmware (`TS_API_KEY` en `config.h`).
- Límite de ThingSpeak: 15s entre updates (configuramos a 20s para estar dentro).
- ThingSpeak es un punto externo; si cae, no afecta al flujo principal HTTP.
- El backend implementa sincronización desde ThingSpeak mediante `thingSpeakSync.js`.

## Alternativas descartadas
- **InfluxDB + Telegraf**: Sobrecarga para el ESP32-S3.
- **Segundo canal HTTP**: Ya tenemos failover HTTP, pero ThingSpeak es un canal diferente.

## Detalle técnico

### Envío desde firmware
```cpp
// thingspeak_client.cpp
// Envía cada TS_INTERVAL (20 segundos)
// Campos: field1=temperatura, field2=humedad, field3=eCO2, field4=TVOC
// DECISION-007: HTTPS (443) + CA root embebida; la clave va en el header X-ApiKey.
String uri = "/update?field1=" + String(temperature, 1)
           + "&field2=" + String(humidity, 1)
           + "&field3=" + String(co2, 0)
           + "&field4=" + String(voc, 0);
// http.begin(wc, TS_HOST, TS_PORT, uri, true);  // wc = WiFiClientSecure + setCACert(TS_CA_ROOT)
// http.addHeader("X-ApiKey", TS_API_KEY);
```

### Sincronización desde backend
```javascript
// services/thingSpeakSync.js
// Recupera últimos datos de ThingSpeak y los inserta en PostgreSQL
// Mapea field1→TEMPERATURE, field2→HUMIDITY, field3→CO2, field4→VOC
```

### Configuración
| Parámetro | Valor |
|-----------|-------|
| Host | api.thingspeak.com |
| Puerto | 443 (HTTPS) |
| CA root | DigiCert Global Root G2 + intermedio (embebida en `thingspeak_ca_root.h`) |
| Autenticación | Header `X-ApiKey` (no en query string) |
| Intervalo | 20 segundos |
| API Key | Configurada en `TS_API_KEY` |

## Referencias
- Implementación firmware: `firmware/src/thingspeak_client.cpp`
- Implementación backend: `backend/src/services/thingSpeakSync.js`
- Configuración: `firmware/src/config.h`, `backend/src/config/env.js`
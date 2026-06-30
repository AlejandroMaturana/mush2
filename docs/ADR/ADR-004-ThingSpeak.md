# ADR-004: Uso de ThingSpeak como canal secundario de telemetría

**Fecha**: 2026-06-10 (actualizado 2026-06-14)
**Estado**: Aceptado

## Contexto
El sistema necesita un canal de telemetría de respaldo. El canal principal es HTTP polling → Backend → PostgreSQL. Se requiere un segundo canal independiente que bufferé datos durante caídas del canal principal.

## Decisión
Usar ThingSpeak como canal secundario. El firmware envía un HTTP GET a ThingSpeak API en cada ciclo de telemetría (cada 20 segundos). El backend puede sincronizar datos históricos desde ThingSpeak cuando el dispositivo se recupera.

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
String url = "http://api.thingspeak.com/update?api_key=" + TS_API_KEY
           + "&field1=" + String(temperature, 1)
           + "&field2=" + String(humidity, 1)
           + "&field3=" + String(co2, 0)
           + "&field4=" + String(voc, 0);
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
| Puerto | 80 (HTTP) |
| Intervalo | 20 segundos |
| API Key | Configurada en `TS_API_KEY` |

## Referencias
- Implementación firmware: `firmware/src/thingspeak_client.cpp`
- Implementación backend: `backend/src/services/thingSpeakSync.js`
- Configuración: `firmware/src/config.h`, `backend/src/config/env.js`
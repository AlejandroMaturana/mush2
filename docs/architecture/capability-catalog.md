# Capability Catalog — Mush2

> **Documento vivo**: Catálogo oficial de capacidades, recursos, cuotas y políticas de la plataforma.
> Cada entrada sigue la clasificación definida en ADR-016.

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Implementado |
| 🚧 | En desarrollo |
| 📋 | Planeado |

---

## 1. API

### `api.requests.per_month`

| Campo | Valor |
|-------|-------|
| **Tipo** | Cuota |
| **Descripción** | Límite de llamadas API por período mensual por usuario |
| **Costo operacional** | Medio |
| **Enforcement** | `subscriptionRateLimit.js` — retorna `429` al exceder el límite |
| **Reset** | Automático al inicio de `currentPeriodEnd` |
| **Estado** | ✅ |

| Plan | Límite |
|------|--------|
| FREE | 1,000 / mes |
| BASIC | 10,000 / mes |
| PREMIUM | 100,000 / mes |

**Disposición al cancelar**: Se congela el contador. El acceso a la API se bloquea al final del período facturado.

---

### `api.keys`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Generación y gestión de API keys para integración programática |
| **Costo operacional** | Bajo |
| **Enforcement** | `auth.js` — autenticación dual JWT + API Key |
| **Estado** | ✅ |

| Plan | Disponible |
|------|------------|
| FREE | ✅ |
| BASIC | ✅ |
| PREMIUM | ✅ |

---

### `api.rate_limit.minute`

| Campo | Valor |
|-------|-------|
| **Tipo** | Cuota |
| **Descripción** | Límite de requests por minuto por API key |
| **Costo operacional** | Bajo |
| **Enforcement** | `express-rate-limit` global + por key vía `ApiKey.rateLimit` |
| **Estado** | ✅ |

| Plan | Límite por key |
|------|----------------|
| FREE | 100 / min |
| BASIC | 300 / min |
| PREMIUM | 1000 / min |

---

## 2. Datos & Almacenamiento

### `data.retention.days`

| Campo | Valor |
|-------|-------|
| **Tipo** | Cuota |
| **Descripción** | Días que se retienen telemetría, eventos, alarmas y audit logs por usuario |
| **Costo operacional** | Alto (almacenamiento en disco) |
| **Enforcement** | `dataRetentionJob.js` — purge cada 60 minutos vía `Subscription.dataRetentionDays` |
| **Estado** | ✅ |

| Plan | Retención |
|------|-----------|
| FREE | 30 días |
| BASIC | 90 días |
| PREMIUM | 365 días |

**Disposición al cancelar**: Todos los datos del usuario se purgan al final del período facturado. No hay período de gracia.

---

### `storage.telemetry.gb`

| Campo | Valor |
|-------|-------|
| **Tipo** | Recurso |
| **Descripción** | Almacenamiento total de telemetría por usuario |
| **Costo operacional** | Alto |
| **Enforcement** | No implementado — actualmente limitado por `data.retention.days` |
| **Estado** | 📋 |

| Plan | Límite |
|------|--------|
| FREE | 1 GB |
| BASIC | 10 GB |
| PREMIUM | 100 GB |

---

## 3. Dispositivos

### `devices.max`

| Campo | Valor |
|-------|-------|
| **Tipo** | Recurso |
| **Descripción** | Cantidad máxima de dispositivos IoT registrables por usuario |
| **Costo operacional** | Medio |
| **Enforcement** | No implementado — se valida en `POST /devices` contra `Subscription` |
| **Estado** | 📋 |

| Plan | Límite |
|------|--------|
| FREE | 1 dispositivo |
| BASIC | 5 dispositivos |
| PREMIUM | Ilimitado |

---

### `devices.users_per_device`

| Campo | Valor |
|-------|-------|
| **Tipo** | Recurso |
| **Descripción** | Cantidad de usuarios con acceso compartido por dispositivo vía `UserChamberAccess` |
| **Costo operacional** | Bajo |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Límite |
|------|--------|
| FREE | 1 (solo propietario) |
| BASIC | 3 usuarios |
| PREMIUM | 10 usuarios |

---

### `devices.firmware.ota`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Actualización OTA del firmware del dispositivo desde la plataforma |
| **Costo operacional** | Medio (ancho de banda, almacenamiento de binarios) |
| **Enforcement** | Por implementar en `otaService.js` |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ❌ |
| BASIC | ✅ |
| PREMIUM | ✅ |

---

## 4. Automatización

### `automation.recipes`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Creación y aplicación de recetas de cultivo con parámetros por fase |
| **Costo operacional** | Bajo |
| **Enforcement** | No implementado — actualmente disponible para todos |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ✅ |
| BASIC | ✅ |
| PREMIUM | ✅ |

---

### `automation.rules.active`

| Campo | Valor |
|-------|-------|
| **Tipo** | Cuota |
| **Descripción** | Cantidad de reglas de automatización personalizadas activas simultáneamente |
| **Costo operacional** | Medio (CPU de control engine) |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Límite |
|------|--------|
| FREE | 3 reglas |
| BASIC | 10 reglas |
| PREMIUM | Ilimitado |

---

### `automation.cycles.concurrent`

| Campo | Valor |
|-------|-------|
| **Tipo** | Cuota |
| **Descripción** | Ciclos de cultivo activos concurrentes por usuario |
| **Costo operacional** | Medio (control engine evalúa cada ciclo cada 60s) |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Límite |
|------|--------|
| FREE | 1 ciclo |
| BASIC | 3 ciclos |
| PREMIUM | 10 ciclos |

---

## 5. Calidad de Servicio (QoS)

### `qos.dashboard.refresh`

| Campo | Valor |
|-------|-------|
| **Tipo** | Política |
| **Descripción** | Frecuencia de actualización automática del dashboard |
| **Costo operacional** | Medio (requests, ancho de banda) |
| **Enforcement** | `UserPreference.refreshFrequency` + validación contra plan |
| **Estado** | 📋 |

| Plan | Frecuencia |
|------|------------|
| FREE | 30 segundos |
| BASIC | 10 segundos |
| PREMIUM | 1 segundo |

---

### `qos.telemetry.streaming`

| Campo | Valor |
|-------|-------|
| **Tipo** | Política |
| **Descripción** | Entrega de telemetría en tiempo real vía WebSocket/SSE |
| **Costo operacional** | Alto (conexiones persistentes, ancho de banda) |
| **Enforcement** | No implementado — actualmente disponible para todos |
| **Estado** | 📋 |

| Plan | Streaming |
|------|-----------|
| FREE | Polling cada 30s (sin WebSocket) |
| BASIC | WebSocket con datos cada 5s |
| PREMIUM | WebSocket streaming continuo (< 1s) |

---

## 6. Notificaciones

### `notifications.telegram`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Notificaciones vía bot de Telegram para alarmas y eventos |
| **Costo operacional** | Bajo |
| **Enforcement** | `TelegramDeviceConfig` — disponible si el usuario vincula su chat |
| **Estado** | ✅ |

| Plan | Disponible |
|------|------------|
| FREE | ✅ (solo CRITICAL y HIGH) |
| BASIC | ✅ (todas las severidades) |
| PREMIUM | ✅ (todas las severidades + alertas configurables) |

---

### `notifications.push`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Notificaciones push vía navegador (Web Push API) |
| **Costo operacional** | Medio (servicio de push) |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ❌ |
| BASIC | ✅ |
| PREMIUM | ✅ |

---

## 7. Analítica & Reportes

### `analytics.dashboard.custom`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Dashboards personalizables con widgets seleccionables |
| **Costo operacional** | Bajo |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ❌ (dashboard fijo) |
| BASIC | ✅ (hasta 3 vistas) |
| PREMIUM | ✅ (vistas ilimitadas) |

---

### `analytics.exports`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Exportación de datos (CSV, JSON, PDF) |
| **Costo operacional** | Medio (procesamiento, almacenamiento temporal) |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ❌ |
| BASIC | ✅ (CSV, 1000 filas) |
| PREMIUM | ✅ (CSV, JSON, PDF — sin límite de filas) |

---

### `analytics.predictions`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Predicciones de comportamiento ambiental basadas en histórico (ML) |
| **Costo operacional** | Alto (cómputo, inferencia) |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ❌ |
| BASIC | ❌ |
| PREMIUM | ✅ |

---

## 8. Integraciones

### `integrations.mqtt.bridge`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Acceso al bridge MQTT para integrar sistemas externos |
| **Costo operacional** | Medio (conexiones broker, mensajes) |
| **Enforcement** | No implementado — actualmente disponible para todos |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ❌ |
| BASIC | ✅ (solo lectura) |
| PREMIUM | ✅ (lectura y escritura) |

---

### `integrations.webhooks`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Webhooks salientes para eventos de la plataforma |
| **Costo operacional** | Medio (requests salientes, reintentos) |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Disponible |
|------|------------|
| FREE | ❌ |
| BASIC | ✅ (hasta 2 webhooks) |
| PREMIUM | ✅ (hasta 10 webhooks) |

---

### `integrations.thingspeak`

| Campo | Valor |
|-------|-------|
| **Tipo** | Capacidad |
| **Descripción** | Sincronización bidireccional con ThingSpeak |
| **Costo operacional** | Bajo |
| **Enforcement** | `Device.thingSpeakEnabled` + `IntegrationCredentials` |
| **Estado** | ✅ |

| Plan | Disponible |
|------|------------|
| FREE | ✅ |
| BASIC | ✅ |
| PREMIUM | ✅ |

---

## 9. Organización

### `organization.users`

| Campo | Valor |
|-------|-------|
| **Tipo** | Recurso |
| **Descripción** | Cantidad de usuarios miembros de una organización |
| **Costo operacional** | Medio (procesamiento de autenticación, autorización por tenant) |
| **Enforcement** | No implementado |
| **Estado** | 📋 |

| Plan | Límite |
|------|--------|
| FREE | 1 usuario |
| BASIC | 3 usuarios |
| PREMIUM | 10 usuarios |

---

## 10. Resumen por Plan

| Capacidad | FREE | BASIC | PREMIUM |
|-----------|------|-------|---------|
| **api.requests.per_month** | 1,000 | 10,000 | 100,000 |
| **api.keys** | ✅ | ✅ | ✅ |
| **api.rate_limit.minute** | 100/min | 300/min | 1,000/min |
| **data.retention.days** | 30 | 90 | 365 |
| **storage.telemetry.gb** 📋 | 1 GB | 10 GB | 100 GB |
| **devices.max** 📋 | 1 | 5 | Ilimitado |
| **devices.users_per_device** 📋 | 1 | 3 | 10 |
| **devices.firmware.ota** 📋 | ❌ | ✅ | ✅ |
| **automation.recipes** 📋 | ✅ | ✅ | ✅ |
| **automation.rules.active** 📋 | 3 | 10 | Ilimitado |
| **automation.cycles.concurrent** 📋 | 1 | 3 | 10 |
| **qos.dashboard.refresh** 📋 | 30s | 10s | 1s |
| **qos.telemetry.streaming** 📋 | Polling 30s | WebSocket 5s | Streaming <1s |
| **notifications.telegram** ✅ | CRITICAL/HIGH | Todas | Todas + config |
| **notifications.push** 📋 | ❌ | ✅ | ✅ |
| **analytics.dashboard.custom** 📋 | ❌ | 3 vistas | Ilimitado |
| **analytics.exports** 📋 | ❌ | CSV 1000 | CSV/JSON/PDF |
| **analytics.predictions** 📋 | ❌ | ❌ | ✅ |
| **integrations.mqtt.bridge** 📋 | ❌ | Solo lectura | Full |
| **integrations.webhooks** 📋 | ❌ | 2 webhooks | 10 webhooks |
| **integrations.thingspeak** ✅ | ✅ | ✅ | ✅ |
| **organization.users** 📋 | 1 | 3 | 10 |

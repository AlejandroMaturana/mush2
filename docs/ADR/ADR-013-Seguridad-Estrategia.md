# ADR-013: Estrategia de Seguridad y Gestión de Secretos

**Estado:** Aceptado  
**Fecha:** 2026-06-28  
**Decisión:** Implementar una estrategia de seguridad por capas que aborde la gestión de secretos, seguridad en el transporte, autenticación de dispositivos, hardening del firmware, y segregación de entornos, priorizando los riesgos inmediatos (secretos en repositorio, ausencia de TLS, clave criptográfica reutilizada) y estableciendo una hoja de ruta hacia producción segura.

## Contexto

El proyecto Mush2 opera en un modelo de 3 capas (firmware ESP32-S3 → backend Node.js → frontend React) con integraciones externas (ThingSpeak, MQTT). Un análisis de seguridad revela las siguientes vulnerabilidades y riesgos actuales:

### 1. Gestión de Secretos

- **Secretos en repositorio**: `firmware/src/config.h` contiene claves WiFi, API key de ThingSpeak, dirección IP del backend local y contraseñas WiFi en texto plano. El archivo `.env` raíz contiene credenciales de base de datos y JWT secret, y está commiteado en el repositorio Git.
- **Reutilización de clave criptográfica**: `encryption.js` usa `JWT_SECRET` como clave AES-256-GCM para el cifrado simétrico. Esto viola el principio de separación de propósitos: la misma clave se usa para firmar tokens JWT y cifrar datos en repositorio.
- **JWT_SECRET por defecto**: `env.js` define `'dev-secret-change-in-production'` como fallback si no existe la variable de entorno. No hay validación de que sea una clave segura en producción.
- **Sin rotación de secretos**: No hay mecanismo para rotar JWT_SECRET, API keys de ThingSpeak, ni claves WiFi.

### 2. Seguridad en el Transporte

- **Firmware → Backend**: Comunicación HTTP plano (puerto 3797). No hay TLS. Las credenciales y comandos de actuadores viajan en texto claro.
- **Firmware → ThingSpeak**: HTTP plano (puerto 80 según `config.h`).
- **MQTT Bridge**: Se conecta a `test.mosquitto.org:1883` (broker público, sin TLS, sin autenticación). Los topics son predecibles (`mush2/{deviceId}/...`).
- **Backend → Frontend**: Sin HTTPS en desarrollo. CORS configurado desde variable de entorno pero con `crossOriginResourcePolicy: 'cross-origin'`.

### 3. Autenticación de Dispositivos (Firmware)

- **Sin API key de dispositivo**: El firmware se identifica con `DEVICE_ID` estático (`mush2_s3_001`). No hay autenticación mutua. Cualquier cliente que conozca un deviceId puede enviar telemetría falsa o recibir comandos.
- **Rate limiting exceptuado para firmware**: `express-rate-limit` tiene `skip: req => req.method === 'GET' && req.originalUrl.startsWith('/api/v1/actuators')`, dejando el endpoint crítico de comandos sin limitación de tasa.
- **Sin validación de origen**: El backend no verifica que los requests de telemetría provengan de un dispositivo legítimo.

### 4. Hardening del Firmware

- **Configuración en texto plano**: `config.h` con todas las credenciales en claro. Si un atacante obtiene acceso físico al dispositivo (o al binario), compromete todas las claves.
- **Sin Secure Boot ni flash encryption**: El ESP32-S3 soporta ambas, pero no están habilitadas.
- **Sin verificación de integridad OTA**: `ota_handler.cpp` usa `ArduinoOTA` y `HTTPUpdate` sin verificar firma de las actualizaciones.
- **Sin aislamiento de tareas sensibles**: Las claves WiFi y API keys residen en la misma partición de firmware que el código de aplicación.

### 5. Seguridad del Backend

- **Input validation ausente**: No se utiliza `express-validator` ni ninguna librería de validación de esquemas. Los endpoints confían en validación básica manual.
- **SQL injection potencial**: Sequelize escapa parámetros, pero las consultas raw o dinámicas no están auditadas.
- **Sync con alter en desarrollo**: `sequelize.sync({ alter: true })` puede destruir datos si se ejecuta accidentalmente en producción.
- **Logging de datos sensibles**: `console.log` puede exponer tokens, contraseñas o API keys en stdout.
- **Sin protección contra brute force**: No hay límite de intentos de login ni delay progresivo.
- **Gestión de sesiones vulnerable**: El refresh token se envía en el body de la respuesta (según ADR-007 y `auth.js`), no como httpOnly cookie. Esto lo expone a XSS.

### 6. Seguridad del Frontend

- **Sin Content Security Policy estricta**: Helmet configura CSP pero con `'unsafe-inline'` para estilos, lo que permite inyección de CSS malicioso.
- **Token en memoria**: ADR-007 decide almacenar el accessToken en memoria (variable JS). Esto lo protege de XSS pero lo pierde al recargar la página, forzando refresh frecuente.
- **Sin Sanitización de salida**: Los datos de telemetría se renderizan directamente desde Chart.js, que puede ejecutar scripts si no se sanitizan los labels.

### 7. Auditoría y Trazabilidad

- **AuditService mínimo**: Solo 9 líneas, sin implementación real de registro de eventos de seguridad.
- **Sin logs de acceso**: No se registran intentos de login fallidos, acceso a recursos sensibles, ni cambios de configuración.
- **Sin alertas de seguridad**: No hay notificaciones ante actividad sospechosa (múltiples fallos de autenticación, acceso desde IP desconocida).

### 8. Dependencias y Supply Chain

- **Sin auditoría de dependencias**: `package.json` no tiene script de `npm audit` ni integración con Snyk/Dependabot.
- **Sin lockfile en CI**: `pnpm-lock.yaml` existe pero no se verifica su integridad en el pipeline.
- **crypto-js vs Web Crypto**: `encryption.js` usa `crypto-js` (librería comunitaria) en lugar de `crypto` nativo de Node.js.

## Decisión

Se adopta una **estrategia de seguridad por capas (defense in depth)** con las siguientes decisiones organizadas por dominio. Cada decisión incluye su prioridad de implementación.

### 1. Gestión de Secretos

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **Eliminar secretos del repositorio** | INMEDIATA | Mover `config.h` fuera del repositorio. Generarlo desde plantilla + `.env` vía `generate_config.py` (ya existe el mecanismo). Añadir `config.h` a `.gitignore`. Eliminar el `.env` del historial Git (BFG Repo-Cleaner). |
| **Separar claves criptográficas** | ALTA | `JWT_SECRET` se usa exclusivamente para firmar JWT. `ENCRYPTION_KEY` es una variable independiente para AES-256-GCM en `encryption.js`. |
| **Validar secretos en producción** | ALTA | En `env.js`, si `NODE_ENV === 'production'`, validar que `JWT_SECRET` tenga al menos 32 caracteres y no sea el valor por defecto. |
| **Secretos por entorno** | MEDIA | Tres conjuntos de secretos: `development`, `staging`, `production`. Cada entorno tiene su propio `.env.{entorno}` no commiteado. Las GitHub Actions usan secrets de GitHub, no archivos. |
| **Rotación de secretos** | FUTURA | Script `scripts/rotate-secrets.js` que regenera `JWT_SECRET`, `ENCRYPTION_KEY`, y API keys de ThingSpeak, migrando datos cifrados. |
| **Firmware: secrets en NVS** | ALTA | Migrar credenciales WiFi, ThingSpeak API key y backend host desde `config.h` a la partición NVS del ESP32-S3. `config.h` solo contiene pines y constantes de compilación. Las credenciales se cargan en `setup()` desde NVS. |

### 2. Seguridad en el Transporte

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **HTTPS en backend** | ALTA | Configurar TLS en el servidor Express usando certificados autofirmados para desarrollo y Let's Encrypt (o similar) para producción. El firmware debe soportar HTTPS vía `WiFiClientSecure`. |
| **ThingSpeak vía HTTPS** | ALTA | Cambiar `TS_PORT` de 80 a 443 y usar `WiFiClientSecure` en `thingspeak_client.cpp`. ThingSpeak ya soporta HTTPS en su API. |
| **Eliminar MQTT público o asegurarlo** | INMEDIATA | La conexión a `test.mosquitto.org` sin TLS ni autenticación es un riesgo activo. Opción A (preferida): migrar el bridge MQTT a un broker privado con TLS y autenticación por certificado de cliente. Opción B (transición): deshabilitar el MQTT bridge hasta que haya un broker seguro. Ver ADR-008 y su contradicción con la implementación actual. |
| **HTTPS en firmware ↔ backend** | MEDIA | El backend debe servir también en HTTPS. El firmware usa `WiFiClientSecure` con fingerprint o CA root para verificar el certificado del servidor. |
| **HSTS en backend** | BAJA | Una vez HTTPS funcione, añadir header `Strict-Transport-Security`. |

### 3. Autenticación de Dispositivos (Firmware)

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **API Key por dispositivo** | ALTA | Cada dispositivo tiene una API key única (generada en el backend al registrar el dispositivo). El firmware la envía en header `X-Device-Key` en cada request. El backend valida contra la tabla `ApiKey` (modelo ya existe pero no se usa). |
| **Firmware register-on-boostrap** | ALTA | Al primer boot, el firmware se registra en el backend (`POST /api/v1/devices/register`) enviando su `deviceId` y recibiendo su API key. La API key se almacena en NVS. En boots subsecuentes, se lee de NVS. |
| **Rate limiting específico por dispositivo** | ALTA | Reemplazar el `skip` actual del rate limiter por un rate limit por deviceId o IP, con un límite más alto para el endpoint de actuadores en lugar de excluirlo completamente. |
| **Revocación de API keys** | MEDIA | Endpoint `DELETE /api/v1/admin/devices/{id}/key` que invalida la API key de un dispositivo. El firmware recibe un 403 y debe re-registrarse. |

### 4. Hardening del Firmware

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **Secure Boot** | MEDIA | Habilitar Secure Boot v2 en el ESP32-S3. Esto requiere generar claves de firma y configurar `platformio.ini` con `board_build.secure = secure` y `board_build.signings_key =`. |
| **Flash Encryption** | MEDIA | Habilitar flash encryption en modo Development (para test) y Production (para despliegue). Las credenciales en NVS se cifran automáticamente si la flash encryption está activa. |
| **Firmware signing para OTA** | ALTA | Las actualizaciones OTA deben estar firmadas con la clave privada de Secure Boot. El bootloader verifica la firma antes de aplicar la actualización. |
| **Deshabilitar puertos de depuración en producción** | BAJA | UART0 (Serial) se deshabilita o protege con contraseña en firmware de producción. |
| **Rollback protection** | BAJA | Habilitar anti-rollback para evitar que un atacante instale una versión anterior vulnerable del firmware. |

### 5. Seguridad del Backend

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **Input validation con Zod** | ALTA | Migrar de validación manual a `zod` para schemas de request. Cada ruta tiene un schema que valida query params, body, y headers. Zod se instala como dependencia y reemplaza la validación ad-hoc. |
| **SQL injection audit** | ALTA | Auditar todas las consultas Sequelize para verificar que no hay concatenación de strings en queries. Prohibir `sequelize.query()` con interpolación de strings. |
| **Separar sync de migrate** | ALTA | `sequelize.sync({ alter: true })` solo se ejecuta en desarrollo. En producción, se usa un sistema de migraciones (Umzug o Sequelize CLI). |
| **Login rate limiting** | ALTA | Endpoint `/api/auth/login` tiene rate limit agresivo: 5 intentos por minuto por IP, bloqueo de 15 minutos tras 10 fallos consecutivos. |
| **Refresh token en httpOnly cookie** | ALTA | El refresh token se envía como `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth`, no en el body de la respuesta. |
| **Logging sanitizado** | MEDIA | Crear wrapper de logging que filtre campos sensibles (passwords, tokens, API keys) antes de escribir a stdout/archivo. |
| **Helmet hardening** | MEDIA | Revisar CSP para eliminar `'unsafe-inline'` usando nonces o hashes para estilos. Añadir `referrerPolicy: 'no-referrer'` y `frameguard: 'DENY'`. |

### 6. Seguridad del Frontend

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **CSP con nonces** | MEDIA | Migrar de `'unsafe-inline'` a nonces generados por servidor para scripts y estilos inline. Vite puede configurarse para generar nonces. |
| **Sanitización de datos de telemetría** | BAJA | Los labels y valores de Chart.js deben sanitizarse con `DOMPurify` antes de renderizar si contienen datos ingresados por usuario. |
| **Refresh token en cookie (no body)** | ALTA | Ver punto 5. El frontend no debe manejar el refresh token en absoluto; solo existe como httpOnly cookie. |

### 7. Auditoría y Trazabilidad

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **AuditService funcional** | ALTA | Implementar `auditService.log(evento, userId, recurso, detalles, ip)`. Todos los eventos de seguridad se registran en la tabla `AuditLog`. |
| **Eventos de seguridad auditables** | ALTA | Login exitoso, login fallido, cambio de contraseña, creación de usuario, cambio de rol, revocación de API key, comando a actuador, cambio de configuración de dispositivo, acceso denegado (403). |
| **Logs de acceso a telemetría** | BAJA | Registrar qué usuario consultó telemetría de qué dispositivo y cuándo. Opcional, activable vía configuración. |
| **Alertas de seguridad** | FUTURA | Cuando ocurran N eventos de seguridad en T minutos (ej. 5 login fallidos en 1 minuto), emitir evento de alarma al dashboard y (futuro) a un canal de notificaciones. |

### 8. Dependencias y Supply Chain

| Decisión | Prioridad | Detalle |
|----------|-----------|---------|
| **npm audit en CI** | ALTA | Añadir `npm audit` al workflow de CI. Fallar si hay vulnerabilidades críticas o altas sin parche. |
| **Dependabot o Renovate** | MEDIA | Habilitar Dependabot en GitHub para PRs automáticos de actualización de dependencias. |
| **Migrar de crypto-js a crypto nativo** | MEDIA | `encryption.js` debe migrar de `crypto-js` a `crypto` (módulo nativo de Node.js). La implementación con GCM ya está diseñada, solo cambiar la librería subyacente. |
| **Lockfile verification** | BAJA | En CI, verificar que `pnpm-lock.yaml` coincide con `package.json` (`pnpm install --frozen-lockfile`). |
| **SBOM (Software Bill of Materials)** | FUTURA | Generar SBOM con `npm sbom` o `cyclonedx-npm` como artefacto de CI. |

## Consecuencias

### Positivas
- Eliminación del riesgo más crítico: secretos en el repositorio
- Aislamiento criptográfico: JWT_SECRET y ENCRYPTION_KEY son independientes
- Autenticación mutua entre firmware y backend via API keys por dispositivo
- El firmware puede recibir actualizaciones OTA firmadas, evitando ataques de suministro
- Los login rate limits protegen contra ataques de fuerza bruta
- El refresh token en httpOnly cookie elimina el vector de exposición por XSS
- La auditoría permite forensia post-incidente y cumplimiento
- La validación con Zod reduce la superficie de ataque por inyección

### Negativas
- **Complejidad operativa**: Gestionar tres entornos de secretos, certificados TLS, y claves de firma de firmware añade overhead operativo
- **Boot time impact**: Secure Boot y flash encryption añaden ~1-2 segundos al tiempo de arranque del ESP32-S3
- **Debugging más complejo**: Con flash encryption habilitada, no se puede leer la flash del ESP32-S3 para debugging
- **Ciclo de desarrollo más lento**: Las migraciones de base de datos reemplazan el `sync({ alter: true })` ágil
- **Riesgo de lockout**: Un rate limit de login mal configurado puede bloquear a usuarios legítimos
- **Coste de certificados TLS**: Para producción se requiere un certificado válido (Let's Encrypt es gratuito pero requiere renovación cada 90 días)
- **Dependencia de Zod**: Migrar de validación manual a Zod requiere cambios en todas las rutas

## Arquitectura de Secretos Propuesta

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ESTRATEGIA DE SECRETOS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Desarrollo (local)          Staging (CI)          Producción       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ .env.development │  │ GitHub Secrets   │  │ HashiCorp Vault  │  │
│  │ (no commiteado)  │  │ (Actions → .env) │  │ o .env.production│  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                      │            │
│           ▼                     ▼                      ▼            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    ENV.JS (loader)                          │    │
│  │  • Valida que secrets existan en producción                │    │
│  │  • Rechaza valores por defecto si NODE_ENV=production      │    │
│  └─────────────────────┬───────────────────────────────────────┘    │
│                        │                                           │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              PROPÓSITO DE CADA SECRETO                  │       │
│  ├─────────────────────────────────────────────────────────┤       │
│  │ JWT_SECRET       → Firma de tokens JWT (HS256)         │       │
│  │ ENCRYPTION_KEY   → AES-256-GCM para datos en DB        │       │
│  │ DB_PASSWORD      → Conexión a PostgreSQL               │       │
│  │ TS_API_KEY       → ThingSpeak (firmware + backend)     │       │
│  │ WIFI_*           → Conectividad WiFi (firmware NVS)    │       │
│  │ DEVICE_API_KEY   → Por dispositivo (backend → NVS)     │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Roadmap de Implementación

```
Fase 1 (inmediata): Remediación crítica — 1 semana
├── Mover config.h a .gitignore + generate_config.py desde .env
├── Eliminar .env del historial (BFG Repo-Cleaner) y rotar JWT_SECRET
├── Separar ENCRYPTION_KEY de JWT_SECRET
├── Deshabilitar MQTT bridge público o migrar a broker con TLS
└── Añadir npm audit al CI + fix de vulnerabilidades existentes

Fase 2 (corto plazo): Autenticación y transporte — 2 semanas
├── Implementar API key por dispositivo (modelo ApiKey existe)
├── Rate limiting específico por deviceId (eliminar skip general)
├── Refresh token en httpOnly cookie (backend + frontend)
├── Login rate limiting (5 intentos/minuto)
├── ThingSpeak vía HTTPS (WiFiClientSecure)
└── Input validation con Zod en rutas críticas (auth, actuators, admin)

Fase 3 (medio plazo): Hardening backend — 3 semanas
├── Migración de sync() a migraciones Sequelize
├── AuditService funcional con tabla AuditLog
├── Logging sanitizado (wrapper de console)
├── Helmet CSP con nonces
├── Migrar crypto-js a crypto nativo
└── Auditoría SQL injection en todas las consultas

Fase 4 (largo plazo): Hardening firmware — 1 mes
├── Credenciales WiFi/API keys en NVS (no en config.h)
├── Secure Boot v2 + flash encryption (modo development)
├── Firmware signing para OTA
├── Soporte HTTPS en http_poller + thingspeak_client
└── Device register-on-boostrap (POST /api/v1/devices/register)

Fase 5 (futuro): Madurez — continuo
├── HTTPS en backend con Let's Encrypt
├── HSTS
├── Rotación automática de secretos
├── SBOM en CI
├── Dependabot/Renovate
├── Alertas de seguridad en dashboard
└── Deshabilitar puertos de depuración en producción
```

## Alternativas Descartadas

- **Usar un gestor de secretos externo (Vault) desde el inicio**: HashiCorp Vault es la mejor solución para producción, pero añade complejidad operativa innecesaria para la fase actual. Se adopta `.env.{entorno}` con validación estricta, con plan de migrar a Vault cuando haya múltiples instancias del backend.
- **Usar AWS Secrets Manager / Azure Key Vault**: Bloquea al proveedor cloud antes de decidir la estrategia de despliegue. Se difiere hasta que se defina el target de producción.
- **Sesiones con Redis en lugar de JWT**: Descartado en ADR-007. Se mantiene JWT pero se mejora la seguridad del refresh token (httpOnly cookie) y se añade validación de issuer/audience.
- **mTLS entre firmware y backend**: Añade complejidad de gestión de certificados en el ESP32-S3 (flash limitada para almacenar CA + certificado + clave). Las API keys por dispositivo son más ligeras y suficientes para el modelo de amenazas actual.
- **Usar JWE (JWT Encrypted) en lugar de JWS**: El payload del JWT actual no contiene datos sensibles (solo userId, role, name). JWE añadiría ~200 bytes por token sin beneficio real.
- **Socket.IO en lugar de SSE + WebSocket nativo**: No aporta ventajas de seguridad; la seguridad está en el transporte (WSS) y la autenticación, no en la capa de aplicación.
- **Eliminar SSE en favor de solo WebSocket**: Ambos canales tienen casos de uso diferente (SSE para frontend browser, WS para firmware). No hay ganancia de seguridad en eliminarlos.

## Referencias

- `backend/src/config/env.js` — Loader de variables de entorno (línea 21: JWT_SECRET por defecto inseguro)
- `backend/src/services/encryption.js` — Reutilización de JWT_SECRET como clave AES
- `backend/src/middlewares/auth.js` — Autenticación JWT sin validación de issuer/audience
- `backend/src/middlewares/rbac.js` — RBAC con jerarquía numérica
- `backend/src/app.js` — Rate limit exceptuado para actuadores (línea 34), CSP con unsafe-inline
- `backend/src/services/mqttBridge.js` — Conexión a broker público sin TLS
- `backend/src/server.js` — sync({ alter: true }) en desarrollo (línea 16)
- `backend/src/services/auditService.js` — Esqueleto de auditoría sin implementar
- `firmware/src/config.h` — Secretos en texto plano (líneas 12-24)
- `firmware/src/http_poller.h` — Conexión HTTP sin TLS
- `firmware/src/thingspeak_client.cpp` — Conexión HTTP sin TLS
- `firmware/generate_config.py` — Script existente para generar config.h desde .env
- `docs/ADR/ADR-007-JWT-RBAC.md` — Decisión original de autenticación JWT + RBAC
- `docs/ADR/ADR-008-HTTP-Command-Protocol.md` — Protocolo HTTP polling (contradice MQTT activo)
- `docs/ADR/ADR-006-Logs-Monitoreo-estrategia.md` — Estrategia de logs (sin auditoría de seguridad)
- `docs/architecture/backend.md` — Documentación de arquitectura del backend
- `docs/roadmap/otras-consideraciones.md` — Secciones de seguridad

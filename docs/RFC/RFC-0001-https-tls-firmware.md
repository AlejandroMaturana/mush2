# RFC-0001 — Estrategia de Seguridad TLS

## Metadata

| Campo             | Valor                |
| ----------------- | -------------------- |
| Autor             | Alejandro Maturana   |
| Estado            | ACEPTADO             |
| Fecha de apertura | 2026-07-05           |
| Fecha de cierre   | 2026-07-23           |
| ADR resultado     | ADR-023, ADR-024     |
| Área              | Infraestructura      |

---

## Resumen

Definir la estrategia de seguridad para las comunicaciones del sistema Mush2: cifrado MQTT (firmware ↔ broker) y despliegue HTTPS (backend ↔ frontend). Las dos capas se documentan por separado porque tienen ciclos de vida independientes.

---

## Motivación

Actualmente el sistema opera en texto plano:

1. **MQTT**: `test.mosquitto.org:1883` (sin TLS, sin autenticación)
2. **HTTP**: backend en puerto 3797 (sin HTTPS en desarrollo)
3. **Credenciales**: viajan en texto plano en ambos canales

El riesgo es bajo en entorno local. En producción (Fase 10, broker propio + backend público) el riesgo es **crítico**.

---

## Decisiones Clave

### Q1 — ¿Dónde se termina TLS?

> **La terminación TLS pertenece a la infraestructura, no al backend Express.**

Express continua funcionando sobre HTTP interno. La capa de TLS se gestiona externamente:

| Entorno      | Terminación TLS                       |
| ------------ | ------------------------------------- |
| Render       | Edge TLS automático de Render         |
| VPS          | Reverse proxy (preferentemente Caddy) |
| Docker local | HTTP o HTTPS opcional                 |

**Razón:** Separación de responsabilidades. Express se enfoca en lógica de negocio; la infraestructura gestiona cifrado.

### Q2 — ¿Cómo se gestiona el certificado?

> **El firmware confía en la Root CA, no en el certificado leaf.**

| Componente | Certificado | Caducidad | Actualización |
|------------|-------------|-----------|---------------|
| Firmware | Root CA (ISRG Root X1) | 2035 | Solo si cambia cadena de confianza |
| Backend | Leaf (Let's Encrypt) | 90 días | Automático (certbot/Caddy) |
| Broker | Leaf (Let's Encrypt) | 90 días | Automático (certbot/Caddy) |

**Regla:** Las renovaciones de Let's Encrypt son transparentes al firmware. El firmware solo necesita actualizar su CA root si la cadena de confianza cambia (evento excepcional).

> **Nota:** El diseño debe permitir actualizar la CA root via OTA sin obligar a hacerlo. No es OTA obligatoria; es que el diseño no lo imposibilite.

### Q3 — ¿Modo de desarrollo TLS?

> **`setInsecure()` es modo de desarrollo, no fallback.**

```c
#ifdef DEBUG
  #define TLS_VERIFY 0   // Solo para desarrollo
#else
  #define TLS_VERIFY 1   // Siempre en producción
#endif
```

**Tres reglas:**
1. Compilar con `TLS_VERIFY=0` invalida cualquier prueba de seguridad
2. Nunca es el default — solo opt-in vía `#define DEBUG`
3. Si está activo en producción, es un incidente de seguridad

### Q4 — ¿Cómo identifica el firmware al broker?

> **Hostname vía DNS, nunca IP directa.**

```text
Firmware
  → Resuelve mqtt.mush2.cl (DNS)
  → Conecta a IP:8883 (MQTTS)
  → Verifica certificado contra CA root
```

**Razón:** TLS funciona con nombres, no con direcciones IP. Un certificado Let's Encrypt está emitido para un dominio (`mqtt.mush2.cl`), no para una IP.

### Q5 — ¿Qué ocurre si TLS falla?

> **Reintento exponencial → modo offline → seguir controlando cámara.**

```text
Boot
  ↓
WiFi Connect
  ↓
MQTT TLS Connect
  ↓
¿Error?
  ↓ Sí
Reintento exponencial (5s → 10s → 30s → 60s → 300s max)
  ↓
¿10+ fallos consecutivos?
  ↓ Sí
Modo offline: seguir controlando cámara con última receta conocida
  ↓
Reintentar cada 5 min
```

**Principio:** Nunca dejar de controlar la cámara por un problema de conectividad. La seguridad no puede comprometer la operación.

---

## Decisión Final

RFC-0001 se desdobla en dos ADR independientes:

| ADR | Responsabilidad | Alcance |
|-----|-----------------|---------|
| ADR-023 | Infraestructura MQTT segura | Broker, TLS, autenticación, ACLs, conexión firmware/backend |
| ADR-024 | Estrategia de despliegue HTTPS | Render, reverse proxy, terminación TLS, puertos internos |

**Por qué separar:** Las dos capas evolucionan independientemente. Se puede cambiar Express por Fastify sin afectar ADR-023. Se puede cambiar Mosquitto por EMQX sin afectar ADR-024.

---

## Alternativas Consideradas

| Opción | Pros | Contras | Descartado por |
|--------|------|---------|----------------|
| TLS en Express (https.createServer) | Todo junto | Acoplamiento; Express gestiona cert | Separación de responsabilidades |
| VPN (WireGuard) | Sin cambios en firmware | Configuración de red del usuario; no portable | Fricción excesiva |
| Mantener HTTP plano | Sin cambios | Inseguro en producción | Riesgo de seguridad |

---

## Consecuencias

### Positivas
- Firmware resiliente: sigue operando sin TLS si la red falla
- Separación clara de responsabilidades: infra vs. aplicación
- Certificados transparentes al firmware (renovación automática)

### Negativas
- Complejidad inicial: configurar reverse proxy + certificados
- Firmware requiere módulo WiFiClientSecure (~30-40KB RAM)

---

## Plan de Migración

```
Fase 1: ADR-023 (MQTT seguro)
├── Mosquitto con TLS en Docker
├── Autenticación firmware (user/password)
├── ACLs por deviceId
└── Firmware: WiFiClientSecure + CA root

Fase 2: ADR-024 (HTTPS deployment)
├── Backend: Render edge TLS (ya activo)
├── VPS: Caddy reverse proxy (futuro)
└── Firmware: HTTP → HTTPS con TLS_VERIFY
```

---

## Referencias

- `ADR-023` — Infraestructura MQTT Segura
- `ADR-024` — Estrategia de Despliegue HTTPS
- `ADR-013` — Estrategia de Seguridad (general)
- `docs/protocol/protocol-v1.md` — Protocolo MQTT actual
- `docs/operations/deployment.md` — Despliegue actual

---

## Historial de Cambios

| Versión | Fecha      | Autor            | Cambios                                    |
| ------- | ---------- | ---------------- | ------------------------------------------ |
| 1.0     | 2026-07-05 | Alejandro Maturana | Creación del documento (DRAFT)           |
| 2.0     | 2026-07-23 | Alejandro Maturana | Decisiones Q1-Q5, split en ADR-023/024   |

---

*Documento generado como parte del proceso de Architecture Decision Records de Mush2.*

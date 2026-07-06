# Decision Tree — Mush2

Este documento sirve como guía interactiva para desarrolladores (humanos y agentes IA) para tomar decisiones de diseño consistentes con la arquitectura y la gobernanza de Mush2.

---

## 1. Decisiones de Documentación y Proceso

```
¿Qué tipo de cambio o propuesta estás realizando?
 │
 ├── Modificación simple de código (bugfix, refactor menor, mejora de UI)
 │    └── Acción: Crear feature/fix branch → Seguir Definition of Done (DoD) → Actualizar CHANGELOG.md.
 │
 ├── Nueva funcionalidad o cambio menor en un solo componente
 │    └── Acción: Seguir estándares en docs/governance/coding-standards.md.
 │
 ├── Propuesta de cambio significativo (afecta >= 2 componentes, seguridad, protocolo o dependencias)
 │    │
 │    ├── ¿La decisión ya está tomada y alineada con el equipo?
 │    │    ├── Sí ──► Acción: Crear un Architecture Decision Record (ADR) en docs/ADR/.
 │    │    └── No  ──► Acción: Crear un Request for Comments (RFC) en docs/rfc/.
 │    │
 │    └── ¿Es un subsistema complejo que requiere diseño detallado antes de implementar?
 │         └── Sí ──► Acción: Crear un Engineering Design Document (EDD) en docs/edd/.
```

---

## 2. Decisiones de Comunicación y Protocolo

```
¿Cómo debe comunicarse el componente con otros?
 │
 ├── De Firmware a Backend (Telemetría / Comandos)
 │    │
 │    ├── ¿Es telemetría de sensores regular (T/HR/CO₂)?
 │    │    └── Acción: Usar HTTP POST a /api/v1/telemetry cada 8s (resguardo ThingSpeak cada 20s).
 │    │
 │    └── ¿El firmware necesita recibir comandos del usuario?
 │         └── Acción: Usar HTTP GET a /api/v1/devices/:id/poll cada 500ms (HTTP polling v1).
 │
 ├── De Backend a Firmware (Comandos inmediatos)
 │    └── Acción: Encolar comando en base de datos. Se entrega en la siguiente respuesta del polling.
 │
 └── De Backend a Frontend (Tiempo real)
      │
      ├── ¿Es telemetría en vivo, alarmas o confirmaciones de comandos (ACK)?
      │    └── Acción: Usar Server-Sent Events (SSE) a través de /events.
      │
      └── ¿Es una acción iniciada por el usuario (CRUD, configuración)?
           └── Acción: Usar peticiones API REST estándar con JWT.
```

---

## 3. Decisiones de Control de Actuadores

```
¿Cómo debe reaccionar el firmware ante un cambio en las condiciones ambientales?
 │
 ├── ¿La temperatura supera los 32°C?
 │    └── Sí ──► OVERHEAT FAIL-SAFE: Apagar calentador (CH2), apagar humidificador (CH3), encender ventilación (CH1).
 │
 ├── ¿El firmware tiene conexión activa con el Backend?
 │    │
 │    ├── Sí (Modo NORMAL / REMOTE)
 │    │    └── Acción: Seguir comandos recibidos del Backend (controlEngine.js).
 │    │
 │    └── No (Modo DEGRADED / LOCAL)
 │         └── Acción: Aplicar histéresis local utilizando setpoints pre-configurados.
 │
 └── ¿El actuador acaba de cambiar de estado?
      └── Sí ──► Respetar temporizadores de seguridad (minOn / maxOn) antes de permitir otro cambio.
```

---

## 4. Decisiones de Gestión de Errores en Embebidos

```
¿Qué hacer cuando ocurre una falla en el ESP32-S3?
 │
 ├── Falla de lectura de sensores I2C (AHT21 / ENS160)
 │    ├── ¿Falla persistente por >= 3 lecturas?
 │    │    ├── Sí ──► Entrar en modo DEGRADED. Usar última lectura válida. Notificar alarma.
 │    │    └── No  ──► Intentar reset + reinit del bus I2C. Reintentar lectura en el siguiente ciclo.
 │
 ├── Falla de conexión WiFi / HTTP
 │    └── Acción: Iniciar backoff exponencial (1s a 60s). Entrar en modo LOCAL (histéresis autónoma).
 │
 └── Reinicios consecutivos inesperados (Soft/Hardware Watchdog)
      ├── ¿Contador en NVS supera los 5 reboots consecutivos?
      │    ├── Sí ──► Entrar en modo SAFE. Encender LED RGB en rojo, apagar actuadores y esperar.
      │    └── No  ──► Incrementar contador en NVS, registrar reset y reiniciar.
```

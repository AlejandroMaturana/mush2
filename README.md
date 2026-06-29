# Mush2 — Controlador de Ambientes para Hongos Adaptógenos

> Sistema IoT para monitoreo y control ambiental de cámaras de cultivo de hongos adaptógenos. Lee temperatura, humedad y CO₂, controla actuadores SSR mediante FreeRTOS en ESP32-S3, y expone un dashboard web en tiempo real.

<div align="center">

![C++](https://img.shields.io/badge/C++-PlatformIO-00599C?logo=c%2B%2B&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-Framework-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql&logoColor=white)
![FreeRTOS](https://img.shields.io/badge/FreeRTOS-Real%20Time-00979D?logo=freertos&logoColor=white)

</div>

---

## Características Principales

Mush2 es una solución completa de **IoT industrial** para el cultivo controlado de hongos adaptógenos:

- **Monitoreo Ambiental Preciso**: Lectura de temperatura, humedad relativa y calidad del aire (CO₂, VOC) mediante sensores AHT21 y ENS160 vía I²C.
- **Control de Actuadores SSR**: Gestión de 4 canales de relés de estado sólido (active-LOW) para ventilación, calefacción, humidificación e iluminación.
- **Arquitectura FreeRTOS**: 6 tareas en 2 núcleos Xtensa LX7 con prioridades, colas de sincronización y watchdog jerárquico (TWDT + SWDT + Health Check).
- **Comunicación HTTP Polling**: Sincronización entre firmware y backend mediante REST API con cola de comandos y backoff exponencial.
- **Dashboard en Tiempo Real**: Interfaz web React con SSE, visualización de datos históricos y control remoto de actuadores.
- **Telemetría de Respaldo**: Envío de datos a ThingSpeak como sistema de respaldo y monitoreo externo.
- **Seguridad por Capas**: JWT + RBAC, API keys por dispositivo, refresh token en httpOnly cookie, rate limiting, Helmet CSP.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Firmware** | C++ (PlatformIO / ESP32-S3) + FreeRTOS |
| **Backend** | Node.js 20+ / Express 5 / Sequelize 6 |
| **Frontend** | React 18 + Vite + Chart.js |
| **Base de datos** | PostgreSQL 16 |
| **Comunicación** | HTTP polling (REST API) + WebSocket + SSE |
| **Telemetría (respaldo)** | ThingSpeak |
| **Watchdog** | TWDT (12s) + SWDT (30s) + Health Check (60s) |

---

## Componentes del Sistema

### Firmware (ESP32-S3 / FreeRTOS)
- 6 tareas en 2 núcleos: Sensors (Core 1), SSR (Core 1), WiFi (Core 0), Poller (Core 0), OTA (Core 0), Telemetry (Core 0)
- Lectura de sensores AHT21 y ENS160 vía I²C cada 8s
- Control de 4 canales SSR para actuadores con histéresis
- HTTP polling al backend con backoff exponencial y cola de comandos
- Watchdog jerárquico: TWDT (12s, panic → reboot), SWDT (30s, recovery controlado), Health Check (60s)
- Envío de telemetría a ThingSpeak cada 20s
- OTA: ArduinoOTA + HTTP Update
- Device ID dinámico derivado de MAC address

### Backend (Node.js/Express)
- API REST para gestión de dispositivos, telemetría, actuadores, recetas y ciclos
- Motor de reglas (controlEngine.js) con automatización por fases y VPD
- Sincronización HTTP con dispositivos + cola persistente de comandos
- JWT auth + RBAC (SUPER_ADMIN, ADMIN, OPERATOR, VIEWER)
- Seguridad: Helmet CSP, rate limiting, refresh token en httpOnly cookie
- Persistencia en PostgreSQL 16 con Sequelize ORM
- WebSocket para firmware + SSE para frontend

### Frontend (React/Vite)
- Dashboard en tiempo real con Chart.js y SSE
- Control remoto de actuadores por canal
- Visualización de datos históricos con filtros
- Gestión de recetas y ciclos de cultivo
- Interfaz responsiva con AuthContext y ErrorBoundary

---

## Documentación

- `PROJECT_CONTEXT.md` — Definición del proyecto
- `PROJECT_JOURNAL.md` — Bitácora de decisiones
- `docs/ADR/` — 13 Architecture Decision Records (ADR-001 a ADR-013)
- `docs/architecture/` — Arquitectura por componente
- `docs/contracts/` — Contratos (API REST)
- `docs/roadmap.md` — Roadmap de desarrollo (18 fases)
- `docs/requirements.md` — Requerimientos funcionales

### ADRs destacados (v0.9.0)
- `ADR-001-ESP32.md` — Migración a ESP32-S3 como nodo de telemetría
- `ADR-008-HTTP-Command-Protocol.md` — Protocolo HTTP polling
- `ADR-012-FreeRTOS.md` — Arquitectura FreeRTOS y watchdog jerárquico
- `ADR-013-Seguridad-Estrategia.md` — Estrategia de seguridad por capas

---

## Autor

**Alejandro Maturana** — _Ingeniero Industrial & Full Stack Developer_

- **GitHub**: [@AlejandroMaturana](https://github.com/AlejandroMaturana)
- **LinkedIn**: [manugl86](https://www.linkedin.com/in/manugl86)

---

## Licencia

MIT

---

> **Estado del Sistema**: v0.9.0 — En desarrollo. Mush2 es software libre para el cultivo de hongos adaptógenos e IoT industrial.

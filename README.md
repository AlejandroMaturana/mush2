# 🍄 Mush2 — Controlador de Ambientes para Hongos Adaptógenos

> Sistema IoT para monitoreo y control ambiental de cámaras de cultivo de hongos adaptógenos. Lee temperatura, humedad y CO2, controla actuadores SSR, y expone un dashboard web en tiempo real.

<div align="center">

![C++](https://img.shields.io/badge/C++-PlatformIO-00599C?logo=c%2B%2B&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-Framework-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-Messaging-660066?logo=mqtt&logoColor=white)

</div>

---

## 🌟 Características Principales

Mush2 es una solución completa de **IoT industrial** para el cultivo controlado de hongos adaptógenos:

- 🌡️ **Monitoreo Ambiental Preciso**: Lectura de temperatura, humedad relativa y calidad del aire (CO2, VOC, NOx) mediante sensores AHT21 y ENS160.
- ⚡ **Control de Actuadores SSR**: Gestión de hasta 4 canales de relés de estado sólido para control de ventilación, humidificación, calefacción e iluminación.
- 📡 **Comunicación MQTT**: Sincronización en tiempo real entre dispositivos firmware, backend y frontend mediante protocolo MQTT 3.1.1.
- 📊 **Dashboard en Tiempo Real**: Interfaz web React con visualización de datos históricos y control remoto de actuadores.
- 🔄 **Telemetría de Respaldo**: Envío de datos a ThingSpeak como sistema de respaldo y monitoreo externo.
- 🏗️ **Arquitectura Modular**: Separación clara entre firmware (ESP8266), backend (Node.js) y frontend (React) para escalabilidad y mantenibilidad.

---

## 🛠️ Stack Tecnológico

La arquitectura de Mush2 utiliza tecnologías robustas para garantizar fiabilidad y rendimiento en entornos industriales:

| Capa | Tecnología |
|---|---|
| **Firmware** | C++ (PlatformIO / ESP8266) |
| **Backend** | Node.js 20 + Express 5 + Sequelize 6 |
| **Frontend** | React 18 + Vite + Chart.js |
| **Base de datos** | PostgreSQL 16 |
| **Mensajería** | MQTT 3.1.1 (Mosquitto/HiveMQ) |
| **Telemetría (respaldo)** | ThingSpeak |

---

## 📂 Componentes del Sistema

### Firmware (ESP8266)
- Lectura de sensores AHT21 (temperatura/humedad) y ENS160 (calidad del aire)
- Control de 4 canales SSR para actuadores
- Publicación de datos vía MQTT
- Envío de telemetría a ThingSpeak

### Backend (Node.js/Express)
- API REST para gestión de dispositivos y datos
- Motor de reglas para control automatizado
- Sincronización MQTT con dispositivos
- Persistencia en PostgreSQL con Sequelize ORM

### Frontend (React/Vite)
- Dashboard en tiempo real con Chart.js
- Control remoto de actuadores
- Visualización de datos históricos
- Interfaz responsiva y moderna

---

## 📚 Documentación

- `PROJECT_CONTEXT.md` — Definición del proyecto
- `PROJECT_JOURNAL.md` — Bitácora de decisiones
- `docs/architecture/` — Arquitectura por componente
- `docs/protocol/protocol-v1.md` — Protocolo MQTT v1
- `docs/contracts/` — Contratos (MQTT, API REST)
- `docs/roadmap.md` — Roadmap de desarrollo
- `docs/requirements.md` — Requerimientos funcionales

---

## 👤 Autor

**Alejandro Maturana** — _Ingeniero Industrial & Full Stack Developer_

- 🐙 **GitHub**: [@AlejandroMaturana](https://github.com/AlejandroMaturana)
- 💼 **LinkedIn**: [manugl86](https://www.linkedin.com/in/manugl86)

---

## 📄 Licencia

MIT

---

> 📡 **Estado del Sistema**: En desarrollo. Si encuentras útil este proyecto para cultivo de hongos o IoT industrial, ¡dale una estrella ⭐ al repositorio!

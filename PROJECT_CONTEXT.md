# Mush2 — Controlador de Ambientes para Hongos Adaptógenos

## ¿Qué es este proyecto?
Sistema IoT de control ambiental para el cultivo de hongos adaptógenos (melena de león, reishi, shiitake, cola de pavo, cordyceps, etc.). Monitorea y regula temperatura, humedad, CO2, ventilación e iluminación en cámaras de cultivo.

## ¿Cuál es el objetivo?
Proveer una plataforma integral (firmware + backend + frontend) que permita a productores ocasionales, cultivadores urbanos y laboratorios micológicos automatizar el control de microclimas mediante recetas de cultivo configurables, telemetría en tiempo real y alertas proactivas.

## ¿Cuáles son los componentes?

| Componente | Tecnología | Función |
|---|---|---|
| **Firmware** | C++ (PlatformIO / ESP32-S3) | Lectura de sensores (AHT21, ENS160), control de actuadores (SSR), comunicaciones HTTP + ThingSpeak |
| **Backend** | Node.js + Express 5 + Sequelize 6 + PostgreSQL | API REST, autenticación JWT, motor de reglas, gestión de recetas/ciclos, WebSockets |
| **Frontend** | React (Vite) | Dashboard en tiempo real, configuración remota, visualización de históricos, alarmas |
| **Comunicación** | HTTP Polling (REST API) | Comunicación HTTP entre dispositivos y backend |

## ¿Cuáles son las reglas?

1. **Compatibilidad**: Todo nuevo desarrollo debe mantener compatibilidad con HTTP polling v1 (ver `docs/contracts/api-contract.md`).
2. **Versionado Semántico**: Todos los componentes usan MAJOR.MINOR.PATCH. El protocolo tiene su propio versionado independiente.
3. **Seguridad**: JWT para API REST, contraseñas con bcrypt, secretos en `.env`, cifrado AES-256 para claves de ThingSpeak.
4. **Calidad**: Toda tarea debe cumplir la Definition of Done (compila, documentado, testeado, changelog actualizado).
5. **Persistencia**: La base de datos es PostgreSQL. Toda configuración de dispositivo debe persistirse para recuperación post-reinicio.
6. **Telemetría**: Los sensores se leen cada 20-30s. Los datos se envían a ThingSpeak y al backend simultáneamente.

## ¿Qué NO debe hacer un agente?

- Eliminar o modificar funcionalidades existentes sin ADR.
- Romper la compatibilidad del protocolo HTTP sin incrementar la versión mayor del protocolo.
- Introducir dependencias sin evaluación de seguridad y mantenimiento.
- Almacenar secretos en código fuente o commits.
- Cambiar la estructura de endpoints HTTP sin actualizar la documentación de protocolo y contratos.
- Ignorar la máquina de estados del dispositivo (boot → config → normal → error → recovery).
- Asumir disponibilidad permanente de red (el firmware debe operar en modo degradado).

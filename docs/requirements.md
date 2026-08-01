# Requerimientos — Mush2

## Funcionales

### Sensores y Monitoreo
- [x] Leer temperatura y humedad (AHT21) vía I²C cada 8s
- [x] Leer CO₂, VOC y AQI (ENS160) vía I²C cada 8s
- [x] Reset + reinit automático del AHT21 si falla el trigger de medición
- [x] Validar lecturas (rangos esperados, error de sensor)
- [x] Enviar telemetría vía HTTP POST cada 8s a `/api/v1/telemetry`
- [x] Enviar telemetría a ThingSpeak cada 20s con T/HR/CO₂/VOC
- [x] Mostrar telemetría en tiempo real en dashboard (SSE)

### Control de Actuadores
- [x] Controlar 4 canales SSR (ON/OFF) en GPIO11-14 (active-LOW)
- [x] Sondeo periódico de comandos HTTP en endpoint `poll`
- [x] Publicar ACK de confirmación vía HTTP POST
- [x] Histéresis para evitar oscilaciones (LOCAL/REMOTE/OFF)
- [x] Temporizadores de seguridad (mín ON)
- [x] Modo LOCAL (histéresis), REMOTE (comandos HTTP), OFF
- [x] Overheat fail-safe: override total si temp > 32°C

### Motor de Reglas
- [x] Evaluar reglas locales en firmware (histéresis T/H/CO₂)
- [x] Evaluar reglas en backend (receta activa) cada 60s
- [x] Ventilación automática por umbral de CO₂
- [x] Control de temperatura/humedad por setpoint con histéresis
- [x] Control por VPD (Déficit de Presión de Vapor)

### Gestión de Recetas
- [x] CRUD de recetas (especie, rangos T/HR/CO₂, ventilación, luz)
- [x] Asignar receta a ciclo de cultivo
- [x] Fases: INCUBATION, PRIMORDIA, FRUITING, HARVESTING
- [x] Transición automática entre fases por duración

### Alarmas y Eventos
- [x] Detectar valores fuera de rango
- [x] Alarma por temperatura alta/baja
- [x] Alarma por humedad alta/baja
- [x] Alarma por CO₂ alto
- [x] Deduplicación de alarmas (60s backend, 120s firmware)
- [x] Notificaciones en dashboard vía SSE
- [x] Registro de eventos (boot, comandos, cambios de estado)
- [x] Safe mode por fallo de sensor (3 lecturas inválidas)

### Autenticación y Usuarios
- [x] Login con JWT (access + refresh token con rotación)
- [x] Roles: SUPER_ADMIN, ADMIN, OPERATOR, VIEWER
- [x] Asociación usuario-dispositivo (UserChamberAccess)
- [x] Refresh token en httpOnly cookie (Secure, SameSite=Strict)
- [x] API key por dispositivo (modelo ApiKey)

### API REST
- [x] CRUD dispositivos
- [x] CRUD recetas
- [x] CRUD ciclos
- [x] Consulta de telemetría (últimos N, rango fechas)
- [x] Comando de actuadores
- [x] Endpoints de administración (usuarios, roles, audit logs)
- [x] Endpoints de monitoreo (métricas, health checks)

### Frontend
- [x] Dashboard en tiempo real (SSE con ack/state/telemetry/alarm/control_eval)
- [x] Visualización de telemetría (métricas en vivo + Chart.js)
- [x] Control remoto de actuadores (ON/OFF por canal)
- [x] Gestión de recetas (CRUD)
- [x] Vista de ciclos de cultivo con fases
- [x] Panel de alarmas en dashboard
- [x] Históricos con filtros
- [x] Autenticación (login/logout, refresh automático)
- [x] Manejo de errores global (ErrorBoundary) + estados de carga (Skeleton)
- [x] Diseño responsive (móvil + escritorio)

### Firmware FreeRTOS
- [x] 6 tareas FreeRTOS en 2 núcleos
- [x] Prioridades y stack sizes configurables
- [x] Watchdog jerárquico: TWDT (12s) + SWDT (30s) + Health Check (60s)
- [x] Cola de comandos entre taskPoller y taskSSR (cmdQueue)
- [x] Heartbeat por tarea para health check

## No Funcionales

### Rendimiento
- [x] Ciclo de telemetría ≤ 10s
- [x] Latencia de comando HTTP ≤ 5s (extremo a extremo)
- [x] API REST responde en ≤ 200ms (p95)
- [x] Dashboard carga inicial en ≤ 3s

### Disponibilidad
- [x] Firmware opera en modo DEGRADED sin conexión WiFi/HTTP
- [x] Máquina de estados: BOOT→INIT→WIFI→NORMAL→DEGRADED→ERROR→RECOVERY→SAFE + OTA_UPDATING + PROVISIONING (10 estados)
- [x] Watchdog jerárquico: TWDT (12s panic) + SWDT (30s recovery) + Health Check (60s heartbeat)
- [x] Backend tolera pausas en polling (cola persistente de comandos)
- [x] Base de datos con backup diario (pg_dump)
- [x] Sin punto único de fallo en comunicación (timeout y reintentos HTTP)
- [x] Firmware fallback a modo LOCAL sin conexión HTTP
- [x] Safe mode tras 5 reinicios consecutivos (60s wait + LED rojo)

### Seguridad (ADR-013)
- [x] JWT con expiración y refresh + token rotation
- [x] Refresh token en httpOnly cookie (no body response)
- [x] Contraseñas con bcrypt (salt 12)
- [x] Rate limiting en endpoints públicos (100 req/15min)
- [x] Helmet CSP + CORS hardening
- [x] Audit logging de operaciones sensibles (9 eventos)
- [x] RBAC por niveles de rol
- [x] Secretos en `.env`, nunca en código (migrando firmware a NVS)
- [x] API key por dispositivo (X-Device-Key header)
- [x] Separación de claves: JWT_SECRET ≠ ENCRYPTION_KEY

### Mantenibilidad
- [x] Código modular (firmware, backend, frontend separados)
- [x] Documentación de protocolo MQTT (`docs/contracts/mqtt-contract.md`)
- [x] Contrato de API (api-contract.md)
- [x] Versionado semántico en todos los componentes
- [x] CHANGELOG por componente
- [x] CI/CD en GitHub Actions (firmware + backend + frontend)
- [x] 13 ADRs documentados (ADR-001 a ADR-013)
- [x] OTA: ArduinoOTA + HTTP Update

### Firmware (Recursos)
- [x] Consumo de RAM ≤ 40KB
- [x] Consumo de flash ≤ 512KB
- [x] Watchdog jerárquico: TWDT + SWDT + Health Check
- [x] Reconexión WiFi ≤ 60s con backoff progresivo
- [x] Al menos 2 redes WiFi configurables
- [x] NVS: contador de reboots para modo SAFE (migrando credenciales a NVS)
- [x] Secure Boot v2 + flash encryption (futuro - ADR-013 Fase 4)

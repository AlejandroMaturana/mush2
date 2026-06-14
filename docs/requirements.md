# Requerimientos — Mush2

## Funcionales

### Sensores y Monitoreo
- [x] Leer temperatura y humedad (AHT21) cada 10s
- [x] Leer CO2 y VOC (ENS160) cada 10s
- [x] Reset + reinit automático del AHT21 si falla el trigger de medición
- [x] Validar lecturas (rangos esperados, error de sensor)
- [x] Publicar telemetría vía MQTT cada 10s a `mush2/telemetry/{id}/sensors`
- [x] Enviar telemetría a ThingSpeak cada 20s con T/HR/CO2/VOC
- [x] Mostrar telemetría en tiempo real en dashboard (SSE)

### Control de Actuadores
- [x] Controlar 3 canales SSR (ON/OFF) en pines D5, D7, D6
- [x] Recibir comandos MQTT QoS 1 en `mush2/cmd/{id}/actuator`
- [x] Publicar ACK de confirmación en `mush2/event/{id}/ack`
- [x] Histéresis para evitar oscilaciones (LOCAL/REMOTE/OFF)
- [x] Temporizadores de seguridad (mín 3s ON)
- [x] Modo LOCAL (histéresis), REMOTE (comandos MQTT), OFF

### Motor de Reglas
- [x] Evaluar reglas locales en firmware (histéresis T/H/CO2)
- [x] Evaluar reglas en backend (receta activa) cada 60s
- [x] Ventilación automática por umbral de CO2
- [x] Control de temperatura/humedad por setpoint con histéresis

### Gestión de Recetas
- [x] CRUD de recetas (especie, rangos T/HR/CO2, ventilación, luz)
- [x] Asignar receta a ciclo de cultivo
- [x] Fases: INCUBATION, FRUITING, MAINTENANCE, COMPLETED
- [x] Transición automática entre fases por duración

### Alarmas y Eventos
- [x] Detectar valores fuera de rango
- [x] Alarma por temperatura alta/baja
- [x] Alarma por humedad alta/baja
- [x] Alarma por CO2 alto
- [x] Deduplicación de alarmas (misma causa cada 60s backend, 120s firmware)
- [x] Notificaciones en dashboard vía SSE
- [x] Registro de eventos (boot, comandos, cambios de estado)

### Autenticación y Usuarios
- [x] Login con JWT (access + refresh token con rotación)
- [x] Roles: SUPER_ADMIN, ADMIN, OPERATOR, VIEWER
- [x] Asociación usuario-dispositivo (UserChamberAccess)
- [x] Dispositivos legacy (sin userId) accesibles por cualquier usuario autenticado

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
- [x] Visualización de telemetría (métricas en vivo)
- [x] Control remoto de actuadores (ON/OFF por canal)
- [x] Gestión de recetas (CRUD)
- [x] Vista de ciclos de cultivo con fases
- [x] Panel de alarmas en dashboard
- [x] Históricos con filtros
- [x] Autenticación (login/logout, refresh automático)
- [x] Manejo de errores global (ErrorBoundary) + estados de carga (Skeleton)
- [x] Diseño responsive (móvil + escritorio)
- [x] Badge de usuario + cierre de sesión

## No Funcionales

### Rendimiento
- [x] Ciclo de telemetría ≤ 10s
- [x] Latencia de comando MQTT ≤ 1s (extremo a extremo)
- [x] API REST responde en ≤ 200ms (p95)
- [x] Dashboard carga inicial en ≤ 3s

### Disponibilidad
- [x] Firmware opera en modo DEGRADED sin conexión WiFi/MQTT
- [x] Máquina de estados: BOOT→INIT→WIFI→NORMAL→DEGRADED→ERROR→RECOVERY→SAFE
- [x] Watchdog hardware (8s) + software (30s)
- [x] Backend tolera desconexión de MQTT (reconexión automática con exponential backoff 5s→180s)
- [x] Base de datos con backup diario (pg_dump)
- [x] Sin punto único de fallo en comunicación (2 brokers MQTT failover)
- [x] Firmware fallback a modo LOCAL sin conexión MQTT

### Seguridad
- [x] JWT con expiración y refresh + token rotation
- [x] Contraseñas con bcrypt (salt 12)
- [x] Rate limiting en endpoints públicos (100 req/15min)
- [x] Helmet CSP + CORS hardening
- [x] Audit logging de operaciones sensibles
- [x] RBAC por niveles de rol
- [x] Secretos en .env, nunca en código

### Mantenibilidad
- [x] Código modular (firmware, backend, frontend separados)
- [x] Documentación de protocolo MQTT (protocol-v1.md)
- [x] Contrato de API (api-contract.md)
- [x] Versionado semántico en todos los componentes
- [x] CHANGELOG por componente
- [x] CI/CD en GitHub Actions (firmware + backend + frontend)
- [x] OTA: ArduinoOTA + HTTP Update via MQTT

### Firmware (Recursos)
- [x] Consumo de RAM ≤ 40KB (40.4% verificado)
- [x] Consumo de flash ≤ 512KB (34.4% verificado)
- [x] Watchdog hardware + software
- [x] Reconexión WiFi ≤ 60s con backoff progresivo
- [x] Al menos 2 redes WiFi configurables
- [x] EEPROM contador de reboots para modo SAFE

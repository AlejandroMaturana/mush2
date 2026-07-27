# DDD-002: Bounded Contexts - Mush2

---

## Metadatos

| Campo | Valor |
|-------|-------|
| **ID** | DDD-002 |
| **Nombre** | Contextos Limitados de Mush2 |
| **Fecha** | 2026-07-14 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Depende de** | DDD-001 |

---

## 1. Resumen

Los **Bounded Contexts** definen fronteras semánticas donde un término del dominio tiene un significado preciso y consistente. Dentro de un contexto, el lenguaje es claro y sin ambigüedad. Entre contextos, la comunicación se realiza mediante **Eventos de Dominio** y **Referencias de Identidad**.

Este documento detalla los 4 contextos identificados en Mush2, sus responsabilidades, entidades, dependencias y reglas de integración.

---

## 2. Mapa de Contextos

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            MUSH2                                        │
│              Plataforma IoT de Cultivo Micológico Inteligente                   │
├───────────────────┬───────────────────┬───────────────────┬─────────────────────┤
│                   │                   │                   │                     │
│    CULTIVO        │    MONITOREO      │    CONTROL        │    USUARIOS         │
│    (Cultivation)  │    (Monitoring)   │    (Control)      │    (Identity)       │
│                   │                   │                   │                     │
│  Gestión de       │  Recolección y    │  Automatización   │  Identidad y        │
│  ciclos de        │  análisis de      │  en tiempo real   │  autorización       │
│  crecimiento      │  datos            │                   │                     │
│                   │                   │                   │                     │
│  Recetas y        │  Alertas y        │  Actuadores       │  Suscripciones      │
│  perfiles         │  notificaciones   │  y comandos       │  y RBAC             │
│                   │                   │                   │                     │
│  Especies y       │  Salud del        │  Lógica de        │  Multi-tenant       │
│  fases            │  hardware         │  control          │  y configuración    │
│                   │                   │                   │                     │
└───────────────────┴───────────────────┴───────────────────┴─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Persist. │   │ Externos │   │ Firmware │
        │PostgreSQL│   │ Telegram │   │ ESP32-S3 │
        │          │   │ ThingSpk │   │ FreeRTOS │
        │          │   │ Gemini   │   │          │
        └──────────┘   └──────────┘   └──────────┘
```

---

## 3. Contexto: Cultivo (Cultivation)

### 3.1 Responsabilidad

Gestionar el **ciclo de vida completo** de los cultivos micológicos:
- Planificación de ciclos
- Ejecución de fases según recetas
- Transiciones de fase con workflow de aprobación
- Registro de historial y bioactivos

### 3.2 Lenguaje del Contexto

| Término | Definición en Este Contexto |
|---------|----------------------------|
| **Cultivo** | Unidad de trabajo que representa el crecimiento completo de hongos desde inoculación hasta cosecha |
| **Ciclo** | Sinónimo de Cultivo, enfatiza la naturaleza temporal |
| **Fase** | Etapa del ciclo con parámetros climáticos específicos |
| **Receta** | Perfil climático reutilizable con umbrales por fase |
| **Especie** | Perfil micológico que define reglas de transición |
| **Transición** | Cambio de una fase a otra con registro completo |
| **Aprobación** | Workflow de validación para transiciones SEMI_AUTO |
| **Flush** | Cosecha parcial dentro de un ciclo de Mantenimiento |
| **Adaptación** | Modo de control: MANUAL, SEMI_AUTO, FULL_AUTO |

### 3.3 Entidades del Contexto

#### Raíces de Agregado

| Entidad | Identidad | Descripción |
|---------|-----------|-------------|
| **CultivationCycle** | `id: number` | Ciclo de cultivo con estado y fase actual |
| **Recipe** | `id: number` | Perfil climático reutilizable |
| **SpeciesProfile** | `id: number` | Conocimiento micológico de cada especie |

#### Entidades Internas

| Entidad | Perteneciente a | Descripción |
|---------|-----------------|-------------|
| **PhaseTransition** | CultivationCycle | Registro de cambio de fase |
| **CycleState** | CultivationCycle | Snapshot periódico del estado |
| **BioactiveProfile** | CultivationCycle | Análisis de compuestos bioactivos |

#### Value Objects

| Value Object | Uso |
|--------------|-----|
| **CultivationPhase** | INCUBATION, FRUITING, MAINTENANCE, COMPLETED |
| **CycleStatus** | PLANNED, ACTIVE, COMPLETED, ABORTED |
| **AdaptationConfig** | Modo de adaptación y configuración |
| **PhaseThreshold** | Umbrales climáticos por fase |
| **TriggerType** | TIME, SENSOR, MANUAL, SENSOR_SUGGESTED |
| **TransitionStatus** | PENDING, APPROVED, EXECUTED, REJECTED |

### 3.4 Operaciones del Contexto

| Operación | Descripción | Invariantes |
|-----------|-------------|-------------|
| **CrearCiclo** | Planifica un nuevo ciclo de cultivo | Debe tener receta válida, solo un ACTIVE por dispositivo |
| **IniciarCiclo** | Cambia estado a ACTIVE, inicia fase INCUBATION | Sensores deben estar calibrados |
| **TransicionarFase** | Cambia de fase según reglas | Debe seguir secuencia, requiere aprobación en SEMI_AUTO |
| **CompletarCiclo** | Marca ciclo como COMPLETED | Solo desde MAINTENANCE |
| **AbortarCiclo** | Termina ciclo prematuramente | Puede ser por alarma CRITICAL o manual |
| **AplicarReceta** | Asigna receta al ciclo | Receta debe existir y ser válida |
| **RegistrarBioactivo** | Registra análisis de compuestos | Solo en ciclos COMPLETED o ACTIVE |

### 3.5 Dependencias

| Tipo | Contexto/Recurso | Qué se consume |
|------|------------------|----------------|
| **Entrada** | Monitoreo | Lecturas de sensores para evaluación de transiciones |
| **Entrada** | Usuarios | Información de permisos y suscripción |
| **Salida** | Control | Comandos de transición de fase |
| **Salida** | EventBus | Eventos: CultivoIniciado, FaseCambiada, etc. |
| **Persistencia** | PostgreSQL | cultivation_cycles, recipes, species_profiles, phase_transitions, cycle_states |

### 3.6 Reglas de Consistencia

1. **Un ciclo activo por dispositivo**: No pueden existir dos ciclos con estado ACTIVE para el mismo deviceId
2. **Secuencia de fases**: INCUBATION → FRUITING → MAINTENANCE → COMPLETED (no se puede saltar)
3. **Receta obligatoria**: Todo ciclo debe tener una receta válida desde su creación
4. **Inmutabilidad post-finalización**: Un ciclo COMPLETED o ABORTED no puede modificarse
5. **Aprobación requerida**: En modo SEMI_AUTO, las transiciones requieren aprobación humana

---

## 4. Contexto: Monitoreo (Monitoring)

### 4.1 Responsabilidad

Recopilar, almacenar y analizar **datos de telemetría y estado del hardware** en tiempo real:
- Recepción de lecturas de sensores
- Gestión de alarmas por condiciones anormales
- Monitoreo de salud del hardware
- Auditoría de acciones del sistema

### 4.2 Lenguaje del Contexto

| Término | Definición en Este Contexto |
|---------|----------------------------|
| **Telemetría** | Registro temporal de lectura de sensor con valor, unidad y timestamp |
| **Alarma** | Notificación de condición anormal con severidad calculada |
| **Severidad** | Nivel de urgencia: LOW, MEDIUM, HIGH, CRITICAL |
| **Salud** | Métricas del hardware: memoria, uptime, estado I2C |
| **Desconexión** | Pérdida de comunicación con sensor o dispositivo |
| **Deduplicación** | Regla: una sola alarma activa por combinación (device, type, sensor) |
| **Resolución** | Acción que marca alarma como atendida cuando condición normaliza |
| **Retención** | Política de purga de datos según plan de suscripción |

### 4.3 Entidades del Contexto

#### Raíces de Agregado

| Entidad | Identidad | Descripción |
|---------|-----------|-------------|
| **Sensor** | `id: number` | Dispositivo de medición con tipo y estado |
| **Telemetry** | `id: number` | Registro temporal de lectura |
| **Alarm** | `id: number` | Notificación de condición anormal |
| **DeviceHealth** | `id: number` | Métricas de salud del ESP32 |
| **AuditLog** | `id: number` | Registro de acciones del sistema |

#### Entidades Internas

| Entidad | Perteneciente a | Descripción |
|---------|-----------------|-------------|
| **Event** | Device | Evento del sistema (ACTUATOR_CHANGE, STATE_TRANSITION, etc.) |

#### Value Objects

| Value Object | Uso |
|--------------|-----|
| **SensorType** | TEMPERATURE, HUMIDITY, CO2, VOC |
| **SensorStatus** | ACTIVE, INACTIVE, FAULT |
| **AlarmType** | SENSOR_FAULT, OUT_OF_RANGE, DISCONNECTED, SYSTEM_ERROR, THRESHOLD_CROSSED |
| **AlarmSeverity** | LOW, MEDIUM, HIGH, CRITICAL |
| **DeviceStatus** | ONLINE, OFFLINE, MAINTENANCE, ERROR |

### 4.4 Operaciones del Contexto

| Operación | Descripción | Invariantes |
|-----------|-------------|-------------|
| **RegistrarTelemetría** | Almacena lectura de sensor | Debe tener deviceId y sensorType válidos |
| **GenerarAlarma** | Crea alarma por condición anormal | Solo una activa por (device, type, sensor) |
| **ReconocerAlarma** | Marca alarma como vista por operador | Solo puede ser recognition por usuario válido |
| **ResolverAlarma** | Marca alarma como resuelta | Condición debe haber normalizado |
| **RegistrarSalud** | Almacena métricas de salud del ESP32 | Asociado a dispositivo existente |
| **RegistrarEvento** | Almacena evento del sistema | Tipo debe ser válido |
| **PurgarDatos** | Elimina datos según política de retención | Respeta límites de plan |

### 4.5 Dependencias

| Tipo | Contexto/Recurso | Qué se consume |
|------|------------------|----------------|
| **Entrada** | Control | Comandos ejecutados, estado de actuadores |
| **Entrada** | Firmware | Telemetría vía MQTT, salud vía MQTT |
| **Salida** | Cultivo | Datos de sensores para evaluación de transiciones |
| **Salida** | Usuarios | Notificaciones via Telegram |
| **Salida** | Frontend | Actualizaciones via SSE |
| **Persistencia** | PostgreSQL | sensors, telemetry, alarms, device_health, events, audit_logs |

### 4.6 Reglas de Consistencia

1. **Deduplicación de alarmas**: Solo una alarma activa por combinación (deviceId, type, sensorType)
2. **Severidad calculada**: La severidad se calcula desde la desviación, no se asigna manualmente
3. **Resolución automática**: Cuando la condición normaliza, la alarma se resuelve automáticamente
4. **Retención escalonada**: FREE=30d, BASIC=90d, PREMIUM=365d
5. **Auditoría inmutable**: Los registros de auditoría no se modifican ni eliminan

---

## 5. Contexto: Control

### 5.1 Responsabilidad

Ejecutar la **lógica de automatización** que mantiene las condiciones óptimas para el cultivo:
- Evaluar el estado actual cada 60 segundos
- Computar comandos para actuadores
- Gestionar transiciones de fase automáticas
- Implementar protecciones de seguridad (fail-safe)

### 5.2 Lenguaje del Contexto

| Término | Definición en Este Contexto |
|---------|----------------------------|
| **Motor de Control** | Sistema que evalúa y ejecuta el ciclo de control |
| **Evaluar** | Proceso de análisis de sensores vs umbrales |
| **Computar** | Generación de comandos para actuadores |
| **Actuador** | Dispositivo de salida (SSR) que controla equipo físico |
| **Canal** | Salida específica del actuador (0-3) |
| **Modo** | LOCAL (manual) o REMOTE (automático) |
| **Override** | Cambio temporal a modo LOCAL (5 minutos) |
| **Histéresis** | Margen de tolerancia para evitar oscilaciones |
| **Fail-Safe** | Protección por temperatura crítica (≥32°C) |
| **Sustain** | Condición que debe mantenerse por tiempo mínimo |
| **Trigger** | Evento que inicia una transición de fase |

### 5.3 Entidades del Contexto

#### Raíces de Agregado

| Entidad | Identidad | Descripción |
|---------|-----------|-------------|
| **Actuator** | `id: number` | Dispositivo de salida con estado y modo |
| **Event** | `id: number` | Registro de cambios de estado del sistema |

#### Entidades Internas

| Entidad | Perteneciente a | Descripción |
|---------|-----------------|-------------|
| **ActuatorState** | Actuator (in-memory) | Estado actual: ventOn, heatOn, humidOn, overheat |
| **SensorHistory** | PhaseEvaluator (in-memory) | Historial de lecturas para sustain condition |

#### Value Objects

| Value Object | Uso |
|--------------|-----|
| **ActuatorState** | ON, OFF |
| **ActuatorMode** | LOCAL, REMOTE |
| **ChannelType** | VENTILATION, HEATING, HUMIDIFICATION, LIGHT |
| **Command** | deviceId, channel, state, mode |
| **Deviation** | value, min, max, severity |

### 5.4 Operaciones del Contexto

| Operación | Descripción | Frecuencia |
|-----------|-------------|------------|
| **EvaluarCiclo** | Análisis completo de sensores vs receta activa | Cada 60 segundos |
| **ComputarComandos** | Genera órdenes para actuadores según histéresis | Dentro de EvaluarCiclo |
| **EvaluarTransicionFase** | Verifica si se debe cambiar de fase | Dentro de EvaluarCiclo |
| **EjecutarTransicionFase** | Cambia la fase del ciclo | Cuando se evalúa transición |
| **ActivarFailSafe** | Protección por temperatura crítica | Cuando temp ≥ 32°C |
| **OverrideManual** | Cambia actuador a modo LOCAL por 5 min | Bajo demanda del usuario |
| **RegistrarComando** | Guarda comando enviado en AuditLog | Después de cada comando |

### 5.5 Dependencias

| Tipo | Contexto/Recurso | Qué se consume |
|------|------------------|----------------|
| **Entrada** | Monitoreo | Lecturas de sensores en tiempo real |
| **Entrada** | Cultivo | Receta activa, fase actual, modo de adaptación |
| **Salida** | Firmware | Comandos vía MQTT |
| **Salida** | Monitoreo | Eventos: ComandoActuadorEnviado, CicloControlEjecutado |
| **Salida** | Usuarios | Notificaciones via Telegram (fail-safe, transiciones) |
| **Estado in-memory** | — | actuatorState (se pierde en reinicio) |

### 5.6 Reglas de Consistencia

1. **Evaluar cada 60s**: El ciclo de control se ejecuta periódicamente, no bajo demanda
2. **Fail-Safe obligatorio**: Si temp ≥ 32°C, ventilación ON y calefacción OFF sin excepción
3. **Histéresis de ±1.0°C**: Evita oscilaciones encendido/apagado
4. **Bloqueo de humidificador**: No se activa humidificador durante ventilación
5. **Override temporal**: El override manual dura máximo 5 minutos
6. **State in-memory**: El estado de actuadores se pierde en reinicio (se reconstruye desde DB)

---

## 6. Contexto: Usuarios (Identity)

### 6.1 Responsabilidad

Gestionar **identidad, autorización, suscripciones y configuración** de usuarios:
- Autenticación y autorización
- Control de acceso por cámara (multi-tenant)
- Gestión de suscripciones y límites
- Configuración de integraciones (Telegram, API keys)

### 6.2 Lenguaje del Contexto

| Término | Definición en Este Contexto |
|---------|----------------------------|
| **Usuario** | Cuenta con email, password hasheado y rol de sistema |
| **Rol de Sistema** | Nivel de permiso global: SUPER_ADMIN, ADMIN, OPERATOR, VIEWER |
| **Rol de Cámara** | Acceso por cámara: OWNER, EDITOR, VIEWER |
| **Suscripción** | Plan SaaS que define límites de uso |
| **Plan** | FREE, BASIC, PREMIUM con diferentes límites |
| **API Key** | Clave de acceso para integraciones externas |
| **Token** | JWT de autenticación con expiration |
| **Acceso** | Matriz de permisos por cámara/dispositivo |
| **Soft Delete** | Eliminación lógica que preserva datos |

### 6.3 Entidades del Contexto

#### Raíces de Agregado

| Entidad | Identidad | Descripción |
|---------|-----------|-------------|
| **User** | `id: UUID` | Cuenta de usuario con rol y preferencias |

#### Entidades Internas

| Entidad | Perteneciente a | Descripción |
|---------|-----------------|-------------|
| **ApiKey** | User | Clave de acceso con hash y permisos |
| **UserPreference** | User | Configuración UI y notificaciones |
| **UserChamberAccess** | User | Permisos por cámara |
| **Subscription** | User | Plan y límites de uso |

#### Value Objects

| Value Object | Uso |
|--------------|-----|
| **SystemRole** | SUPER_ADMIN (100), ADMIN (80), OPERATOR (50), VIEWER (10) |
| **ChamberAccessRole** | OWNER, EDITOR, VIEWER |
| **PlanType** | FREE, BASIC, PREMIUM |
| **EmailAddress** | Email válido con formato estándar |
| **JWTToken** | Token con payload y firma |
| **ApiKeyHash** | Hash SHA-256 de la API key |

### 6.4 Operaciones del Contexto

| Operación | Descripción | Invariantes |
|-----------|-------------|-------------|
| **RegistrarUsuario** | Crea nueva cuenta | Email único, role válido |
| **Autenticar** | Valida credenciales y genera JWT | Usuario activo, password correcto |
| **RefrescarToken** | Renueva JWT sin re-autenticar | Token debe ser válido |
| **AsignarRol** | Cambia rol de sistema | Solo SUPER_ADMIN puede asignar |
| **GestionarAcceso** | Asigna permisos por cámara | OWNER puede asignar EDITOR/VIEWER |
| **CrearAPIKey** | Genera nueva clave de integración | Permisos y IP whitelist válidos |
| **RotarAPIKey** | Reemplaza clave existente | Clave anterior se invalida |
| **CambiarPlan** | Actualiza suscripción | Respetar límites del plan |
| **EliminarUsuario** | Soft delete | PRESERVA datos, marca deletedAt |

### 6.5 Dependencias

| Tipo | Contexto/Recurso | Qué se consume |
|------|------------------|----------------|
| **Salida** | Todos los contextos | Consulta de permisos y roles |
| **Persistencia** | PostgreSQL | users, subscriptions, api_keys, user_chamber_access, user_preferences |

### 6.6 Reglas de Consistencia

1. **Email único**: No pueden existir dos usuarios con el mismo email
2. **Soft delete**: La eliminación es lógica (deletedAt), preserva integridad referencial
3. **SUPER_ADMIN inmutable**: Un SUPER_ADMIN no puede ser desactivado por otro usuario
4. **Límites de API**: FREE=1000, BASIC=10000, PREMIUM=100000 llamadas/mes
5. **Retención de datos**: FREE=30d, BASIC=90d, PREMIUM=365d
6. **RBAC jerárquico**: SUPER_ADMIN > ADMIN > OPERATOR > VIEWER

---

## 7. Integración entre Contextos

### 7.1 Patrones de Comunicación

| Patrón | Uso | Ejemplo |
|--------|-----|---------|
| **Eventos de Dominio** | Comunicación asincrónica entre contextos | Cultivo publica `FaseCambiada`, Control y Monitoreo suscriben |
| **Referencias de Identidad** | Un contexto referencia entidades de otro por ID | Cultivo referencia Device por `deviceId` |
| **Consulta directa** | Un contexto consulta datos de otro vía API interna | Control consulta Receta activa de Cultivo |
| **Shared Kernel** | Value Objects compartidos entre contextos | Temperature, Humidity, SensorType |

### 7.2 Diagrama de Dependencias

```
                        ┌─────────────┐
                        │  USUARIOS   │
                        │  (Base)     │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │   CULTIVO   │  │  MONITOREO  │  │   CONTROL   │
       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   EventBus          │
                    │   (Comunicación)    │
                    └─────────────────────┘
```

### 7.3 Flujo: Transición Automática de Fase

```
1. Control (cada 60s)
   │
   ├─[1]─> Consulta Cultivo: obtenerRecetaActiva(cycleId)
   │
   ├─[2]─> Consulta Monitoreo: obtenerLecturasActuales(deviceId)
   │
   ├─[3]─> PhaseEvaluator.evaluar(cycle, readings, recipe)
   │       │
   │       └─[3a]─> Si transición sugerida (SEMI_AUTO):
   │                 Publica: TransicionFaseSugerida
   │
   └─[4]─> Si transición ejecutable (FULL_AUTO):
           │
           ├─[4a]─> Cultivo: ejecutarTransicionFase(cycleId, toPhase)
           │
           └─[4b]─> Publica: FaseCambiada
                    │
                    ├─> Monitoreo: registra evento
                    ├─> Usuarios: notifica via Telegram
                    └─> Frontend: actualiza via SSE
```

### 7.4 Flujo: Generación de Alarma

```
1. Firmware (MQTT)
   │
   ├─[1]─> Monitoreo: recibirTelemetría(deviceId, sensorType, value)
   │
   ├─[2]─> Evaluar umbrales (en ControlEngine o Monitoreo)
   │       │
   │       └─[2a]─> Si fuera de rango:
   │                 Monitoreo: generarAlarma(deviceId, type, sensorType, severity)
   │
   ├─[3]─> Publica: AlarmaGenerada
   │       │
   │       ├─> Usuarios: notifica via Telegram
   │       └─> Frontend: actualiza via SSE
   │
   └─[4]─> Si CRITICAL:
           │
           └─[4a]─> Control: activarFailSafe(deviceId)
```

---

## 8. Contextos y Persistencia

### 8.1 Mapeo de Entidades a Tablas

| Contexto | Entidad | Tabla PostgreSQL |
|----------|---------|------------------|
| **Cultivo** | CultivationCycle | `cultivation_cycles` |
| **Cultivo** | Recipe | `recipes` |
| **Cultivo** | SpeciesProfile | `species_profiles` |
| **Cultivo** | PhaseTransition | `phase_transitions` |
| **Cultivo** | CycleState | `cycle_states` |
| **Cultivo** | BioactiveProfile | `bioactive_profiles` |
| **Monitoreo** | Sensor | `sensors` |
| **Monitoreo** | Telemetry | `telemetry` |
| **Monitoreo** | Alarm | `alarms` |
| **Monitoreo** | DeviceHealth | `device_health` |
| **Monitoreo** | Event | `events` |
| **Monitoreo** | AuditLog | `audit_logs` |
| **Control** | Actuator | `actuators` |
| **Control** | — (in-memory) | — |
| **Usuarios** | User | `users` |
| **Usuarios** | Subscription | `subscriptions` |
| **Usuarios** | ApiKey | `api_keys` |
| **Usuarios** | UserChamberAccess | `user_chamber_access` |
| **Usuarios** | UserPreference | `user_preferences` |
| **Usuarios** | SystemSetting | `system_settings` |
| **Hardware** | Device | `devices` |
| **Hardware** | TelegramDeviceConfig | `telegram_device_configs` |
| **Hardware** | IntegrationCredentials | `integration_credentials` |
| **Hardware** | DeviceMaintenance | `device_maintenance` |

### 8.2 Separación de Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE DOMINIO                          │
│  (Entidades, Value Objects, Eventos, Reglas de Negocio)    │
├─────────────────────────────────────────────────────────────┤
│                    CAPA DE APLICACIÓN                       │
│  (Servicios de Aplicación, Orquestación, DTOs)             │
├─────────────────────────────────────────────────────────────┤
│                    CAPA DE INFRAESTRUCTURA                  │
│  (Repositorios, MQTT, SSE, Telegram, ThingSpeak)     │
├─────────────────────────────────────────────────────────────┤
│                    CAPA DE PERSISTENCIA                     │
│  (Sequelize ORM, Migraciones, Seeds)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Consideraciones de Implementación

### 9.1 Shared Kernel

Los siguientes Value Objects son compartidos entre contextos y deben definirse una sola vez:

- `Temperature`, `Humidity`, `CO2Level`, `VOCLevel`, `VPD`
- `SensorType`, `DeviceStatus`, `AlarmSeverity`
- `CultivationPhase`, `CycleStatus`
- `UUID`, `EmailAddress`

### 9.2 Anti-Corruption Layers

Los contextos que se comunican con sistemas externos deben tener Anti-Corruption Layers:

- **Monitoreo**: MQTT Bridge (traduce protocolo MQTT a eventos internos)
- **Usuarios**: Telegram Service (traduce API de Telegram a eventos internos)
- **Monitoreo**: ThingSpeak Sync (traduce datos internos a formato ThingSpeak)

### 9.3 Eventual Consistency

La comunicación entre contextos vía eventos es **eventualmente consistente**:
- Los eventos se procesan asincrónicamente
- No hay transacciones distribuidas
- Cada contexto mantiene su propia consistencia interna
- Los eventos deben ser idempotentes

---

## 10. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-07-14 | Equipo Mush2 | Creación del documento |

---

*Documento generado como parte del proceso de Domain-Driven Design de Mush2.*

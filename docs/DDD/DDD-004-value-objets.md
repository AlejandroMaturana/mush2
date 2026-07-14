# DDD-004: Value Objects - Mush2 LabTech

---

## Metadatos

| Campo | Valor |
|-------|-------|
| **ID** | DDD-004 |
| **Nombre** | Objetos de Valor de Mush2 LabTech |
| **Fecha** | 2026-07-14 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Depende de** | DDD-001, DDD-003 |

---

## 1. Resumen

Los **Value Objects** son objetos inmutables que se identifican por su valor, no por identidad. No tienen ciclo de vida y se reemplazan completamente cuando cambian. Este documento cataloga todos los Value Objects identificados en el dominio de Mush2 LabTech.

---

## 2. Propiedades Fundamentales

### 2.1 Características de un Value Object

| Propiedad | Descripción |
|-----------|-------------|
| **Inmutabilidad** | Una vez creado, no puede modificarse |
| **Sin identidad** | Dos Value Objects con los mismos valores son equivalentes |
| **Auto-contenido** | Contiene toda su información sin referencias externas |
| **Reemplazable** | Se crea uno nuevo en lugar de modificar el existente |
| **Validación** | Garantiza invariantes en su creación |

### 2.2 Patrón de Implementación

```javascript
// Ejemplo de patrón Value Object
class Temperature {
  constructor(value, unit = 'C') {
    if (value < -40 || value > 85) {
      throw new Error('Temperature out of range');
    }
    this.value = Object.freeze(value);
    this.unit = Object.freeze(unit);
  }
  
  equals(other) {
    return this.value === other.value && this.unit === other.unit;
  }
  
  toString() {
    return `${this.value}°${this.unit}`;
  }
}
```

---

## 3. Value Objects de Dominio

### 3.1 Temperature

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `value` | number | Valor numérico de temperatura |
| `unit` | 'C' \| 'F' | Unidad de medida |

**Reglas**:
- Rango válido: -40°C a 85°C
- Conversión automática entre C y F
- Comparaciones siempre en la misma unidad

**Uso en el dominio**:
- SetPoint de temperatura en Recipes
- Lecturas de sensores
- Umbrales de alarma
- Configuración de fail-safe (32°C)

### 3.2 Humidity

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `percentage` | number | Porcentaje de humedad relativa |

**Reglas**:
- Rango válido: 0% a 100%
- Precisión: 1 decimal

**Uso en el dominio**:
- SetPoint de humedad en Recipes
- Lecturas de sensores
- Umbrales de alarma
- Cálculo de VPD

### 3.3 CO2Level

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `ppm` | number | Concentración en partes por millón |

**Reglas**:
- Mínimo: 400ppm (aire ambiente)
- Máximo: 5000ppm (límite seguro)

**Uso en el dominio**:
- Umbrales de transición de fase
- Configuración de ventilación
- Lecturas de sensores

### 3.4 VOCLevel

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `ppb` | number | Concentración en partes por billón |

**Reglas**:
- Mínimo: 0ppb
- Máximo: 5000ppb

**Uso en el dominio**:
- Calidad de aire
- Lecturas de sensores

### 3.5 VPD (Vapor Pressure Deficit)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `value` | number | Déficit de presión de vapor en kPa |

**Reglas**:
- Rango óptimo: 0.4 - 1.2 kPa
- Calculado desde temperatura y humedad

**Fórmula de cálculo**:
```javascript
function calculateVPD(temperature, humidity) {
  const svp = 0.6108 * Math.exp(17.27 * temperature / (temperature + 237.3));
  const vpd = (1 - humidity / 100) * svp;
  return vpd;
}
```

**Uso en el dominio**:
- Indicador de estrés hídrico
- Métrica en CycleState
- Evaluación de calidad de ambiente

### 3.6 SetPoint

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `min` | Temperature \| Humidity | Valor mínimo del rango |
| `max` | Temperature \| Humidity | Valor máximo del rango |

**Reglas**:
- min < max siempre
- Tipo homogéneo (Temperature o Humidity)

**Uso en el dominio**:
- Configuración de Recipes por fase
- Umbrales de alarma

### 3.7 PhaseThreshold

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `temp` | SetPoint | Rango de temperatura |
| `hum` | SetPoint | Rango de humedad |
| `co2` | CO2Level | Nivel máximo de CO2 |
| `durationDays` | Duration | Duración de la fase |

**Reglas**:
- Todos los campos son requeridos
- Valores coherentes entre sí

**Uso en el dominio**:
- Definición de Recipes por fase (Incubation, Fruiting, Maintenance)

### 3.8 Duration

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `days` | number | Número de días |

**Reglas**:
- Debe ser positivo
- No puede ser nulo cuando esté definido

**Uso en el dominio**:
- Duración de fases en Recipes
- Evaluación de transiciones por tiempo

---

## 4. Value Objects de Identidad

### 4.1 UUID

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `value` | string | Identificador único universal (v4) |

**Reglas**:
- Formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
- Generado automáticamente

**Uso en el dominio**:
- IDs de usuarios
- Referencias a usuarios en otros agregados

### 4.2 MACAddress

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `value` | string | Dirección MAC del dispositivo |

**Reglas**:
- Formato: XX:XX:XX:XX:XX:XX
- Único en el sistema

**Uso en el dominio**:
- Identificación de dispositivos IoT

### 4.3 FirmwareVersion

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `major` | number | Versión mayor |
| `minor` | number | Versión menor |
| `patch` | number | Parche |

**Reglas**:
- Semántica de versiones (major.minor.patch)
- Comparación semántica

**Uso en el dominio**:
- Versión de firmware del dispositivo
- Compatibilidad OTA

---

## 5. Value Objects de Enumeración

### 5.1 CultivationPhase

| Valor | Descripción |
|-------|-------------|
| `INCUBATION` | Fase de colonización del micelio |
| `FRUITING` | Fase de aparición de cuerpos fructificantes |
| `MAINTENANCE` | Fase de producción sostenida |
| `COMPLETED` | Ciclo finalizado |

**Reglas**:
- Secuencia obligatoria: INCUBATION → FRUITING → MAINTENANCE → COMPLETED
- No se puede saltar fases

### 5.2 CycleStatus

| Valor | Descripción |
|-------|-------------|
| `PLANNED` | Ciclo planificado, no iniciado |
| `ACTIVE` | Ciclo en ejecución |
| `COMPLETED` | Ciclo finalizado exitosamente |
| `ABORTED` | Ciclo terminado prematuramente |

**Reglas**:
- Solo un ciclo ACTIVE por dispositivo
- COMPLETED y ABORTED son estados finales (inmutables)

### 5.3 DeviceStatus

| Valor | Descripción |
|-------|-------------|
| `ONLINE` | Dispositivo conectado y operando |
| `OFFLINE` | Dispositivo desconectado |
| `MAINTENANCE` | En mantenimiento o actualización |
| `ERROR` | Error que requiere intervención |

**Reglas**:
- Transiciones válidas: OFFLINE ↔ ONLINE ↔ ERROR/MAINTENANCE
- ERROR no ejecuta comandos de control

### 5.4 AlarmSeverity

| Valor | Descripción |
|-------|-------------|
| `LOW` | Información, no requiere acción |
| `MEDIUM` | Requiere atención en breve |
| `HIGH` | Requiere atención urgente |
| `CRITICAL` | Requiere acción inmediata |

**Reglas**:
- Calculada desde desviación, no asignada manualmente
- CRITICAL requiere ADMIN para resolver

### 5.5 AlarmType

| Valor | Descripción |
|-------|-------------|
| `SENSOR_FAULT` | Sensor con malfunction |
| `OUT_OF_RANGE` | Valor fuera de rango permitido |
| `DISCONNECTED` | Sensor o dispositivo desconectado |
| `SYSTEM_ERROR` | Error del sistema |
| `THRESHOLD_CROSSED` | Umbral cruzado |

### 5.6 SensorType

| Valor | Descripción |
|-------|-------------|
| `TEMPERATURE` | Sensor de temperatura |
| `HUMIDITY` | Sensor de humedad |
| `CO2` | Sensor de dióxido de carbono |
| `VOC` | Sensor de compuestos orgánicos volátiles |

### 5.7 SensorStatus

| Valor | Descripción |
|-------|-------------|
| `ACTIVE` | Sensor funcionando correctamente |
| `INACTIVE` | Sensor deshabilitado |
| `FAULT` | Sensor con fallo |

---

## 6. Value Objects de Configuración

### 6.1 AdaptationConfig

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `mode` | 'MANUAL' \| 'SEMI_AUTO' \| 'FULL_AUTO' | Modo de adaptación |
| `sensorBasedTrigger` | boolean | Usar sensores para triggers |

**Modos**:
- **MANUAL**: Sin automación, solo monitoreo
- **SEMI_AUTO**: Sugiere transiciones, espera aprobación
- **FULL_AUTO**: Ejecuta transiciones automáticamente

### 6.2 VentilationStrategy

| Valor | Descripción |
|-------|-------------|
| `TIMER` | Ventilación por temporizador |
| `CO2_TRIGGER` | Ventilación por nivel de CO2 |
| `HYBRID` | Combinación de timer y CO2 |

### 6.3 FaeLevel (Fresh Air Exchange)

| Valor | Descripción |
|-------|-------------|
| `LOW` | Intercambio de aire bajo |
| `MEDIUM` | Intercambio de aire medio |
| `HIGH` | Intercambio de aire alto |

### 6.4 TriggerType

| Valor | Descripción |
|-------|-------------|
| `TIME` | Transición por tiempo máximo |
| `SENSOR` | Transición por condición de sensor |
| `MANUAL` | Transición manual del operador |
| `SENSOR_SUGGESTED` | Sugerencia de IA basada en sensores |

### 6.5 TransitionStatus

| Valor | Descripción |
|-------|-------------|
| `PENDING` | Esperando aprobación |
| `APPROVED` | Aprobada, lista para ejecutar |
| `EXECUTED` | Ejecutada, fase cambiada |
| `REJECTED` | Rechazada por el supervisor |

---

## 7. Value Objects de Seguridad

### 7.1 SystemRole

| Valor | Nivel | Descripción |
|-------|-------|-------------|
| `SUPER_ADMIN` | 100 | Acceso total al sistema |
| `ADMIN` | 80 | Gestión de usuarios y configuración |
| `OPERATOR` | 50 | Operación de cultivos |
| `VIEWER` | 10 | Solo lectura |

**Reglas**:
- Jerarquía: SUPER_ADMIN > ADMIN > OPERATOR > VIEWER
- SUPER_ADMIN no puede ser desactivado

### 7.2 ChamberAccessRole

| Valor | Descripción |
|-------|-------------|
| `OWNER` | Propietario de la cámara |
| `EDITOR` | Puede editar configuración |
| `VIEWER` | Solo lectura |

### 7.3 PlanType

| Valor | Límite API | Retención |
|-------|-----------|-----------|
| `FREE` | 1,000/mes | 30 días |
| `BASIC` | 10,000/mes | 90 días |
| `PREMIUM` | 100,000/mes | 365 días |

---

## 8. Value Objects de Presentación

### 8.1 EmailAddress

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `value` | string | Email válido |

**Reglas**:
- Formato estándar de email
- Único en el sistema
- Case-insensitive

### 8.2 PasswordHash

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `hash` | string | Hash bcrypt de la contraseña |

**Reglas**:
- Generado con bcrypt (10 rounds)
- Nunca almacena texto plano

### 8.3 ApiKeyHash

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `hash` | string | Hash SHA-256 de la API key |

**Reglas**:
- Generado con SHA-256
- La key original no se almacena

---

## 9. Shared Kernel: Value Objects Compartidos

Los siguientes Value Objects son compartidos entre múltiples contextos y deben definirse una sola vez:

| Value Object | Contextos que lo usan |
|--------------|----------------------|
| Temperature | Cultivo, Monitoreo, Control |
| Humidity | Cultivo, Monitoreo, Control |
| CO2Level | Cultivo, Monitoreo, Control |
| VOCLevel | Monitoreo, Control |
| VPD | Cultivo, Monitoreo, Control |
| SensorType | Monitoreo, Control |
| DeviceStatus | Monitoreo, Control |
| AlarmSeverity | Monitoreo |
| CultivationPhase | Cultivo, Control |
| CycleStatus | Cultivo |
| UUID | Todos |

---

## 10. Matriz de Value Objects por Agregado

| Agregado | Value Objects |
|----------|---------------|
| **CultivationCycle** | CultivationPhase, CycleStatus, AdaptationConfig, TriggerType, TransitionStatus |
| **Recipe** | PhaseThreshold, Temperature, Humidity, CO2Level, Duration, VentilationStrategy, FaeLevel |
| **SpeciesProfile** | AdapterClass, DifficultyLevel |
| **Device** | DeviceStatus, MACAddress, FirmwareVersion, SensorType, SensorStatus, ActuatorState, ActuatorMode |
| **Alarm** | AlarmType, AlarmSeverity, SensorType |
| **User** | SystemRole, ChamberAccessRole, PlanType, EmailAddress, PasswordHash, ApiKeyHash |

---

## 11. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-07-14 | Equipo Mush2 | Creación del documento |

---

*Documento generado como parte del proceso de Domain-Driven Design de Mush2 LabTech.*

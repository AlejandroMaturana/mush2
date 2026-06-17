# ADR-005: Selección de PostgreSQL + Sequelize ORM como stack de persistencia

**Fecha**: 2026-06-10 (actualizado 2026-06-14)
**Estado**: Aceptado

## Contexto
El sistema requiere una base de datos para almacenar telemetría ambiental histórica (temperatura, humedad, eCO₂, TVOC), registrar eventos de dispositivos, gestionar usuarios, recetas de cultivo, ciclos y configuraciones. El backend está desarrollado en Node.js y se comunica con el firmware vía MQTT.

## Decisión
Usar **PostgreSQL** como motor de base de datos relacional y **Sequelize v6** como ORM para la capa de acceso a datos desde el backend Node.js.

## Motivos

### PostgreSQL
1. **Fiabilidad y madurez**: Cumple ACID estrictamente, esencial para integridad de datos.
2. **Soporte nativo para tipos relevantes**: `TIMESTAMPTZ`, `NUMERIC`, `JSONB`, `ENUM`.
3. **Consultas analíticas**: Funciones de ventana y agregaciones para análisis de tendencias.
4. **Extensibilidad con TimescaleDB**: Migración futura para optimizar series temporales.
5. **Código abierto sin coste de licencia**.

### Sequelize ORM
6. **Abstracción del dialecto SQL**: Reduce errores y vulnerabilidades de inyección SQL.
7. **Sincronización automática de esquema**: El proyecto usa `sync-db.js` en lugar de migraciones CLI.
8. **Validación de modelos integrada**: Tipos, restricciones y asociaciones en código JavaScript.
9. **Promesas y async/await nativos**: Alineado con Node.js moderno.

## Consecuencias
- **PostgreSQL requiere mantenimiento**: Servicio corriendo, backups, configuración de conexiones.
- **Sequelize añade overhead**: Consultas pueden no ser óptimas para grandes volúmenes.
- **Sincronización automática vs migraciones**: El proyecto usa `sequelize.sync()` en lugar de migraciones versionadas.
- **Modelo de datos normalizado**: Telemetría almacenada como filas individuales por sensor (no columnas por variable).

## Alternativas descartadas
- **SQLite**: No soporta concurrencia de escritura eficiente.
- **MongoDB**: Los datos son relacionales y se benefician de SQL.
- **InfluxDB**: Añade complejidad de dos motores de BD.
- **Prisma ORM**: Requiere Node.js >= 16 y generación de código.
- **TypeORM**: Curva de aprendizaje más pronunciada.

## Detalle técnico

### Esquema de base de datos
El sistema usa un modelo normalizado con las siguientes tablas principales:

| Tabla | Propósito |
|-------|-----------|
| `devices` | Dispositivos/nodos ESP8266 |
| `sensors` | Sensores por dispositivo (TEMPERATURE, HUMIDITY, CO2, VOC) |
| `telemetry` | Lecturas de sensores (una fila por lectura por sensor) |
| `actuators` | Estado de actuadores por dispositivo |
| `events` | Eventos del dispositivo (boot, alarmas, acks) |
| `users` | Usuarios del sistema |
| `recipes` | Recetas de cultivo |
| `cultivation_cycles` | Ciclos de cultivo activos |
| `cycle_states` | Estados de cada ciclo |
| `audit_logs` | Auditoría de acciones |
| `user_chamber_access` | Relación usuarios-dispositivos |

### Modelo de telemetría (normalizado)
```javascript
// models/Telemetry.js
{
  id: BIGINT (primaryKey),
  deviceId: INTEGER (FK → devices.id),
  sensorId: INTEGER (FK → sensors.id),
  value: DECIMAL(8,2),
  sensorType: ENUM('TEMPERATURE', 'HUMIDITY', 'CO2', 'VOC'),
  unit: STRING(10),
  timestamp: DATE
}
```

### Relaciones principales
- `Device` → tiene muchos → `Sensor`, `Telemetry`, `Actuator`, `Event`
- `Sensor` → tiene muchos → `Telemetry`
- `Recipe` → tiene muchos → `CultivationCycle`
- `User` ↔ (many-to-many) ↔ `Device` (a través de `UserChamberAccess`)

### Sincronización de esquema
```javascript
// sync-db.js
// Usa sequelize.sync({ alter: true }) en lugar de migraciones CLI
// Permite desarrollo rápido pero menos control que migraciones versionadas
```

### Índices
- `telemetry(deviceId, timestamp)` — consultas por dispositivo y rango temporal
- `telemetry(deviceId, sensorType, timestamp)` — consultas por tipo de sensor

## Referencias
- Implementación: `backend/src/models/`, `backend/src/config/database.js`
- Sincronización: `backend/src/sync-db.js`
- Ver también: ADR-004 (ThingSpeak), ADR-006 (MQTT)
'use strict';
/**
 * Snapshot inicial (I61) — esquema 1:1 con backend/src/models (26 tablas).
 * Generado automaticamente desde los modelos; NO editar a mano.
 * Para una nueva tabla/campo: crear una migracion incremental.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chambers', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "name": { type: Sequelize.STRING(128), allowNull: false },
      "volume": { type: Sequelize.DECIMAL(10, 2) },
      "location": { type: Sequelize.STRING(255) },
      "createdBy": { type: Sequelize.UUID },
      "updatedBy": { type: Sequelize.UUID },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('users', {
      "id": { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      "username": { type: Sequelize.STRING(64), allowNull: false, unique: true },
      "email": { type: Sequelize.STRING(255), allowNull: false, unique: true },
      "passwordHash": { type: Sequelize.STRING(255), allowNull: false },
      "role": { type: Sequelize.ENUM("SUPER_ADMIN", "ADMIN", "OPERATOR", "VIEWER"), allowNull: false, defaultValue: "OPERATOR" },
      "refreshToken": { type: Sequelize.STRING(512) },
      "refreshTokenExpires": { type: Sequelize.DATE },
      "isActive": { type: Sequelize.BOOLEAN, defaultValue: true },
      "lastLoginAt": { type: Sequelize.DATE },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
      "deletedAt": { type: Sequelize.DATE },
    });

    await queryInterface.createTable('species_profiles', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "name": { type: Sequelize.STRING(100), allowNull: false },
      "scientificName": { type: Sequelize.STRING(150), allowNull: false },
      "adapterClass": { type: Sequelize.STRING(100), allowNull: false },
      "originClimate": { type: Sequelize.STRING(100) },
      "difficultyLevel": { type: Sequelize.ENUM("BEGINNER", "INTERMEDIATE", "ADVANCED"), allowNull: false, defaultValue: "BEGINNER" },
      "description": { type: Sequelize.TEXT },
      "shortDescription": { type: Sequelize.TEXT },
      "imageUrl": { type: Sequelize.STRING(500) },
      "generalAttributes": { type: Sequelize.JSONB, defaultValue: {} },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('devices', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "macAddress": { type: Sequelize.STRING(50), unique: true },
      "deviceId": { type: Sequelize.STRING(50), allowNull: false, unique: true },
      "firmwareVersion": { type: Sequelize.STRING(20), defaultValue: "0.0.0" },
      "hwRevision": { type: Sequelize.STRING(10), defaultValue: "" },
      "lifecycle": { type: Sequelize.ENUM("ACTIVE", "MAINTENANCE", "RETIRED"), defaultValue: "ACTIVE" },
      "lastSeen": { type: Sequelize.DATE },
      "lastTelemetryAt": { type: Sequelize.DATE },
      "lastCommandAt": { type: Sequelize.DATE },
      "lastAckAt": { type: Sequelize.DATE },
      "heartbeatInterval": { type: Sequelize.INTEGER, defaultValue: 10 },
      "staleMultiplier": { type: Sequelize.INTEGER, defaultValue: 3 },
      "offlineMultiplier": { type: Sequelize.INTEGER, defaultValue: 6 },
      "maintenanceMode": { type: Sequelize.BOOLEAN, defaultValue: false },
      "userId": { type: Sequelize.UUID },
      "chamberId": { type: Sequelize.INTEGER, references: { model: "chambers", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      "chamberName": { type: Sequelize.STRING(128) },
      "chamberLocation": { type: Sequelize.STRING(255) },
      "ssrActiveLow": { type: Sequelize.BOOLEAN, defaultValue: true },
      "thingSpeakEnabled": { type: Sequelize.BOOLEAN, defaultValue: false },
      "thingSpeakChannelId": { type: Sequelize.STRING(20) },
      "thingSpeakSyncInterval": { type: Sequelize.INTEGER, defaultValue: 300000 },
      "controlMode": { type: Sequelize.ENUM("LOCAL", "REMOTE", "OFF", "AUTO"), defaultValue: "AUTO" },
      "lastFirmwareState": { type: Sequelize.STRING(30) },
      "mqttUser": { type: Sequelize.STRING(50) },
      "mqttPassword": { type: Sequelize.STRING(128) },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('sensors', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "type": { type: Sequelize.ENUM("TEMPERATURE", "HUMIDITY", "CO2", "VOC"), allowNull: false },
      "channel": { type: Sequelize.INTEGER },
      "status": { type: Sequelize.ENUM("ACTIVE", "INACTIVE", "FAULT"), defaultValue: "ACTIVE" },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('telemetry', {
      "id": { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "sensorId": { type: Sequelize.INTEGER, references: { model: "sensors", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "value": { type: Sequelize.DECIMAL(8, 2), allowNull: false },
      "sensorType": { type: Sequelize.ENUM("TEMPERATURE", "HUMIDITY", "CO2", "VOC", "AQI"), allowNull: false },
      "unit": { type: Sequelize.STRING(10) },
      "timestamp": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('events', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "type": { type: Sequelize.ENUM("ACTUATOR_CHANGE", "STATE_TRANSITION", "SYSTEM_BOOT", "FIRMWARE_UPDATE"), allowNull: false },
      "payload": { type: Sequelize.JSONB },
      "timestamp": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('actuators', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "channel": { type: Sequelize.INTEGER, allowNull: false },
      "type": { type: Sequelize.STRING(20), defaultValue: "SSR" },
      "label": { type: Sequelize.STRING(50), defaultValue: "" },
      "state": { type: Sequelize.STRING(10), defaultValue: "OFF" },
      "mode": { type: Sequelize.STRING(10), defaultValue: "LOCAL" },
      "lastCommand": { type: Sequelize.STRING(36) },
      "lastAck": { type: Sequelize.STRING(36) },
      "lastAckAt": { type: Sequelize.DATE },
      "lastSeen": { type: Sequelize.DATE },
      "overrideUntil": { type: Sequelize.DATE },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('recipes', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "userId": { type: Sequelize.UUID },
      "name": { type: Sequelize.STRING(100), allowNull: false },
      "speciesId": { type: Sequelize.INTEGER, references: { model: "species_profiles", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      "species": { type: Sequelize.STRING(100), allowNull: false },
      "incubationTempMin": { type: Sequelize.DECIMAL(5, 2) },
      "incubationTempMax": { type: Sequelize.DECIMAL(5, 2) },
      "incubationHumMin": { type: Sequelize.DECIMAL(5, 2) },
      "incubationHumMax": { type: Sequelize.DECIMAL(5, 2) },
      "incubationCo2Max": { type: Sequelize.INTEGER, defaultValue: 1200 },
      "incubationDurationDays": { type: Sequelize.INTEGER },
      "fruitingTempMin": { type: Sequelize.DECIMAL(5, 2) },
      "fruitingTempMax": { type: Sequelize.DECIMAL(5, 2) },
      "fruitingHumMin": { type: Sequelize.DECIMAL(5, 2) },
      "fruitingHumMax": { type: Sequelize.DECIMAL(5, 2) },
      "fruitingCo2Max": { type: Sequelize.INTEGER, defaultValue: 800 },
      "fruitingDurationDays": { type: Sequelize.INTEGER },
      "maintenanceTempMin": { type: Sequelize.DECIMAL(5, 2) },
      "maintenanceTempMax": { type: Sequelize.DECIMAL(5, 2) },
      "maintenanceHumMin": { type: Sequelize.DECIMAL(5, 2) },
      "maintenanceHumMax": { type: Sequelize.DECIMAL(5, 2) },
      "maintenanceCo2Max": { type: Sequelize.INTEGER, defaultValue: 1000 },
      "faeIntervalMinutes": { type: Sequelize.INTEGER, defaultValue: 60 },
      "ventilationStrategy": { type: Sequelize.ENUM("TIMER", "CO2_TRIGGER", "HYBRID"), defaultValue: "TIMER" },
      "lightCycleHours": { type: Sequelize.INTEGER, defaultValue: 12 },
      "faeLevel": { type: Sequelize.ENUM("LOW", "MEDIUM", "HIGH"), defaultValue: "MEDIUM" },
      "dewPointMaxRH": { type: Sequelize.DECIMAL(5, 2), defaultValue: 95 },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('cultivation_cycles', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "userId": { type: Sequelize.UUID },
      "deviceId": { type: Sequelize.INTEGER, references: { model: "devices", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      "chamberId": { type: Sequelize.INTEGER, references: { model: "chambers", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "recipeId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "recipes", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "species": { type: Sequelize.STRING(100), allowNull: false },
      "strain": { type: Sequelize.STRING(100) },
      "status": { type: Sequelize.ENUM("PLANNED", "ACTIVE", "COMPLETED", "ABORTED"), defaultValue: "PLANNED" },
      "currentPhase": { type: Sequelize.ENUM("INCUBATION", "FRUITING", "MAINTENANCE", "COMPLETED"), defaultValue: "INCUBATION" },
      "startDate": { type: Sequelize.DATEONLY },
      "endDate": { type: Sequelize.DATEONLY },
      "phaseStartedAt": { type: Sequelize.DATE },
      "adaptationConfig": { type: Sequelize.JSONB, defaultValue: {} },
      "notes": { type: Sequelize.TEXT },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('cycle_states', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "cycleId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "cultivation_cycles", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "phase": { type: Sequelize.ENUM("INCUBATION", "FRUITING", "MAINTENANCE") },
      "temperature": { type: Sequelize.DECIMAL(5, 2) },
      "humidity": { type: Sequelize.DECIMAL(5, 2) },
      "co2": { type: Sequelize.INTEGER },
      "voc": { type: Sequelize.INTEGER },
      "vpd": { type: Sequelize.DECIMAL(5, 3) },
      "actuatorStates": { type: Sequelize.JSONB },
      "snapshotDate": { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('audit_logs', {
      "id": { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      "userId": { type: Sequelize.UUID, references: { model: "users", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      "action": { type: Sequelize.STRING(64), allowNull: false },
      "resource": { type: Sequelize.STRING(64), allowNull: false },
      "resourceId": { type: Sequelize.STRING(64) },
      "details": { type: Sequelize.JSONB },
      "ip": { type: Sequelize.STRING(45) },
      "userAgent": { type: Sequelize.STRING(255) },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('user_chamber_access', {
      "id": { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      "userId": { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: "users", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "role": { type: Sequelize.ENUM("OWNER", "EDITOR", "VIEWER"), defaultValue: "VIEWER" },
      "invitedBy": { type: Sequelize.UUID },
      "acceptedAt": { type: Sequelize.DATE },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('alarms', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "NO ACTION", onUpdate: "CASCADE" },
      "type": { type: Sequelize.ENUM("SENSOR_FAULT", "OUT_OF_RANGE", "DISCONNECTED", "SYSTEM_ERROR", "THRESHOLD_CROSSED"), allowNull: false },
      "severity": { type: Sequelize.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"), allowNull: false, defaultValue: "MEDIUM" },
      "message": { type: Sequelize.STRING(500), allowNull: false },
      "sensorType": { type: Sequelize.ENUM("TEMPERATURE", "HUMIDITY", "CO2", "VOC") },
      "currentValue": { type: Sequelize.DECIMAL(10, 2) },
      "thresholdMin": { type: Sequelize.DECIMAL(10, 2) },
      "thresholdMax": { type: Sequelize.DECIMAL(10, 2) },
      "isAcknowledged": { type: Sequelize.BOOLEAN, defaultValue: false },
      "acknowledgedBy": { type: Sequelize.UUID, references: { model: "users", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
      "acknowledgedAt": { type: Sequelize.DATE },
      "resolvedAt": { type: Sequelize.DATE },
      "metadata": { type: Sequelize.JSONB },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('api_keys', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "userId": { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "keyHash": { type: Sequelize.STRING(64), allowNull: false, unique: true },
      "keyPrefix": { type: Sequelize.STRING(12), allowNull: false },
      "name": { type: Sequelize.STRING(128) },
      "permissions": { type: Sequelize.JSONB, defaultValue: {"read":true,"write":false,"admin":false} },
      "ipWhitelist": { type: Sequelize.JSONB, defaultValue: [] },
      "rateLimit": { type: Sequelize.INTEGER, defaultValue: 100 },
      "expiresAt": { type: Sequelize.DATE },
      "lastUsedAt": { type: Sequelize.DATE },
      "lastIpAddress": { type: Sequelize.STRING(45) },
      "authFailures": { type: Sequelize.INTEGER, defaultValue: 0 },
      "isActive": { type: Sequelize.BOOLEAN, defaultValue: true },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('user_preferences', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "userId": { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: "users", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "theme": { type: Sequelize.ENUM("dark", "light"), defaultValue: "dark" },
      "language": { type: Sequelize.ENUM("es", "en"), defaultValue: "es" },
      "dateFormat": { type: Sequelize.STRING(32), defaultValue: "DD/MM/YYYY" },
      "defaultDashboard": { type: Sequelize.STRING(64), defaultValue: "overview" },
      "refreshFrequency": { type: Sequelize.INTEGER, defaultValue: 5000 },
      "pushNotifications": { type: Sequelize.BOOLEAN, defaultValue: true },
      "alertSounds": { type: Sequelize.BOOLEAN, defaultValue: true },
      "emailAlerts": { type: Sequelize.BOOLEAN, defaultValue: false },
      "telegramEnabled": { type: Sequelize.BOOLEAN, defaultValue: false },
      "telegramChatId": { type: Sequelize.STRING(64) },
      "telegramLinkToken": { type: Sequelize.STRING(32) },
      "telegramLinkTokenExpires": { type: Sequelize.DATE },
      "webhookUrl": { type: Sequelize.STRING(512) },
      "minAlertSeverity": { type: Sequelize.ENUM("info", "warning", "critical"), defaultValue: "warning" },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('system_settings', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "key": { type: Sequelize.STRING(128), allowNull: false, unique: true },
      "value": { type: Sequelize.TEXT, allowNull: false },
      "type": { type: Sequelize.ENUM("string", "number", "boolean", "json"), defaultValue: "string" },
      "label": { type: Sequelize.STRING(255) },
      "description": { type: Sequelize.TEXT },
      "category": { type: Sequelize.STRING(64) },
      "isPublic": { type: Sequelize.BOOLEAN, defaultValue: false },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('telegram_device_configs', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "enabled": { type: Sequelize.BOOLEAN, defaultValue: false },
      "alertOnFault": { type: Sequelize.BOOLEAN, defaultValue: true },
      "alertOnRange": { type: Sequelize.BOOLEAN, defaultValue: true },
      "alertOnDisconnect": { type: Sequelize.BOOLEAN, defaultValue: true },
      "alertOnSystem": { type: Sequelize.BOOLEAN, defaultValue: true },
      "minSeverity": { type: Sequelize.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"), defaultValue: "MEDIUM" },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('integration_credentials', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "provider": { type: Sequelize.ENUM("THINGSPEAK", "INFLUXDB", "MQTT", "CUSTOM"), allowNull: false, defaultValue: "THINGSPEAK" },
      "encryptedCredentials": { type: Sequelize.TEXT, allowNull: false },
      "status": { type: Sequelize.ENUM("ACTIVE", "ERROR", "DISABLED"), defaultValue: "ACTIVE" },
      "lastUsed": { type: Sequelize.DATE },
      "lastError": { type: Sequelize.STRING(500) },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('subscriptions', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "userId": { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: "users", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "plan": { type: Sequelize.ENUM("FREE", "BASIC", "PREMIUM"), allowNull: false, defaultValue: "FREE" },
      "status": { type: Sequelize.ENUM("ACTIVE", "CANCELED", "PAST_DUE"), allowNull: false, defaultValue: "ACTIVE" },
      "apiCallsPerMonth": { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1000 },
      "apiCallsUsedThisMonth": { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      "dataRetentionDays": { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      "currentPeriodStart": { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      "currentPeriodEnd": { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW() + INTERVAL '1 month'") },
      "canceledAt": { type: Sequelize.DATE },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('device_health', {
      "id": { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "freeHeap": { type: Sequelize.INTEGER },
      "minFreeHeap": { type: Sequelize.INTEGER },
      "maxAllocHeap": { type: Sequelize.INTEGER },
      "stackSensors": { type: Sequelize.INTEGER },
      "stackSSR": { type: Sequelize.INTEGER },
      "stackWiFi": { type: Sequelize.INTEGER },
      "stackMQTT": { type: Sequelize.INTEGER },
      "stackOTA": { type: Sequelize.INTEGER },
      "stackTelemetry": { type: Sequelize.INTEGER },
      "stackButton": { type: Sequelize.INTEGER },
      "i2cHealthy": { type: Sequelize.BOOLEAN },
      "sensorAht21": { type: Sequelize.BOOLEAN },
      "sensorEns160": { type: Sequelize.BOOLEAN },
      "staleTaskMask": { type: Sequelize.INTEGER },
      "heartbeatsHealthy": { type: Sequelize.BOOLEAN },
      "uptime": { type: Sequelize.INTEGER },
      "rebootCount": { type: Sequelize.INTEGER },
      "resetReason": { type: Sequelize.INTEGER },
      "resetReasonLabel": { type: Sequelize.STRING(50) },
      "bootTestPassed": { type: Sequelize.BOOLEAN },
      "bootTestFailReason": { type: Sequelize.STRING(100) },
      "timestamp": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('medicinal_properties', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "speciesId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "species_profiles", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "category": { type: Sequelize.STRING(150), allowNull: false },
      "description": { type: Sequelize.TEXT, allowNull: false },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('bioactive_compounds', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "speciesId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "species_profiles", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "name": { type: Sequelize.STRING(100), allowNull: false },
      "value": { type: Sequelize.STRING(50) },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('phase_transitions', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "cycleId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "cultivation_cycles", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "fromPhase": { type: Sequelize.ENUM("INCUBATION", "FRUITING", "MAINTENANCE", "COMPLETED"), allowNull: false },
      "toPhase": { type: Sequelize.ENUM("INCUBATION", "FRUITING", "MAINTENANCE", "COMPLETED"), allowNull: false },
      "triggerType": { type: Sequelize.ENUM("TIME", "SENSOR", "MANUAL", "SENSOR_SUGGESTED"), allowNull: false },
      "triggerData": { type: Sequelize.JSONB, defaultValue: {} },
      "status": { type: Sequelize.ENUM("PENDING", "APPROVED", "EXECUTED", "REJECTED"), defaultValue: "EXECUTED" },
      "approvedBy": { type: Sequelize.UUID },
      "notes": { type: Sequelize.TEXT },
      "executedAt": { type: Sequelize.DATE },
      "createdAt": { type: Sequelize.DATE, allowNull: false },
      "updatedAt": { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('device_maintenance', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "deviceId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "devices", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "component": { type: Sequelize.STRING(16), allowNull: false },
      "health": { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 100 },
      "estimatedFailure": { type: Sequelize.INTEGER },
      "reason": { type: Sequelize.STRING(255) },
      "timestamp": { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.createTable('bioactive_profiles', {
      "id": { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      "cycleId": { type: Sequelize.INTEGER, allowNull: false, references: { model: "cultivation_cycles", key: "id" }, onDelete: "CASCADE", onUpdate: "CASCADE" },
      "compoundName": { type: Sequelize.STRING(64), allowNull: false },
      "concentration": { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      "unit": { type: Sequelize.STRING(16), allowNull: false, defaultValue: "mg/g" },
      "analysisDate": { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      "labSource": { type: Sequelize.STRING(32) },
      "notes": { type: Sequelize.TEXT },
      "timestamp": { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // ── Indices ──────────────────────────────────────────────────
    await queryInterface.addIndex('species_profiles', ["adapterClass"], { name: "species_profiles_adapter_class" });
    await queryInterface.addIndex('species_profiles', ["difficultyLevel"], { name: "species_profiles_difficulty_level" });
    await queryInterface.addIndex('telemetry', ["deviceId","timestamp"], { name: "telemetry_device_id_timestamp" });
    await queryInterface.addIndex('telemetry', ["deviceId","sensorType","timestamp"], { name: "telemetry_device_id_sensor_type_timestamp" });
    await queryInterface.addIndex('events', ["deviceId","timestamp"], { name: "events_device_id_timestamp" });
    await queryInterface.addIndex('actuators', ["deviceId","channel"], { unique: true, name: "actuators_device_id_channel" });
    await queryInterface.addIndex('cultivation_cycles', ["deviceId"], { unique: true, name: "idx_unique_active_device_cycle", where: {"status":"ACTIVE"} });
    await queryInterface.addIndex('cycle_states', ["cycleId"], { name: "idx_cycle_states_cycle" });
    await queryInterface.addIndex('cycle_states', ["snapshotDate"], { name: "idx_cycle_states_date" });
    await queryInterface.addIndex('user_chamber_access', ["userId","deviceId"], { unique: true, name: "user_chamber_access_user_id_device_id" });
    await queryInterface.addIndex('alarms', ["deviceId"], { name: "alarms_device_id" });
    await queryInterface.addIndex('alarms', ["deviceId","type","resolvedAt"], { name: "alarms_device_id_type_resolved_at" });
    await queryInterface.addIndex('alarms', ["severity"], { name: "alarms_severity" });
    await queryInterface.addIndex('alarms', ["resolvedAt"], { name: "alarms_resolved_at" });
    await queryInterface.addIndex('api_keys', ["keyHash"], { name: "api_keys_key_hash" });
    await queryInterface.addIndex('api_keys', ["userId"], { name: "api_keys_user_id" });
    await queryInterface.addIndex('device_health', ["deviceId","timestamp"], { name: "device_health_device_id_timestamp" });
    await queryInterface.addIndex('medicinal_properties', ["speciesId"], { name: "medicinal_properties_species_id" });
    await queryInterface.addIndex('medicinal_properties', ["speciesId","category"], { unique: true, name: "medicinal_properties_species_id_category" });
    await queryInterface.addIndex('bioactive_compounds', ["speciesId"], { name: "bioactive_compounds_species_id" });
    await queryInterface.addIndex('bioactive_compounds', ["speciesId","name"], { unique: true, name: "bioactive_compounds_species_id_name" });
    await queryInterface.addIndex('phase_transitions', ["cycleId"], { name: "phase_transitions_cycle_id" });
    await queryInterface.addIndex('phase_transitions', ["status"], { name: "phase_transitions_status" });
    await queryInterface.addIndex('device_maintenance', ["deviceId","component"], { name: "device_maintenance_device_id_component" });
    await queryInterface.addIndex('device_maintenance', ["timestamp"], { name: "device_maintenance_timestamp" });
    await queryInterface.addIndex('bioactive_profiles', ["cycleId","compoundName"], { name: "bioactive_profiles_cycle_id_compound_name" });
    await queryInterface.addIndex('bioactive_profiles', ["analysisDate"], { name: "bioactive_profiles_analysis_date" });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('bioactive_profiles');
    await queryInterface.dropTable('device_maintenance');
    await queryInterface.dropTable('phase_transitions');
    await queryInterface.dropTable('bioactive_compounds');
    await queryInterface.dropTable('medicinal_properties');
    await queryInterface.dropTable('device_health');
    await queryInterface.dropTable('integration_credentials');
    await queryInterface.dropTable('telegram_device_configs');
    await queryInterface.dropTable('system_settings');
    await queryInterface.dropTable('user_preferences');
    await queryInterface.dropTable('api_keys');
    await queryInterface.dropTable('alarms');
    await queryInterface.dropTable('user_chamber_access');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('cycle_states');
    await queryInterface.dropTable('cultivation_cycles');
    await queryInterface.dropTable('recipes');
    await queryInterface.dropTable('actuators');
    await queryInterface.dropTable('events');
    await queryInterface.dropTable('telemetry');
    await queryInterface.dropTable('sensors');
    await queryInterface.dropTable('devices');
    await queryInterface.dropTable('species_profiles');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('chambers');
    // ── Tipos ENUM (se crean con las tablas, se limpian aqui) ──
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_alarms_sensorType" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_alarms_severity" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_alarms_type" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cultivation_cycles_currentPhase" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cultivation_cycles_status" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cycle_states_phase" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_devices_controlMode" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_devices_lifecycle" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_events_type" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_integration_credentials_provider" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_integration_credentials_status" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_phase_transitions_fromPhase" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_phase_transitions_status" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_phase_transitions_toPhase" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_phase_transitions_triggerType" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_recipes_faeLevel" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_recipes_ventilationStrategy" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sensors_status" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sensors_type" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_species_profiles_difficultyLevel" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscriptions_plan" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscriptions_status" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_system_settings_type" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_telegram_device_configs_minSeverity" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_telemetry_sensorType" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_chamber_access_role" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_preferences_language" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_preferences_minAlertSeverity" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_preferences_theme" CASCADE');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role" CASCADE');
  },
};

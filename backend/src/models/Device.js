import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Device = sequelize.define('Device', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  macAddress: { type: DataTypes.STRING(50), unique: true, allowNull: true },
  deviceId: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  firmwareVersion: { type: DataTypes.STRING(20), defaultValue: '0.0.0' },
  hwRevision: { type: DataTypes.STRING(10), defaultValue: '' },

  // ── Lifecycle (persisted — manually set) ──────────────────────────
  // PROVISIONING is computed from lastSeen=null, not stored here.
  lifecycle: {
    type: DataTypes.ENUM('ACTIVE', 'MAINTENANCE', 'RETIRED'),
    defaultValue: 'ACTIVE',
  },

  lastSeen: { type: DataTypes.DATE },

  // ── Connectivity evidence (written only by DeviceHealthService) ────
  lastTelemetryAt: { type: DataTypes.DATE, allowNull: true },
  lastCommandAt: { type: DataTypes.DATE, allowNull: true },
  lastAckAt: { type: DataTypes.DATE, allowNull: true },

  // ── Health config (per-device thresholds) ──────────────────────────
  heartbeatInterval: { type: DataTypes.INTEGER, defaultValue: 10 },
  staleMultiplier: { type: DataTypes.INTEGER, defaultValue: 3 },
  offlineMultiplier: { type: DataTypes.INTEGER, defaultValue: 6 },
  maintenanceMode: { type: DataTypes.BOOLEAN, defaultValue: false },

  userId: { type: DataTypes.UUID, allowNull: true },
  chamberId: { type: DataTypes.INTEGER, allowNull: true },
  chamberName: { type: DataTypes.STRING(128) },
  chamberLocation: { type: DataTypes.STRING(255) },
  ssrActiveLow: { type: DataTypes.BOOLEAN, defaultValue: true },
  thingSpeakEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  thingSpeakChannelId: { type: DataTypes.STRING(20), allowNull: true },
  thingSpeakReadKey: { type: DataTypes.STRING(32), allowNull: true },
  thingSpeakWriteKey: { type: DataTypes.STRING(32), allowNull: true },
  thingSpeakSyncInterval: { type: DataTypes.INTEGER, defaultValue: 300000 },
  controlMode: {
    type: DataTypes.ENUM('LOCAL', 'REMOTE', 'OFF', 'AUTO'),
    defaultValue: 'AUTO',
  },
  lastFirmwareState: { type: DataTypes.STRING(30), allowNull: true },
}, {
  tableName: 'devices',
  timestamps: true,
});

export default Device;

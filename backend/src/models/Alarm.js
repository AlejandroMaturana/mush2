import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Alarm = sequelize.define('Alarm', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('SENSOR_FAULT', 'OUT_OF_RANGE', 'DISCONNECTED', 'SYSTEM_ERROR', 'THRESHOLD_CROSSED'),
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false,
    defaultValue: 'MEDIUM',
  },
  message: { type: DataTypes.STRING(500), allowNull: false },
  sensorType: {
    type: DataTypes.ENUM('TEMPERATURE', 'HUMIDITY', 'CO2', 'VOC'),
    allowNull: true,
  },
  currentValue: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  thresholdMin: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  thresholdMax: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  isAcknowledged: { type: DataTypes.BOOLEAN, defaultValue: false },
  acknowledgedBy: { type: DataTypes.UUID, allowNull: true },
  acknowledgedAt: { type: DataTypes.DATE, allowNull: true },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: true },
}, {
  tableName: 'alarms',
  timestamps: true,
  indexes: [
    { fields: ['deviceId'] },
    { fields: ['deviceId', 'type', 'resolvedAt'] },
    { fields: ['severity'] },
    { fields: ['resolvedAt'] },
  ],
});

export default Alarm;

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DeviceHealth = sequelize.define('DeviceHealth', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  freeHeap: { type: DataTypes.INTEGER },
  minFreeHeap: { type: DataTypes.INTEGER },
  maxAllocHeap: { type: DataTypes.INTEGER },
  stackSensors: { type: DataTypes.INTEGER },
  stackSSR: { type: DataTypes.INTEGER },
  stackWiFi: { type: DataTypes.INTEGER },
  stackMQTT: { type: DataTypes.INTEGER },
  stackOTA: { type: DataTypes.INTEGER },
  stackTelemetry: { type: DataTypes.INTEGER },
  stackButton: { type: DataTypes.INTEGER },
  i2cHealthy: { type: DataTypes.BOOLEAN },
  sensorAht21: { type: DataTypes.BOOLEAN },
  sensorEns160: { type: DataTypes.BOOLEAN },
  staleTaskMask: { type: DataTypes.INTEGER },
  heartbeatsHealthy: { type: DataTypes.BOOLEAN },
  uptime: { type: DataTypes.INTEGER },
  rebootCount: { type: DataTypes.INTEGER },
  timestamp: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'device_health',
  timestamps: false,
  indexes: [
    { fields: ['deviceId', 'timestamp'] },
  ],
});

export default DeviceHealth;

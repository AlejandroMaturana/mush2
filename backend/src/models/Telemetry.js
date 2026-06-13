import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Telemetry = sequelize.define('Telemetry', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  sensorId: { type: DataTypes.INTEGER },
  value: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  sensorType: {
    type: DataTypes.ENUM('TEMPERATURE', 'HUMIDITY', 'CO2', 'VOC'),
    allowNull: false,
  },
  unit: { type: DataTypes.STRING(10) },
  timestamp: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'telemetry',
  timestamps: false,
  indexes: [
    { fields: ['deviceId', 'timestamp'] },
    { fields: ['deviceId', 'sensorType', 'timestamp'] },
  ],
});

export default Telemetry;

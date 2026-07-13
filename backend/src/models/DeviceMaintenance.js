import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const DeviceMaintenance = sequelize.define('DeviceMaintenance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  component: {
    type: DataTypes.STRING(16),
    allowNull: false,
  },
  health: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 100,
  },
  estimatedFailure: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'device_maintenance',
  timestamps: false,
  indexes: [
    { fields: ['deviceId', 'component'] },
    { fields: ['timestamp'] },
  ],
});

export default DeviceMaintenance;

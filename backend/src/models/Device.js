import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Device = sequelize.define('Device', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  macAddress: { type: DataTypes.STRING(17), unique: true, allowNull: false },
  deviceId: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  firmwareVersion: { type: DataTypes.STRING(10), defaultValue: '0.0.0' },
  status: {
    type: DataTypes.ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR'),
    defaultValue: 'OFFLINE',
  },
  lastSeen: { type: DataTypes.DATE },
  userId: { type: DataTypes.UUID, allowNull: true },
  chamberName: { type: DataTypes.STRING(128) },
  chamberLocation: { type: DataTypes.STRING(255) },
}, {
  tableName: 'devices',
  timestamps: true,
});

export default Device;

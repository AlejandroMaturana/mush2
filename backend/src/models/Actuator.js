import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Actuator = sequelize.define('Actuator', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  channel: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(20), defaultValue: 'SSR' },
  label: { type: DataTypes.STRING(50), defaultValue: '' },
  state: { type: DataTypes.STRING(10), defaultValue: 'OFF' },
  mode: { type: DataTypes.STRING(10), defaultValue: 'LOCAL' },
  lastCommand: { type: DataTypes.STRING(50) },
  lastAck: { type: DataTypes.STRING(20) },
  lastSeen: { type: DataTypes.DATE },
}, {
  tableName: 'actuators',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['deviceId', 'channel'] },
  ],
});

export default Actuator;

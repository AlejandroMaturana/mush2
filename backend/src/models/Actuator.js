import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Actuator = sequelize.define('Actuator', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  channel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 4 },
  },
  type: { type: DataTypes.STRING(20), defaultValue: 'SSR' },
  label: { type: DataTypes.STRING(50), defaultValue: '' },
  state: { type: DataTypes.STRING(10), defaultValue: 'OFF' },
  mode: { type: DataTypes.STRING(10), defaultValue: 'LOCAL' },
  lastCommand: { type: DataTypes.STRING(36) },
  lastAck: { type: DataTypes.STRING(36) },
  lastAckAt: { type: DataTypes.DATE },
  lastSeen: { type: DataTypes.DATE },
  overrideUntil: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'actuators',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['deviceId', 'channel'] },
  ],
});

export default Actuator;

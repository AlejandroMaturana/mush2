import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Event = sequelize.define('Event', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('ACTUATOR_CHANGE', 'STATE_TRANSITION', 'SYSTEM_BOOT', 'FIRMWARE_UPDATE'),
    allowNull: false,
  },
  payload: { type: DataTypes.JSONB },
  timestamp: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'events',
  timestamps: false,
  indexes: [
    { fields: ['deviceId', 'timestamp'] },
  ],
});

export default Event;

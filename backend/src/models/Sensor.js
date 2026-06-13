import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Sensor = sequelize.define('Sensor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('TEMPERATURE', 'HUMIDITY', 'CO2', 'VOC'),
    allowNull: false,
  },
  channel: { type: DataTypes.INTEGER },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'FAULT'),
    defaultValue: 'ACTIVE',
  },
}, {
  tableName: 'sensors',
  timestamps: true,
});

export default Sensor;

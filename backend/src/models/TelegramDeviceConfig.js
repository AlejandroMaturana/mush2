import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class TelegramDeviceConfig extends Model {}

TelegramDeviceConfig.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  alertOnFault: { type: DataTypes.BOOLEAN, defaultValue: true },
  alertOnRange: { type: DataTypes.BOOLEAN, defaultValue: true },
  alertOnDisconnect: { type: DataTypes.BOOLEAN, defaultValue: true },
  alertOnSystem: { type: DataTypes.BOOLEAN, defaultValue: true },
  minSeverity: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), defaultValue: 'MEDIUM' },
}, {
  sequelize,
  modelName: 'TelegramDeviceConfig',
  tableName: 'telegram_device_configs',
  timestamps: true,
});

export default TelegramDeviceConfig;

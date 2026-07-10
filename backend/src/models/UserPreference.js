import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class UserPreference extends Model {}

UserPreference.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  theme: { type: DataTypes.ENUM('dark', 'light'), defaultValue: 'dark' },
  language: { type: DataTypes.ENUM('es', 'en'), defaultValue: 'es' },
  dateFormat: { type: DataTypes.STRING(32), defaultValue: 'DD/MM/YYYY' },
  defaultDashboard: { type: DataTypes.STRING(64), defaultValue: 'overview' },
  refreshFrequency: { type: DataTypes.INTEGER, defaultValue: 5000 },
  pushNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
  alertSounds: { type: DataTypes.BOOLEAN, defaultValue: true },
  emailAlerts: { type: DataTypes.BOOLEAN, defaultValue: false },
  telegramEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  telegramChatId: { type: DataTypes.STRING(64), allowNull: true },
  webhookUrl: { type: DataTypes.STRING(512), allowNull: true },
  minAlertSeverity: { type: DataTypes.ENUM('info', 'warning', 'critical'), defaultValue: 'warning' },
}, {
  sequelize,
  modelName: 'UserPreference',
  tableName: 'user_preferences',
  timestamps: true,
});

export default UserPreference;

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

const TYPE_CAST = {
  string: v => String(v),
  number: v => Number(v),
  boolean: v => v === 'true' || v === true || v === 1,
  json: v => typeof v === 'string' ? JSON.parse(v) : v,
};

class SystemSetting extends Model {
  getTypedValue() {
    const cast = TYPE_CAST[this.type] || TYPE_CAST.string;
    try { return cast(this.value); } catch { return this.value; }
  }
}

SystemSetting.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  value: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('string', 'number', 'boolean', 'json'), defaultValue: 'string' },
  label: { type: DataTypes.STRING(255), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(64), allowNull: true },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'SystemSetting',
  tableName: 'system_settings',
  timestamps: true,
});

export { SystemSetting, TYPE_CAST };
export default SystemSetting;

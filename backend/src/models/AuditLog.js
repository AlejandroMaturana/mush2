import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class AuditLog extends Model {}

AuditLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING(64), allowNull: false },
  resource: { type: DataTypes.STRING(64), allowNull: false },
  resourceId: { type: DataTypes.STRING(64) },
  details: { type: DataTypes.JSONB },
  ip: { type: DataTypes.STRING(45) },
  userAgent: { type: DataTypes.STRING(255) },
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
});

export default AuditLog;

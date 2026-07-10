import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database.js';

class ApiKey extends Model {
  static generateKey() {
    const raw = `mush_${crypto.randomBytes(30).toString('base64url')}`;
    const prefix = raw.slice(0, 12);
    const hash = ApiKey.hashKey(raw);
    return { raw, prefix, hash };
  }

  static hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}

ApiKey.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  keyHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  keyPrefix: { type: DataTypes.STRING(12), allowNull: false },
  name: { type: DataTypes.STRING(128), allowNull: true },
  permissions: { type: DataTypes.JSONB, defaultValue: { read: true, write: false, admin: false } },
  ipWhitelist: { type: DataTypes.JSONB, defaultValue: [] },
  rateLimit: { type: DataTypes.INTEGER, defaultValue: 100 },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  lastUsedAt: { type: DataTypes.DATE, allowNull: true },
  lastIpAddress: { type: DataTypes.STRING(45), allowNull: true },
  authFailures: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize,
  modelName: 'ApiKey',
  tableName: 'api_keys',
  timestamps: true,
  indexes: [
    { fields: ['keyHash'] },
    { fields: ['userId'] },
  ],
});

export default ApiKey;

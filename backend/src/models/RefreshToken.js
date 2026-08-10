import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database.js';

class RefreshToken extends Model {
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

RefreshToken.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  jti: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
  replacedByJti: { type: DataTypes.STRING(64), allowNull: true },
}, {
  sequelize,
  modelName: 'RefreshToken',
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['jti'] },
    { fields: ['expiresAt'] },
  ],
});

export default RefreshToken;

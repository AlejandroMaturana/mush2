import { DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database.js';

/**
 * ProvisioningToken — token de aprovisionamiento de un solo uso (ISSUE-001).
 *
 * El token crudo (`musht_...`) se entrega UNA vez al operador/CLI y SOLO se
 * persiste su hash sha256 (mismo patrón que ApiKey/RefreshToken). La cuota se
 * controla con `maxUses`/`usesRemaining`; `deviceId` permite vincular el token
 * a un dispositivo concreto durante la transición de provisioning.
 */
class ProvisioningToken extends Model {
  static generate() {
    const raw = `musht_${crypto.randomBytes(32).toString('base64url')}`;
    return { raw, hash: ProvisioningToken.hashToken(raw) };
  }

  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

ProvisioningToken.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  label: { type: DataTypes.STRING(128), allowNull: true },
  deviceId: { type: DataTypes.STRING(50), allowNull: true },
  maxUses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  usesRemaining: { type: DataTypes.INTEGER, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
  lastUsedAt: { type: DataTypes.DATE, allowNull: true },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'ProvisioningToken',
  tableName: 'provisioning_tokens',
  timestamps: true,
  indexes: [
    { fields: ['tokenHash'] },
    { fields: ['deviceId'] },
    { fields: ['expiresAt'] },
  ],
});

export default ProvisioningToken;

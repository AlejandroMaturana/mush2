import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class UserChamberAccess extends Model {}

UserChamberAccess.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  deviceId: { type: DataTypes.INTEGER, allowNull: false },
  role: {
    type: DataTypes.ENUM('OWNER', 'EDITOR', 'VIEWER'),
    defaultValue: 'VIEWER',
  },
  invitedBy: { type: DataTypes.UUID },
  acceptedAt: { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'UserChamberAccess',
  tableName: 'user_chamber_access',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'deviceId'] },
  ],
});

export default UserChamberAccess;

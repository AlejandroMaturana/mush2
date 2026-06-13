import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

class User extends Model {
  async validatePassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }
}

User.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'),
    allowNull: false,
    defaultValue: 'OPERATOR',
  },
  refreshToken: { type: DataTypes.STRING(512) },
  refreshTokenExpires: { type: DataTypes.DATE },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLoginAt: { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  paranoid: true,
});

export default User;

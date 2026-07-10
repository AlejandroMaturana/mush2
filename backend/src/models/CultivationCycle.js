import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CultivationCycle = sequelize.define('CultivationCycle', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  deviceId: { type: DataTypes.INTEGER, allowNull: true },
  chamberId: { type: DataTypes.INTEGER },
  recipeId: { type: DataTypes.INTEGER, allowNull: false },
  species: { type: DataTypes.STRING(100), allowNull: false },
  strain: { type: DataTypes.STRING(100) },
  status: {
    type: DataTypes.ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'ABORTED'),
    defaultValue: 'PLANNED',
  },
  currentPhase: {
    type: DataTypes.ENUM('INCUBATION', 'FRUITING', 'MAINTENANCE', 'COMPLETED'),
    defaultValue: 'INCUBATION',
  },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  notes: { type: DataTypes.TEXT },
}, {
  tableName: 'cultivation_cycles',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['deviceId'],
      where: { status: 'ACTIVE' },
      name: 'idx_unique_active_device_cycle',
    },
  ],
});

export default CultivationCycle;

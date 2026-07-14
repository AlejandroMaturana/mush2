import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BioactiveProfile = sequelize.define('BioactiveProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cycleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  compoundName: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  concentration: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'mg/g',
  },
  analysisDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  labSource: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'bioactive_profiles',
  timestamps: false,
  indexes: [
    { fields: ['cycleId', 'compoundName'] },
    { fields: ['analysisDate'] },
  ],
});

export default BioactiveProfile;

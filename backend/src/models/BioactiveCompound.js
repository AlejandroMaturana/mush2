import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BioactiveCompound = sequelize.define('BioactiveCompound', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  speciesId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.STRING(50), allowNull: true },
}, {
  tableName: 'bioactive_compounds',
  timestamps: true,
  indexes: [
    { fields: ['speciesId'] },
    { fields: ['speciesId', 'name'], unique: true },
  ],
});

export default BioactiveCompound;

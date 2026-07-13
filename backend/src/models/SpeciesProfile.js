import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SpeciesProfile = sequelize.define('SpeciesProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  scientificName: { type: DataTypes.STRING(150), allowNull: false },
  adapterClass: {
    type: DataTypes.ENUM('ADAPTOGEN', 'EDIBLE', 'MEDICINAL'),
    allowNull: false,
  },
  originClimate: { type: DataTypes.STRING(100) },
  difficultyLevel: {
    type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
    allowNull: false,
    defaultValue: 'BEGINNER',
  },
  compounds: { type: DataTypes.JSONB, defaultValue: {} },
  description: { type: DataTypes.TEXT },
  iconUrl: { type: DataTypes.STRING(500) },
}, {
  tableName: 'species_profiles',
  timestamps: true,
  indexes: [
    { fields: ['adapterClass'] },
    { fields: ['difficultyLevel'] },
  ],
});

export default SpeciesProfile;

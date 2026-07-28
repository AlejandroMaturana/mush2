import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SpeciesProfile = sequelize.define('SpeciesProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  scientificName: { type: DataTypes.STRING(150), allowNull: false },
  adapterClass: { type: DataTypes.STRING(100), allowNull: false },
  originClimate: { type: DataTypes.STRING(100) },
  difficultyLevel: {
    type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
    allowNull: false,
    defaultValue: 'BEGINNER',
  },
  description: { type: DataTypes.TEXT },
  shortDescription: { type: DataTypes.TEXT },
  imageUrl: { type: DataTypes.STRING(500) },
  generalAttributes: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'species_profiles',
  timestamps: true,
  indexes: [
    { fields: ['adapterClass'] },
    { fields: ['difficultyLevel'] },
  ],
});

export default SpeciesProfile;

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  species: { type: DataTypes.STRING(100), allowNull: false },
  incubationTempMin: { type: DataTypes.DECIMAL(5, 2) },
  incubationTempMax: { type: DataTypes.DECIMAL(5, 2) },
  incubationHumMin: { type: DataTypes.DECIMAL(5, 2) },
  incubationHumMax: { type: DataTypes.DECIMAL(5, 2) },
  incubationCo2Max: { type: DataTypes.INTEGER, defaultValue: 1200 },
  incubationDurationDays: { type: DataTypes.INTEGER },
  fruitingTempMin: { type: DataTypes.DECIMAL(5, 2) },
  fruitingTempMax: { type: DataTypes.DECIMAL(5, 2) },
  fruitingHumMin: { type: DataTypes.DECIMAL(5, 2) },
  fruitingHumMax: { type: DataTypes.DECIMAL(5, 2) },
  fruitingCo2Max: { type: DataTypes.INTEGER, defaultValue: 800 },
  fruitingDurationDays: { type: DataTypes.INTEGER },
  maintenanceTempMin: { type: DataTypes.DECIMAL(5, 2) },
  maintenanceTempMax: { type: DataTypes.DECIMAL(5, 2) },
  maintenanceHumMin: { type: DataTypes.DECIMAL(5, 2) },
  maintenanceHumMax: { type: DataTypes.DECIMAL(5, 2) },
  maintenanceCo2Max: { type: DataTypes.INTEGER, defaultValue: 1000 },
  faeIntervalMinutes: { type: DataTypes.INTEGER, defaultValue: 60 },
  ventilationStrategy: {
    type: DataTypes.ENUM('TIMER', 'CO2_TRIGGER', 'HYBRID'),
    defaultValue: 'TIMER',
  },
  lightCycleHours: { type: DataTypes.INTEGER, defaultValue: 12 },
  faeLevel: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    defaultValue: 'MEDIUM',
  },
  dewPointMaxRH: { type: DataTypes.DECIMAL(5, 2), defaultValue: 95.0 },
}, {
  tableName: 'recipes',
  timestamps: true,
});

export default Recipe;

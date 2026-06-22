import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CycleState = sequelize.define('CycleState', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cycleId: { type: DataTypes.INTEGER, allowNull: false },
  phase: { type: DataTypes.ENUM('INCUBATION', 'FRUITING', 'MAINTENANCE') },
  temperature: { type: DataTypes.DECIMAL(5, 2) },
  humidity: { type: DataTypes.DECIMAL(5, 2) },
  co2: { type: DataTypes.INTEGER },
  voc: { type: DataTypes.INTEGER },
  vpd: { type: DataTypes.DECIMAL(5, 3) },
  actuatorStates: { type: DataTypes.JSONB },
  snapshotDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'cycle_states',
  timestamps: true,
  indexes: [
    { fields: ['cycleId'], name: 'idx_cycle_states_cycle' },
    { fields: ['snapshotDate'], name: 'idx_cycle_states_date' },
  ],
});

export default CycleState;

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MedicinalProperty = sequelize.define('MedicinalProperty', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  speciesId: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'medicinal_properties',
  timestamps: true,
  indexes: [
    { fields: ['speciesId'] },
    { fields: ['speciesId', 'category'], unique: true },
  ],
});

export default MedicinalProperty;

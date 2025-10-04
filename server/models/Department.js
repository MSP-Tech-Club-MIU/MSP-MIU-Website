const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Department = sequelize.define('Department', {
  department_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.ENUM(
      'Software Development',
      'Technical Training',
      'Media & Content Creation',
      'Public Relations',
      'Human Resources',
      'Event Planning'
    ),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'departments',
  timestamps: false // No created_at/updated_at in the actual schema
});

module.exports = Department;

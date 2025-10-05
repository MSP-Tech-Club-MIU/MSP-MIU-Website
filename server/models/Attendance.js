const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  attendance_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'session_id'
    },
    validate: {
      notEmpty: true
    }
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'members',
      key: 'member_id'
    },
    validate: {
      notEmpty: true
    }
  },
  attended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'attendance',
  timestamps: false // No created_at/updated_at in the actual schema
});

module.exports = Attendance;

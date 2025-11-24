const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  request_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'events',
      key: 'event_id'
    },
    validate: {
      notEmpty: true
    }
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  university_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  course_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null
  },
  lecture_lab_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  room: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null
  },
  instructor_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  additional_course_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null
  },
  additional_lecture_lab_time: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  additional_room: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null
  },
  additional_instructor_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  attended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'attendance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false // No updated_at in the actual schema
});

module.exports = Attendance;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseEnrollment = sequelize.define('CourseEnrollment', {
  enrollment_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'course_id'
    }
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      isEmail: true
    }
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { notEmpty: true }
  },
  university_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { notEmpty: true }
  },
  status: {
    type: DataTypes.ENUM('preordered', 'notified', 'enrolled'),
    allowNull: false,
    defaultValue: 'preordered'
  },
  access_token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  attended: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'course_enrollments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['course_id', 'university_id'],
      name: 'course_enrollments_course_university_unique'
    },
    {
      unique: true,
      fields: ['course_id', 'email'],
      name: 'course_enrollments_course_email_unique'
    }
  ]
});

module.exports = CourseEnrollment;

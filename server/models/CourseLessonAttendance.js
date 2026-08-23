const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseLessonAttendance = sequelize.define('CourseLessonAttendance', {
  id: {
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
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'course_lessons',
      key: 'lesson_id'
    }
  },
  enrollment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'course_enrollments',
      key: 'enrollment_id'
    }
  },
  attended: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  attended_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'course_lesson_attendance',
  timestamps: true,
  createdAt: 'attended_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['lesson_id', 'enrollment_id'],
      name: 'course_lesson_attendance_lesson_enrollment_unique'
    },
    {
      fields: ['course_id'],
      name: 'course_lesson_attendance_course_id_idx'
    },
    {
      fields: ['enrollment_id'],
      name: 'course_lesson_attendance_enrollment_id_idx'
    }
  ]
});

module.exports = CourseLessonAttendance;

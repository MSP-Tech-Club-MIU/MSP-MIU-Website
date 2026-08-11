const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseLessonProgress = sequelize.define('CourseLessonProgress', {
  progress_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  enrollment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'course_enrollments',
      key: 'enrollment_id'
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
  completed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'course_lesson_progress',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['enrollment_id', 'lesson_id'],
      name: 'course_lesson_progress_enrollment_lesson_unique'
    }
  ]
});

module.exports = CourseLessonProgress;

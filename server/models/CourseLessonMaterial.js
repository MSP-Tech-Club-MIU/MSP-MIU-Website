const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseLessonMaterial = sequelize.define('CourseLessonMaterial', {
  material_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'course_lessons',
      key: 'lesson_id'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: { notEmpty: true }
  },
  material_type: {
    type: DataTypes.ENUM('youtube', 'document', 'zip', 'code', 'other'),
    allowNull: false
  },
  youtube_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  file_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'course_lesson_materials',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = CourseLessonMaterial;

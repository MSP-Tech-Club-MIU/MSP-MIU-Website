const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Course = sequelize.define('Course', {
  course_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: { notEmpty: true }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  thumbnail_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'coming_soon', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  season_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'seasons',
      key: 'season_id'
    }
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notify_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'courses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Course;

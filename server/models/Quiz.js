const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Quiz = sequelize.define('Quiz', {
  quiz_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  competition_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'competitions',
      key: 'competition_id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_at: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterStart(value) {
        if (value && this.start_at && new Date(value) <= new Date(this.start_at)) {
          throw new Error('end_at must be after start_at');
        }
      }
    }
  },
  time_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time limit in minutes'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'active', 'closed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'quizzes',
  timestamps: false
});

module.exports = Quiz;

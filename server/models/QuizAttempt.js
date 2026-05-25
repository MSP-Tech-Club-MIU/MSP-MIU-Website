const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuizAttempt = sequelize.define('QuizAttempt', {
  attempt_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quiz_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quizzes',
      key: 'quiz_id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'CASCADE'
  },
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'submitted', 'graded'),
    allowNull: false,
    defaultValue: 'in_progress'
  }
}, {
  tableName: 'quiz_attempts',
  timestamps: false,
  indexes: [
    {
      fields: ['quiz_id', 'user_id']
    }
  ]
});

module.exports = QuizAttempt;

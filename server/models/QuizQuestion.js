const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuizQuestion = sequelize.define('QuizQuestion', {
  question_id: {
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
  question_type: {
    type: DataTypes.ENUM('mcq', 'text'),
    allowNull: false
  },
  question_text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  points: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.00,
    validate: {
      min: 0
    }
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'quiz_questions',
  timestamps: false,
  indexes: [
    {
      fields: ['quiz_id', 'position']
    }
  ]
});

module.exports = QuizQuestion;

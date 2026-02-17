const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuizAnswer = sequelize.define('QuizAnswer', {
  answer_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  attempt_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quiz_attempts',
      key: 'attempt_id'
    },
    onDelete: 'CASCADE'
  },
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quiz_questions',
      key: 'question_id'
    },
    onDelete: 'CASCADE'
  },
  selected_option_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'quiz_options',
      key: 'option_id'
    },
    onDelete: 'SET NULL'
  },
  text_answer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  awarded_points: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0.00
  }
}, {
  tableName: 'quiz_answers',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['attempt_id', 'question_id']
    }
  ]
});

module.exports = QuizAnswer;

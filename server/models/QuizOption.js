const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const QuizOption = sequelize.define('QuizOption', {
  option_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  option_text: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'quiz_options',
  timestamps: false,
  indexes: [
    {
      fields: ['question_id', 'position']
    }
  ]
});

module.exports = QuizOption;

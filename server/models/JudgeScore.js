const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JudgeScore = sequelize.define('JudgeScore', {
  judge_score_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'submissions',
      key: 'submission_id'
    },
    onDelete: 'CASCADE'
  },
  judge_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'CASCADE'
  },
  design_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  creativity_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  ux_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  innovation_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'judge_scores',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['submission_id', 'judge_id']
    }
  ]
});

module.exports = JudgeScore;

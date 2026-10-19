const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CyberRunnerScore = sequelize.define('CyberRunnerScore', {
  score_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  player_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  player_contact: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  student_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  tokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  max_combo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  run_duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  played_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'cyberrunner_scores',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      name: 'idx_cyberrunner_played_date_score',
      fields: ['played_date', { name: 'score', order: 'DESC' }]
    },
    {
      name: 'idx_cyberrunner_score_desc',
      fields: [{ name: 'score', order: 'DESC' }]
    },
    {
      name: 'idx_cyberrunner_user_id',
      fields: ['user_id']
    }
  ]
});

module.exports = CyberRunnerScore;

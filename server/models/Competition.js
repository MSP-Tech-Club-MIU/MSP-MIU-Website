const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Competition = sequelize.define('Competition', {
  competition_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  rules: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  start_at: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notEmpty: true,
      isDate: true
    }
  },
  end_at: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notEmpty: true,
      isDate: true,
      isAfterStart(value) {
        if (value && this.start_at && new Date(value) <= new Date(this.start_at)) {
          throw new Error('end_at must be after start_at');
        }
      }
    }
  },
  max_team_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  min_team_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      isLessThanMax(value) {
        if (value && this.max_team_size && value > this.max_team_size) {
          throw new Error('min_team_size cannot be greater than max_team_size');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'locked', 'judging', 'finished'),
    allowNull: false,
    defaultValue: 'draft'
  },
  location_type: {
    type: DataTypes.ENUM('on-campus', 'online'),
    allowNull: false,
    defaultValue: 'on-campus'
  },
  location_details: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  tableName: 'competitions',
  timestamps: false
});

module.exports = Competition;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Suggestion = sequelize.define('Suggestion', {
  suggestion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'members',
      key: 'member_id'
    }
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      }
    }
  },
  suggestion: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: {
        args: [1, 2000],
        msg: 'Suggestion must be between 1 and 2000 characters'
      }
    }
  },
  anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'suggestions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Suggestion;

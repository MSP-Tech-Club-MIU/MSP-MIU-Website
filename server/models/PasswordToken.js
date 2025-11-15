const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PasswordToken = sequelize.define('PasswordToken', {
  token_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    validate: {
      notEmpty: true
    }
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    },
    comment: 'Hashed password reset token (bcrypt hash) - never store plain text tokens'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'password_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = PasswordToken;

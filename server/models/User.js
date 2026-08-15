const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  university_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  profile_picture: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  schedule: {
    type: DataTypes.JSON,
    allowNull: true
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'department_id'
    }
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  email_unsubscribed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('member', 'board', 'admin', 'competitor', 'judge'),
    allowNull: false,
    defaultValue: 'member'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  season_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'seasons',
      key: 'season_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = User;

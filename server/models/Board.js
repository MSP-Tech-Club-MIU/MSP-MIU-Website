const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Board = sequelize.define('Board', {
  board_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  position: {
    type: DataTypes.ENUM('President', 'Vice President', 'Head', 'Co-Head', 'Founder'),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'department_id'
    }
  },
  year: {
    type: DataTypes.STRING(9),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  university_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'ID' // Map to the actual database column name 'ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  photo_url: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  linkedin_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  github_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'board',
  timestamps: false
});

module.exports = Board;

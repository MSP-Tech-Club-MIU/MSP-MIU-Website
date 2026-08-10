const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Application = sequelize.define('Application', {
  application_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  university_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  faculty: {
    type: DataTypes.ENUM(
      'Computer Science',
      'Engineering Sciences & Arts - ECE',
      'Mass Communication',
      'Dentistry',
      'Engineering Sciences & Arts - Architecture',
      'Pharmacy',
      'Business',
      'Alsun'
    ),
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  first_choice: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  second_choice: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  skills: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  motivation: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  interview: {
    type: DataTypes.ENUM('on-campus', 'online'),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  comment: {
    type: DataTypes.STRING(500),
    allowNull: true
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
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'applications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['university_id', 'season_id'],
      name: 'uniq_applications_university_season'
    }
  ]
});

module.exports = Application;

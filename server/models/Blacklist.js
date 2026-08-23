const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Blacklist = sequelize.define('Blacklist', {
  blacklist_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Full name or partial name to match'
  },
  identifier: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'University ID, Student ID, or National ID'
  },
  phone_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'Contact phone number'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Reason is required when blacklisting a person'
      }
    },
    comment: 'Reason for blacklisting'
  },
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'blacklists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['identifier'],
      name: 'idx_blacklist_identifier'
    },
    {
      fields: ['phone_number'],
      name: 'idx_blacklist_phone'
    },
    {
      fields: ['name'],
      name: 'idx_blacklist_name'
    }
  ]
});

module.exports = Blacklist;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Event = sequelize.define('Event', {
  event_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  event_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  category: {
    type: DataTypes.ENUM('Session', 'Workshop', 'Entertainment'),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  upload_file: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attendees: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  main_image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  registration_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
  
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false // No updated_at in the actual schema
});

module.exports = Event;

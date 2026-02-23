const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EventFeedback = sequelize.define('EventFeedback', {
  feedback_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'events',
      key: 'event_id'
    },
    onDelete: 'CASCADE'
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 2000] // Limit feedback to 2000 characters
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'event_feedback',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['event_id']
    }
  ]
});

module.exports = EventFeedback;


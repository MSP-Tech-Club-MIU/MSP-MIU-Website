const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Feedback = sequelize.define('Feedback', {
  feedback_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  target_type: {
    type: DataTypes.ENUM('general', 'course', 'event', 'lesson', 'competition'),
    allowNull: false,
    defaultValue: 'general'
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  positives: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 3000]
    }
  },
  negatives: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 3000]
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 3000]
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
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
  anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'activity_feedbacks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['target_type', 'target_id'] },
    { fields: ['course_id'] },
    { fields: ['rating'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Feedback;

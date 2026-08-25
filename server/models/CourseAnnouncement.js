const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseAnnouncement = sequelize.define('CourseAnnouncement', {
  announcement_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'course_id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  send_email: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  target_type: {
    type: DataTypes.ENUM('all', 'enrolled', 'preordered', 'attended', 'individual'),
    defaultValue: 'all',
    allowNull: false
  },
  target_enrollment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'course_enrollments',
      key: 'enrollment_id'
    },
    onDelete: 'SET NULL'
  },
  target_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  cta_label: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  cta_url: {
    type: DataTypes.STRING(512),
    allowNull: true
  },
  approval_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'approved',
    allowNull: false
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  email_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
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
  tableName: 'course_announcements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['course_id']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['target_enrollment_id']
    },
    {
      fields: ['target_type']
    }
  ]
});

module.exports = CourseAnnouncement;

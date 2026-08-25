const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Editable outbound email templates (subject + HTML + plain text).
 * Code defaults in utils/emailTemplates/defaults.js are the fallback.
 */
const EmailTemplate = sequelize.define('EmailTemplate', {
  template_key: {
    type: DataTypes.STRING(64),
    primaryKey: true,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('account', 'announcement', 'competition', 'system'),
    allowNull: false,
    defaultValue: 'system'
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  html_body: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  text_body: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  placeholders: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  meta: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'email_templates',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = EmailTemplate;

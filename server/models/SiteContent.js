const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Key/value CMS store for marketing + site chrome content.
 * content_value is JSON (object or array depending on key).
 */
const SiteContent = sequelize.define('SiteContent', {
  content_key: {
    type: DataTypes.STRING(64),
    primaryKey: true,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  content_value: {
    type: DataTypes.JSON,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'site_content',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = SiteContent;

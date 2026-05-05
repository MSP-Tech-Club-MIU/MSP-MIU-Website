const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CompetitionAnnouncement = sequelize.define('CompetitionAnnouncement', {
  announcement_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  competition_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'competitions',
      key: 'competition_id'
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
    type: DataTypes.ENUM('all', 'team', 'competitor'),
    defaultValue: 'all',
    allowNull: false
  },
  target_team_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'teams',
      key: 'team_id'
    }
  },
  target_user_id: {
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
  tableName: 'competition_announcements',
  timestamps: true,
  indexes: [
    {
      fields: ['competition_id']
    },
    {
      fields: ['created_by']
    }
  ]
});

module.exports = CompetitionAnnouncement;

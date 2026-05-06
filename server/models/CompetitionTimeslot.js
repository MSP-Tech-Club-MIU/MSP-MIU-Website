const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CompetitionTimeslot = sequelize.define('CompetitionTimeslot', {
  timeslot_id: {
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
  start_at: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  end_at: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfterStart(value) {
        if (value && this.start_at && new Date(value) <= new Date(this.start_at)) {
          throw new Error('end_at must be after start_at');
        }
      }
    }
  },
  location_details: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  assigned_team_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'teams',
      key: 'team_id'
    },
    onDelete: 'SET NULL'
  },
  assigned_by_admin_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL'
  },
  assignment_source: {
    type: DataTypes.ENUM('none', 'team_selection', 'admin_assignment'),
    allowNull: false,
    defaultValue: 'none'
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'competition_timeslots',
  timestamps: false,
  indexes: [
    {
      fields: ['competition_id', 'start_at']
    },
    {
      unique: true,
      fields: ['competition_id', 'assigned_team_id']
    }
  ]
});

module.exports = CompetitionTimeslot;

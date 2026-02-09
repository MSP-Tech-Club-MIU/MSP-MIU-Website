const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Team = sequelize.define('Team', {
  team_id: {
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
  team_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'teams',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['competition_id', 'team_name']
    }
  ]
});

module.exports = Team;

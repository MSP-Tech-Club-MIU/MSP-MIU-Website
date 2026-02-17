const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TeamMember = sequelize.define('TeamMember', {
  team_member_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  team_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'team_id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'CASCADE'
  },
  role: {
    type: DataTypes.ENUM('leader', 'member'),
    allowNull: false,
    defaultValue: 'member'
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'team_members',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['team_id', 'user_id']
    }
  ]
});

module.exports = TeamMember;

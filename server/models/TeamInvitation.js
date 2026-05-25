const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TeamInvitation = sequelize.define('TeamInvitation', {
  invitation_id: {
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
  invited_email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  invited_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL'
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  invited_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  responded_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'team_invitations',
  timestamps: false,
  indexes: [
    {
      fields: ['token']
    },
    {
      fields: ['team_id', 'invited_email']
    }
  ]
});

module.exports = TeamInvitation;

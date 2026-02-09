const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Submission = sequelize.define('Submission', {
  submission_id: {
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
  team_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'team_id'
    },
    onDelete: 'CASCADE'
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  submit_type: {
    type: DataTypes.ENUM('zip', 'links', 'zip_and_links'),
    allowNull: false
  },
  r2_key: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Cloudflare R2 storage key for ZIP file'
  },
  repo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  live_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'judged'),
    allowNull: false,
    defaultValue: 'pending'
  },
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'submissions',
  timestamps: false,
  indexes: [
    {
      fields: ['competition_id', 'team_id']
    }
  ]
});

module.exports = Submission;

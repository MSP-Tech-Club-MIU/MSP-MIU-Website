const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CompetitionTask = sequelize.define(
  'CompetitionTask',
  {
    task_id: {
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
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    assets_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  },
  {
    tableName: 'competition_tasks',
    timestamps: false
  }
);

module.exports = CompetitionTask;

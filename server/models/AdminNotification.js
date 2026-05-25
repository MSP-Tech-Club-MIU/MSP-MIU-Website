const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdminNotification = sequelize.define('AdminNotification', {
    notification_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    action_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'e.g. competition_created, competition_updated, competition_deleted, attendance_updated, registration_approved, registration_rejected'
    },
    message: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    performed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    performer_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Cached name of the admin who performed the action'
    },
    performer_position: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Cached position of the admin (President, Vice President, Head)'
    },
    entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'e.g. competition, attendance, registration'
    },
    entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
}, {
    tableName: 'admin_notifications',
    timestamps: false
});

module.exports = AdminNotification;

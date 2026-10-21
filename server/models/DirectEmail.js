const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DirectEmail = sequelize.define('DirectEmail', {
    email_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    sender_email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    sender_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    to_emails: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Comma-separated recipient emails or JSON array'
    },
    cc_emails: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    bcc_emails: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    subject: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    body_html: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    },
    body_text: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    status: {
        type: DataTypes.ENUM('sent', 'failed', 'draft'),
        defaultValue: 'sent',
        allowNull: false
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    message_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    is_starred: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    is_trash: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    tableName: 'direct_emails',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['sender_id'] },
        { fields: ['status'] },
        { fields: ['is_trash'] },
        { fields: ['is_starred'] },
        { fields: ['created_at'] }
    ]
});

module.exports = DirectEmail;

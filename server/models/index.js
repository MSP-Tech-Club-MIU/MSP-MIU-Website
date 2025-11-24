const sequelize = require('../config/db');
const Application = require('./Application');
const Department = require('./Department');
const Board = require('./Board');
const Member = require('./Member');
const Session = require('./Session');
const Attendance = require('./Attendance');
const Event = require('./Event');
const User = require('./User');
const PasswordToken = require('./PasswordToken');
const Leaderboard = require('./Leaderboard');
const Sponsor = require('./Sponsor');
const Suggestion = require('./Suggestion');

// Initialize models
const models = {
  Application,
  Department,
  Board,
  Member,
  Session,
  Attendance,
  Event,
  User,
  PasswordToken,
  Leaderboard,
  Sponsor,
  Suggestion
};

// Set up associations

// Application associations
Application.belongsTo(Department, { 
  foreignKey: 'first_choice', 
  as: 'firstChoiceDepartment' 
});
Application.belongsTo(Department, { 
  foreignKey: 'second_choice', 
  as: 'secondChoiceDepartment',
  allowNull: true
});
Department.hasMany(Application, { 
  foreignKey: 'first_choice', 
  as: 'firstChoiceApplications' 
});
Department.hasMany(Application, { 
  foreignKey: 'second_choice', 
  as: 'secondChoiceApplications' 
});

// Board associations
Board.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department',
  allowNull: true
});
Department.hasMany(Board, {
  foreignKey: 'department_id',
  as: 'boardMembers'
});

// Member associations
Member.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department'
});
Department.hasMany(Member, {
  foreignKey: 'department_id',
  as: 'members'
});

// Attendance associations
Attendance.belongsTo(Event, {
  foreignKey: 'event_id',
  as: 'event'
});
Event.hasMany(Attendance, {
  foreignKey: 'event_id',
  as: 'attendanceRequests'
});

// User associations
User.belongsTo(Department, {
  foreignKey: 'department_id',
  as: 'department',
  allowNull: true
});
Department.hasMany(User, {
  foreignKey: 'department_id',
  as: 'users'
});
User.hasMany(Member, {
  foreignKey: 'user_id',
  as: 'member'
});
User.hasMany(Board, {
  foreignKey: 'user_id',
  as: 'boardMember'
});
User.hasMany(PasswordToken, {
  foreignKey: 'user_id',
  as: 'passwordTokens'
});

Member.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});
Board.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});
PasswordToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Leaderboard associations
Leaderboard.belongsTo(Member, {
  foreignKey: 'member_id',
  as: 'member'
});
Member.hasOne(Leaderboard, {
  foreignKey: 'member_id',
  as: 'leaderboard'
});

// Suggestion associations
Suggestion.belongsTo(Member, {
  foreignKey: 'member_id',
  as: 'member'
});
Member.hasMany(Suggestion, {
  foreignKey: 'member_id',
  as: 'suggestions'
});

// Sync models with database
const syncModels = async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log('Models synchronized with database successfully');
  } catch (error) {
    console.error('Error synchronizing models:', error);
    console.log('Note: If you have existing data, you may need to manually adjust the schema');
  }
};

module.exports = {
  ...models,
  sequelize,
  syncModels
};

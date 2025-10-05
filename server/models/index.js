const sequelize = require('../config/db');
const Application = require('./Application');
const Department = require('./Department');
const Board = require('./Board');
const Member = require('./Member');
const Session = require('./Session');
const Attendance = require('./Attendance');
const Event = require('./Event');

// Initialize models
const models = {
  Application,
  Department,
  Board,
  Member,
  Session,
  Attendance,
  Event
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
Attendance.belongsTo(Session, {
  foreignKey: 'session_id',
  as: 'session'
});
Attendance.belongsTo(Member, {
  foreignKey: 'member_id',
  as: 'member'
});
Session.hasMany(Attendance, {
  foreignKey: 'session_id',
  as: 'attendances'
});
Member.hasMany(Attendance, {
  foreignKey: 'member_id',
  as: 'attendances'
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

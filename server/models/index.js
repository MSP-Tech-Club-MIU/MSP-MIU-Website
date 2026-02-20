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
const Announcement = require('./Announcement');

// Competition-related models
const Competition = require('./Competition');
const Team = require('./Team');
const TeamMember = require('./TeamMember');
const TeamInvitation = require('./TeamInvitation');
const Submission = require('./Submission');
const Quiz = require('./Quiz');
const QuizQuestion = require('./QuizQuestion');
const QuizOption = require('./QuizOption');
const QuizAttempt = require('./QuizAttempt');
const QuizAnswer = require('./QuizAnswer');

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
  Suggestion,
  Announcement,
  Competition,
  Team,
  TeamMember,
  TeamInvitation,
  Submission,
  Quiz,
  QuizQuestion,
  QuizOption,
  QuizAttempt,
  QuizAnswer
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
User.hasMany(Announcement, {
  foreignKey: 'created_by',
  as: 'announcements'
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
Announcement.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
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

// ===== COMPETITION ASSOCIATIONS =====

// Competition associations
Competition.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});
User.hasMany(Competition, {
  foreignKey: 'created_by',
  as: 'competitions'
});

// Team associations
Team.belongsTo(Competition, {
  foreignKey: 'competition_id',
  as: 'competition',
  onDelete: 'CASCADE'
});
Competition.hasMany(Team, {
  foreignKey: 'competition_id',
  as: 'teams'
});

Team.belongsTo(User, {
  foreignKey: 'created_by_user_id',
  as: 'creator'
});
User.hasMany(Team, {
  foreignKey: 'created_by_user_id',
  as: 'createdTeams'
});

// TeamMember associations
TeamMember.belongsTo(Team, {
  foreignKey: 'team_id',
  as: 'team',
  onDelete: 'CASCADE'
});
Team.hasMany(TeamMember, {
  foreignKey: 'team_id',
  as: 'members'
});

TeamMember.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE'
});
User.hasMany(TeamMember, {
  foreignKey: 'user_id',
  as: 'teamMemberships'
});

// TeamInvitation associations
TeamInvitation.belongsTo(Team, {
  foreignKey: 'team_id',
  as: 'team',
  onDelete: 'CASCADE'
});
Team.hasMany(TeamInvitation, {
  foreignKey: 'team_id',
  as: 'invitations'
});

TeamInvitation.belongsTo(User, {
  foreignKey: 'invited_user_id',
  as: 'invitedUser',
  onDelete: 'SET NULL'
});
User.hasMany(TeamInvitation, {
  foreignKey: 'invited_user_id',
  as: 'receivedInvitations'
});

// Submission associations
Submission.belongsTo(Competition, {
  foreignKey: 'competition_id',
  as: 'competition',
  onDelete: 'CASCADE'
});
Competition.hasMany(Submission, {
  foreignKey: 'competition_id',
  as: 'submissions'
});

Submission.belongsTo(Team, {
  foreignKey: 'team_id',
  as: 'team',
  onDelete: 'CASCADE'
});
Team.hasMany(Submission, {
  foreignKey: 'team_id',
  as: 'submissions'
});

// Quiz associations
Quiz.belongsTo(Competition, {
  foreignKey: 'competition_id',
  as: 'competition',
  onDelete: 'CASCADE'
});
Competition.hasMany(Quiz, {
  foreignKey: 'competition_id',
  as: 'quizzes'
});

Quiz.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});
User.hasMany(Quiz, {
  foreignKey: 'created_by',
  as: 'createdQuizzes'
});

// QuizQuestion associations
QuizQuestion.belongsTo(Quiz, {
  foreignKey: 'quiz_id',
  as: 'quiz',
  onDelete: 'CASCADE'
});
Quiz.hasMany(QuizQuestion, {
  foreignKey: 'quiz_id',
  as: 'questions'
});

// QuizOption associations
QuizOption.belongsTo(QuizQuestion, {
  foreignKey: 'question_id',
  as: 'question',
  onDelete: 'CASCADE'
});
QuizQuestion.hasMany(QuizOption, {
  foreignKey: 'question_id',
  as: 'options'
});

// QuizAttempt associations
QuizAttempt.belongsTo(Quiz, {
  foreignKey: 'quiz_id',
  as: 'quiz',
  onDelete: 'CASCADE'
});
Quiz.hasMany(QuizAttempt, {
  foreignKey: 'quiz_id',
  as: 'attempts'
});

QuizAttempt.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE'
});
User.hasMany(QuizAttempt, {
  foreignKey: 'user_id',
  as: 'quizAttempts'
});

// QuizAnswer associations
QuizAnswer.belongsTo(QuizAttempt, {
  foreignKey: 'attempt_id',
  as: 'attempt',
  onDelete: 'CASCADE'
});
QuizAttempt.hasMany(QuizAnswer, {
  foreignKey: 'attempt_id',
  as: 'answers'
});

QuizAnswer.belongsTo(QuizQuestion, {
  foreignKey: 'question_id',
  as: 'question',
  onDelete: 'CASCADE'
});
QuizQuestion.hasMany(QuizAnswer, {
  foreignKey: 'question_id',
  as: 'answers'
});

QuizAnswer.belongsTo(QuizOption, {
  foreignKey: 'selected_option_id',
  as: 'selectedOption',
  onDelete: 'SET NULL'
});
QuizOption.hasMany(QuizAnswer, {
  foreignKey: 'selected_option_id',
  as: 'answers'
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

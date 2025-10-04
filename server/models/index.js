const sequelize = require('../config/db');
const Application = require('./Application');
const Department = require('./Department');

// Initialize models
const models = {
  Application,
  Department
};

// Set up associations
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

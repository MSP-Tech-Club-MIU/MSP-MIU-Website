// Department mapping for the application - matches database ENUM
export const departments = [
  { id: 1, name: 'Software Development' },
  { id: 2, name: 'Technical Training' },
  { id: 3, name: 'Media & Content Creation' },
  { id: 4, name: 'Public Relations' },
  { id: 5, name: 'Human Resources' },
  { id: 6, name: 'Event Planning' },
];

// Helper functions
export const getDepartmentById = (id) => {
  return departments.find(dept => dept.id === parseInt(id));
};

export const getDepartmentIdByName = (name) => {
  const dept = departments.find(dept => dept.name === name);
  return dept ? dept.id : null;
};

export const getDepartmentNameById = (id) => {
  const dept = getDepartmentById(id);
  return dept ? dept.name : 'Unknown Department';
};

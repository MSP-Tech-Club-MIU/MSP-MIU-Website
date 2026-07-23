import React, { memo } from 'react';
import PieChart from './PieChart';

const ChartsSection = memo(({ firstChoiceData, secondChoiceData, facultyData, theme = 'light' }) => {
  const isAdmin = theme === 'admin';

  if (isAdmin) {
    return (
      <div className="RegAdmin__charts">
        <PieChart data={firstChoiceData} title="First Choice Departments" size={180} theme="admin" />
        <PieChart data={secondChoiceData} title="Second Choice Departments" size={180} theme="admin" />
        <PieChart data={facultyData} title="Faculties Distribution" size={180} theme="admin" />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      marginBottom: '30px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <PieChart data={firstChoiceData} title="First Choice Departments" size={180} />
      <PieChart data={secondChoiceData} title="Second Choice Departments" size={180} />
      <PieChart data={facultyData} title="Faculties Distribution" size={180} />
    </div>
  );
});

ChartsSection.displayName = 'ChartsSection';

export default ChartsSection;

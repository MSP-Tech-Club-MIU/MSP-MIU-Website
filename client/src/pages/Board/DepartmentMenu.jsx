import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { departments } from '../../data/departments';
import './Board.css';

const DepartmentMenu = memo(({ selectedDepartment, onSelectDepartment }) => {
  const allDepartments = useMemo(() => {
    // Get the specific departments for Founder, President and VP
    const founder = departments.find(d => d.id === 9);

    // Combine President (8) and VP (7) into one button
    const presidentAndVp = { id: 'president-vp', name: 'President & VP' };
    const ambasador = { id: 'ambasador', name: 'Ambasador' };

    // Filter out these three from the main list and add them at the beginning
    const otherDepartments = departments.filter(d => ![7, 8, 9].includes(d.id));

    // Build the menu: Founder, President & VP first, then others
    const menuItems = [];
    if (ambasador) menuItems.push(ambasador);
    if (founder) menuItems.push(founder);
    menuItems.push(presidentAndVp);
    menuItems.push(...otherDepartments);

    return menuItems;
  }, []);

  return (
    <motion.div
      className="DepartmentMenu"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="DepartmentMenu__container">
        {allDepartments.map((dept) => {
          // Check if button should be active
          const isActive = selectedDepartment === dept.id;

          return (
            <motion.button
              key={dept.id || 'all'}
              className={`DepartmentMenu__button ${isActive ? 'DepartmentMenu__button--active' : ''}`}
              onClick={() => onSelectDepartment(dept.id)}
            >
              {dept.name}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
});

DepartmentMenu.displayName = 'DepartmentMenu';
export default DepartmentMenu;


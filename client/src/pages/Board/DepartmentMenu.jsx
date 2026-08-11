import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BOARD_POSITION_NAMES } from '../../data/departments';
import './Board.css';

const HIDDEN_FROM_BOARD_MENU = new Set([...BOARD_POSITION_NAMES, 'Competitor']);

const DepartmentMenu = memo(({ departments = [], selectedDepartment, onSelectDepartment }) => {
  const allDepartments = useMemo(() => {
    const founder = departments.find((d) => d.name === 'Founder');
    const presidentAndVp = { id: 'president-vp', name: 'President & VP' };
    const otherDepartments = departments.filter((d) => !HIDDEN_FROM_BOARD_MENU.has(d.name));

    const menuItems = [];
    if (founder) menuItems.push(founder);
    if (departments.some((d) => d.name === 'President' || d.name === 'Vice President')) {
      menuItems.push(presidentAndVp);
    }
    menuItems.push(...otherDepartments);

    return menuItems;
  }, [departments]);

  return (
    <motion.div
      className="DepartmentMenu"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="DepartmentMenu__container">
        {allDepartments.map((dept) => {
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

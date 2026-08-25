import React, { memo } from 'react';
import { motion } from 'framer-motion';
import './Board.css';

const BoardHeader = memo(() => {
  return (
    <motion.section 
      className="BoardHeader"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="BoardHeader__content">
        <h1 className="BoardHeader__title">Meet Our Board</h1>
        <p className="BoardHeader__subtitle">
          The passionate leaders driving innovation and community growth at MSP Tech Club
        </p>
      </div>
    </motion.section>
  );
});

BoardHeader.displayName = 'BoardHeader';
export default BoardHeader;

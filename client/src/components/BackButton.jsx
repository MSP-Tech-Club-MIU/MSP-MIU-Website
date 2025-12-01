import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import './BackButton.css';

const BackButton = ({ to, label, onClick, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.button
      className={`BackButton ${className}`}
      onClick={handleClick}
      whileHover={{ x: -4 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label || 'Go back'}
    >
      <FiArrowLeft className="BackButton__icon" />
      <span className="BackButton__label">{label || 'Back'}</span>
    </motion.button>
  );
};

export default BackButton;


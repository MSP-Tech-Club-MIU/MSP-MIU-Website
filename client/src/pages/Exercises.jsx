import React from 'react';
import BackButton from '../components/BackButton';
import './PageBase.css';

export const Exercises = () => (
  <section className="PageBase">
    <BackButton to="/" label="Back to Home" />
    <h1>Exercises</h1>
  </section>
);

export default Exercises;
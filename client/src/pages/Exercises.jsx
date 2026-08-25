import React from 'react';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import './PageBase.css';

export const Exercises = () => (
  <section className="PageBase">
    <SEO
      title="Exercises"
      description="Practice exercises from MSP Tech Club at Misr International University."
      url="/exercises"
    />
    <BackButton to="/" label="Back to Home" />
    <h1>Exercises</h1>
  </section>
);

export default Exercises;
import React from 'react';
import BackButton from '../components/BackButton';
import './PageBase.css';

export const Suggestions = () => (
  <section className="PageBase">
    <BackButton to="/" label="Back to Home" />
    <h1>Suggestions</h1>
  </section>
);

export default Suggestions;
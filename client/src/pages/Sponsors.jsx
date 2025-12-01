import React from 'react';
import BackButton from '../components/BackButton';
import './PageBase.css';

export const Sponsors = () => (
  <section className="PageBase">
    <BackButton to="/" label="Back to Home" />
    <h1>Sponsors</h1>
  </section>
);

export default Sponsors;
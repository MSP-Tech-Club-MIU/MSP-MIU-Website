import React from 'react';
import BackButton from '../components/BackButton';
import './PageBase.css';

export const Leaderboard = () => (
  <section className="PageBase">
    <BackButton to="/" label="Back to Home" />
    <h1>Leaderboard</h1>
  </section>
);

export default Leaderboard;
import React from 'react';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import './PageBase.css';

export const Leaderboard = () => (
  <section className="PageBase">
    <SEO
      title="Leaderboard"
      description="See how members rank across MSP Tech Club activities at MIU."
      url="/leaderboard"
    />
    <BackButton to="/" label="Back to Home" />
    <h1>Leaderboard</h1>
  </section>
);

export default Leaderboard;
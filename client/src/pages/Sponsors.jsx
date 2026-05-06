import React, { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import SponsorCard from '../components/SponsorCard';
import './PageBase.css';
import './Sponsors.css';

export const Sponsors = () => {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ApiService.getSponsors();
        setSponsors(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || 'Failed to load sponsors');
        setSponsors([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="PageBase SponsorsPage">
      <SEO
        title="Sponsors | MSP Tech Club"
        description="Organizations and partners supporting MSP Tech Club at MIU."
      />
      <BackButton to="/" label="Back to Home" />
      <h1>Sponsors</h1>
      <p className="SponsorsPage__intro">
        Partners who help us grow the community. Each organization is showcased with room for their story.
      </p>
      {loading && <PageLoader />}
      {error && !loading && (
        <p className="SponsorsPage__error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && sponsors.length === 0 && (
        <p className="SponsorsPage__empty">No sponsors listed yet.</p>
      )}
      {!loading && sponsors.length > 0 && (
        <ul className="SponsorsPage__grid">
          {sponsors.map((s) => (
            <SponsorCard key={s.sponsor_id} sponsor={s} />
          ))}
        </ul>
      )}
    </section>
  );
};

export default Sponsors;

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { FiCalendar, FiClock, FiMapPin, FiCheckCircle, FiLock } from 'react-icons/fi';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import './CompetitionTimeslotPage.css';

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const CompetitionTimeslotPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = String(searchParams.get('token') || '').trim();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [payload, setPayload] = useState({
    competition: null,
    team: null,
    current_selection: null,
    slots: []
  });

  const currentTeamId = useMemo(() => Number(payload?.team?.team_id || 0), [payload]);

  const load = async () => {
    if (!token) {
      setError('Missing token. Please open the link from your email.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await ApiService.getCompetitionTimeslotSelectionView(id, token);
      setPayload(result?.data || { competition: null, team: null, current_selection: null, slots: [] });
    } catch (err) {
      setError(err.message || 'Failed to load timeslots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const chooseSlot = async (timeslotId) => {
    try {
      setSavingId(timeslotId);
      setError('');
      setNotice('');
      await ApiService.submitCompetitionTimeslotSelection(id, token, timeslotId);
      setNotice('Your timeslot has been saved successfully.');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to select timeslot');
    } finally {
      setSavingId(null);
    }
  };

  const competition = payload?.competition;
  const slots = Array.isArray(payload?.slots) ? payload.slots : [];

  return (
    <section className="CompetitionTimeslotPage">
      <SEO
        title="Competition Timeslot"
        description="Choose your competition timeslot"
        noindex
      />
      <BackButton to={`/competitions/${id}`} label="Back to Competition" />

      <div className="CompetitionTimeslotPage__container">
        <header className="CompetitionTimeslotPage__header">
          <h1>Competition Timeslot</h1>
          <p>Select one available timeslot for your team. Taken slots cannot be chosen.</p>
          {competition ? (
            <div className="CompetitionTimeslotPage__metaRow">
              <span className="CompetitionTimeslotPage__badge">
                <FiMapPin size={14} />
                {competition.location_type === 'online' ? 'Online' : 'On campus'}
              </span>
              <span className="CompetitionTimeslotPage__badge">
                <FiCalendar size={14} />
                {competition.title || `Competition #${competition.competition_id}`}
              </span>
            </div>
          ) : null}
          {payload?.team ? (
            <div className="CompetitionTimeslotPage__team">Team: <strong>{payload.team.team_name}</strong></div>
          ) : null}
        </header>

        {loading ? <div className="CompetitionTimeslotPage__state">Loading timeslots...</div> : null}
        {!loading && error ? <div className="CompetitionTimeslotPage__error">{error}</div> : null}
        {!loading && notice ? <div className="CompetitionTimeslotPage__success">{notice}</div> : null}

        {!loading && !error ? (
          <div className="CompetitionTimeslotPage__grid">
            {slots.length === 0 ? (
              <div className="CompetitionTimeslotPage__state">No available slots yet. Please try again later.</div>
            ) : (
              slots.map((slot) => {
                const assignedTeamId = Number(slot.assigned_team_id || 0);
                const isMine = assignedTeamId && assignedTeamId === currentTeamId;
                const isTakenByOther = assignedTeamId && assignedTeamId !== currentTeamId;
                const disabled = Boolean(isTakenByOther || savingId);

                return (
                  <article
                    key={slot.timeslot_id}
                    className={`CompetitionTimeslotPage__slot ${isMine ? 'CompetitionTimeslotPage__slot--mine' : ''} ${isTakenByOther ? 'CompetitionTimeslotPage__slot--taken' : ''}`}
                  >
                    <div className="CompetitionTimeslotPage__slotTop">
                      <h3>Slot #{slot.timeslot_id}</h3>
                      {isMine ? (
                        <span className="CompetitionTimeslotPage__tag CompetitionTimeslotPage__tag--mine">
                          <FiCheckCircle size={14} /> Your choice
                        </span>
                      ) : null}
                      {isTakenByOther ? (
                        <span className="CompetitionTimeslotPage__tag CompetitionTimeslotPage__tag--taken">
                          <FiLock size={14} /> Taken
                        </span>
                      ) : null}
                    </div>

                    <p><FiClock size={14} /> From: {formatDateTime(slot.start_at)}</p>
                    <p><FiClock size={14} /> To: {formatDateTime(slot.end_at)}</p>
                    {slot.start_at && slot.end_at ? (
                      <p className="CompetitionTimeslotPage__duration">
                        <FiClock size={14} /> Discussion length: <strong>{Math.round((new Date(slot.end_at) - new Date(slot.start_at)) / (1000 * 60))} minutes</strong>
                      </p>
                    ) : null}
                    <p><FiMapPin size={14} /> {slot.location_details || competition?.location_details || (competition?.location_type === 'online' ? 'Online meeting details will be shared.' : 'On-campus location will be shared.')}</p>

                    <button
                      type="button"
                      className="CompetitionTimeslotPage__btn"
                      onClick={() => chooseSlot(slot.timeslot_id)}
                      disabled={disabled}
                    >
                      {savingId === slot.timeslot_id ? 'Saving...' : isMine ? 'Keep this slot' : isTakenByOther ? 'Unavailable' : 'Choose this slot'}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        ) : null}

        <div className="CompetitionTimeslotPage__footerActions">
          <button type="button" onClick={() => navigate(`/competitions/${id}`)}>
            Return to competition page
          </button>
        </div>
      </div>
    </section>
  );
};

export default CompetitionTimeslotPage;

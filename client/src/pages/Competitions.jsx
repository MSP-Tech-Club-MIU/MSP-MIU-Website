import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import Pagination from '../components/Pagination';
import './Competitions.css';
import { 
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiUsers, 
  FiAward,
  FiCheckCircle,
  FiLock,
  FiEye
} from 'react-icons/fi';

const Competitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, open, locked, judging, finished (+ draft for board/admin)
  const [sort, setSort] = useState('desc'); // desc, asc
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "MSP Tech Club Competitions",
    "description": "Participate in MSP Tech Club competitions and challenges. Showcase your skills, compete with peers, and win prizes.",
    "organizer": {
      "@type": "Organization",
      "name": "MSP Tech Club - MIU",
      "url": "https://msp-miu.tech"
    }
  };

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (ApiService.isAuthenticated()) {
        try {
          const user = await ApiService.getProfile();
          setUserRole(user.role);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };
    checkUserRole();
  }, []);

  // Fetch competitions from API
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoading(true);
        setError(null);
        const filters = { page, limit: 20 };
        if (filter !== 'all') {
          filters.status = filter;
        }
        const result = await ApiService.getCompetitions(filters);
        const list = Array.isArray(result) ? result : (result.data || []);
        setCompetitions(list);
        setPagination(Array.isArray(result) ? null : (result.pagination || null));
      } catch (err) {
        console.error('Error fetching competitions:', err);
        setError(err.message || 'Failed to load competitions');
        setCompetitions([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, [page, filter]);

  const canAccessAdminFeatures = userRole === 'board' || userRole === 'admin';
  const availableStatuses = canAccessAdminFeatures
    ? ['all', 'open', 'draft', 'locked', 'judging', 'finished']
    : ['all', 'open', 'locked', 'judging', 'finished'];

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { icon: FiEye, color: '#757575', label: 'Draft' },
      open: { icon: FiCheckCircle, color: '#83BD00', label: 'Open' },
      locked: { icon: FiLock, color: '#FFC107', label: 'Locked' },
      judging: { icon: FiAward, color: '#03A9F4', label: 'Judging' },
      finished: { icon: FiCheckCircle, color: '#F4581F', label: 'Finished' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className="CompetitionCard__status" style={{ color: config.color }}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const filteredCompetitions = useMemo(() => {
    // Status filtering is handled server-side; hide drafts for non-admins if any slip through
    let filtered = canAccessAdminFeatures
      ? competitions
      : competitions.filter((comp) => comp.status !== 'draft');
    
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.start_at);
      const dateB = new Date(b.start_at);
      return sort === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [competitions, sort, canAccessAdminFeatures]);

  useEffect(() => {
    if (!availableStatuses.includes(filter)) {
      setFilter('all');
      setPage(1);
    }
  }, [availableStatuses, filter]);

  const handleFilterChange = (status) => {
    setFilter(status);
    setPage(1);
  };

  const handleCompetitionClick = (competitionId) => {
    navigate(`/competitions/${competitionId}`);
  };

  const animationVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <section className="CompetitionsPage">
      <BackButton to="/" label="Back to Home" />
      <SEO
        title="Competitions"
        description="Participate in MSP Tech Club competitions and challenges. Showcase your skills, compete with peers, and win prizes."
        keywords="MSP competitions, tech challenges, coding competitions, hackathons, MIU competitions"
        structuredData={JSON.stringify(structuredData)}
      />

      <div className="CompetitionsPage__container">
        <header className="CompetitionsPage__header">
          <h1 className="CompetitionsPage__title">Competitions</h1>
          <p className="CompetitionsPage__subtitle">
            Join our competitions, showcase your skills, and compete for amazing prizes
          </p>
        </header>

        {error ? (
          <div className="CompetitionsPage__error">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="CompetitionsPage__controls">
              <div className="CompetitionsPage__filters">
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    className={`CompetitionsPage__filterBtn ${filter === status ? 'active' : ''}`}
                    onClick={() => handleFilterChange(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              <div className="CompetitionsPage__sort">
                <label className="CompetitionsPage__sortLabel">Sort by:</label>
                <select
                  className="CompetitionsPage__sortSelect"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {filteredCompetitions.length === 0 ? (
              <div className="CompetitionsPage__empty">
                <FiAward size={80} />
                <h3>No Competitions Found</h3>
                <p>Check back soon for upcoming competitions!</p>
              </div>
            ) : (
              <>
                <div className="CompetitionsPage__grid">
                  <AnimatePresence mode="wait">
                    {filteredCompetitions.map((competition, index) => (
                      <motion.div
                        key={competition.competition_id}
                        className="CompetitionCard"
                        variants={animationVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        onClick={() => handleCompetitionClick(competition.competition_id)}
                      >
                        <div className="CompetitionCard__header">
                          <h3 className="CompetitionCard__title">{competition.title}</h3>
                          {getStatusBadge(competition.status)}
                        </div>

                        <p className="CompetitionCard__description">
                          {competition.description}
                        </p>

                        <div className="CompetitionCard__details">
                          <div className="CompetitionCard__detail">
                            <FiCalendar size={16} />
                            <span>
                              <strong>Start:</strong> {formatDateTime(competition.start_at)}
                            </span>
                          </div>
                          <div className="CompetitionCard__detail">
                            <FiClock size={16} />
                            <span>
                              <strong>End:</strong> {formatDateTime(competition.end_at)}
                            </span>
                          </div>
                          <div className="CompetitionCard__detail">
                            <FiMapPin size={16} />
                            <span>
                              <strong>{competition.location_type === 'on-campus' ? 'On-Campus' : 'Online'}:</strong>{' '}
                              {competition.location_details || 'TBA'}
                            </span>
                          </div>
                          <div className="CompetitionCard__detail">
                            <FiUsers size={16} />
                            <span>
                              <strong>Team Size:</strong> {competition.min_team_size}-{competition.max_team_size} members
                            </span>
                          </div>
                        </div>

                        <div className="CompetitionCard__footer">
                          <button className="CompetitionCard__btn">
                            View Details
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <Pagination pagination={pagination} onPageChange={setPage} />
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Competitions;

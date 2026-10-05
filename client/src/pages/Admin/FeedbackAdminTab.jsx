import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiStar,
  FiThumbsUp,
  FiTrendingUp,
  FiEye,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiCheckCircle,
  FiX,
  FiMessageSquare,
  FiCalendar
} from 'react-icons/fi';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import './FeedbackAdminTab.css';

const LIMIT = 25;

export default function FeedbackAdminTab({ onAlert }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Filters
  const [targetType, setTargetType] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Selected feedback for detail view
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        ApiService.getAdminFeedbacks({
          page,
          limit: LIMIT,
          target_type: targetType !== 'all' ? targetType : undefined,
          rating: ratingFilter || undefined,
          search: debouncedSearch.trim() || undefined
        }),
        ApiService.getAdminFeedbackStats().catch(() => null)
      ]);

      setFeedbacks(Array.isArray(listRes?.data) ? listRes.data : []);
      setPagination(listRes?.pagination || null);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Error fetching admin feedbacks:', err);
      onAlert?.({ type: 'error', message: err.message || 'Failed to load feedbacks' });
    } finally {
      setLoading(false);
    }
  }, [page, targetType, ratingFilter, debouncedSearch, onAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (feedbackId) => {
    const ok = await confirmModal({
      title: 'Delete Feedback Entry?',
      message: 'Are you sure you want to permanently delete this feedback? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await ApiService.deleteAdminFeedbackRecord(feedbackId);
      onAlert?.({ type: 'success', message: 'Feedback entry deleted successfully.' });
      if (selectedFeedback?.feedback_id === feedbackId) {
        setSelectedFeedback(null);
      }
      loadData();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to delete feedback' });
    }
  };

  const getTargetTitle = (f) => {
    if (f.target_type === 'course') return f.course?.title || `Course #${f.target_id}`;
    if (f.target_type === 'event') return f.event?.name || `Event #${f.target_id}`;
    if (f.target_type === 'lesson') {
      const lessonTitle = f.lesson?.title || `Lesson #${f.target_id}`;
      const courseTitle = f.lesson?.course?.title ? ` (${f.lesson.course.title})` : '';
      return `${lessonTitle}${courseTitle}`;
    }
    if (f.target_type === 'competition') return f.competition?.title || `Competition #${f.target_id}`;
    return 'General Club Feedback';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="AdminPanel__section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="AdminPanel__sectionTitle" style={{ margin: 0 }}>
          <FiStar style={{ color: '#ffc107', marginRight: 8 }} /> Activity Feedback & Performance
        </h2>
        <button
          type="button"
          className="AdminPanel__actionBtn"
          onClick={loadData}
          disabled={loading}
          title="Refresh"
        >
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <>
          <div className="FeedbackAdminTab__kpiGrid">
            <div className="FeedbackAdminTab__kpiCard">
              <div className="FeedbackAdminTab__kpiTitle">Total Submissions</div>
              <div className="FeedbackAdminTab__kpiValue">{stats.totalCount || 0}</div>
            </div>
            <div className="FeedbackAdminTab__kpiCard FeedbackAdminTab__kpiCard--rating">
              <div className="FeedbackAdminTab__kpiTitle">Overall Avg Rating</div>
              <div className="FeedbackAdminTab__kpiValue">
                <FiStar style={{ color: '#ffc107', fontSize: 24 }} />
                {stats.overallAverageRating ? `${stats.overallAverageRating} / 5.0` : 'N/A'}
              </div>
            </div>
            <div className="FeedbackAdminTab__kpiCard FeedbackAdminTab__kpiCard--positives">
              <div className="FeedbackAdminTab__kpiTitle">Positives Highlighted</div>
              <div className="FeedbackAdminTab__kpiValue">
                <FiThumbsUp style={{ color: '#4caf50', fontSize: 22 }} />
                {stats.countsWithPositives || 0}
              </div>
            </div>
            <div className="FeedbackAdminTab__kpiCard FeedbackAdminTab__kpiCard--negatives">
              <div className="FeedbackAdminTab__kpiTitle">Critiques & Improvements</div>
              <div className="FeedbackAdminTab__kpiValue">
                <FiTrendingUp style={{ color: '#ff9800', fontSize: 22 }} />
                {stats.countsWithNegatives || 0}
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          {stats.byType && (
            <div className="FeedbackAdminTab__breakdown">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9cb8d9', alignSelf: 'center' }}>
                Category Averages:
              </span>
              {Object.entries(stats.byType).map(([type, item]) => (
                <div key={type} className="FeedbackAdminTab__breakdownPill">
                  <span style={{ textTransform: 'capitalize' }}>{type}:</span>
                  <span className="FeedbackAdminTab__breakdownRating">
                    {item.avgRating ? `${item.avgRating}*` : 'N/A'}
                  </span>
                  <span style={{ opacity: 0.7 }}>({item.count})</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Filter Bar */}
      <div className="FeedbackAdminTab__controls">
        <select
          className="FeedbackAdminTab__select"
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Categories</option>
          <option value="general">General Club</option>
          <option value="course">Courses</option>
          <option value="lesson">Lessons</option>
          <option value="event">Events</option>
          <option value="competition">Competitions</option>
        </select>

        <select
          className="FeedbackAdminTab__select"
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars only</option>
          <option value="4">4 Stars only</option>
          <option value="3">3 Stars only</option>
          <option value="2">2 Stars only</option>
          <option value="1">1 Star only</option>
        </select>

        <input
          type="text"
          className="FeedbackAdminTab__search"
          placeholder="Search by keywords, positives, negatives, name, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Feedbacks Table */}
      {loading ? (
        <div className="AdminPanel__empty">
          <p>Loading feedback records...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>No feedback found matching current filters.</p>
        </div>
      ) : (
        <table className="AdminPanel__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Activity / Target</th>
              <th>Rating</th>
              <th>Positives (What went well)</th>
              <th>Negatives (Improvements)</th>
              <th>Submitter</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((f) => (
              <tr key={f.feedback_id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(f.created_at)}</td>
                <td>
                  <span className={`FeedbackBadge FeedbackBadge--${f.target_type}`}>
                    {f.target_type}
                  </span>
                </td>
                <td style={{ fontWeight: 600, maxWidth: 220 }}>{getTargetTitle(f)}</td>
                <td>
                  {f.rating ? (
                    <div className="FeedbackAdminTab__stars" title={`${f.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <FiStar
                          key={s}
                          style={{
                            fill: s <= f.rating ? '#ffc107' : 'none',
                            color: s <= f.rating ? '#ffc107' : 'rgba(255,255,255,0.2)'
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>None</span>
                  )}
                </td>
                <td>
                  <div className="FeedbackAdminTab__snippet FeedbackAdminTab__snippet--pos">
                    {f.positives || <span style={{ opacity: 0.4 }}>—</span>}
                  </div>
                </td>
                <td>
                  <div className="FeedbackAdminTab__snippet FeedbackAdminTab__snippet--neg">
                    {f.negatives || <span style={{ opacity: 0.4 }}>—</span>}
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>
                  {f.anonymous ? (
                    <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Anonymous</span>
                  ) : (
                    <div>
                      <div>{f.name || f.user?.full_name || 'Guest'}</div>
                      <div style={{ opacity: 0.6, fontSize: '0.78rem' }}>{f.email || f.user?.email || ''}</div>
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    style={{ marginRight: 6 }}
                    onClick={() => setSelectedFeedback(f)}
                    title="View Full Details"
                  >
                    <FiEye /> View
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                    onClick={() => handleDelete(f.feedback_id)}
                    title="Delete Feedback"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Full Detail Modal */}
      <AnimatePresence>
        {selectedFeedback && (
          <div className="FeedbackDetailModal__backdrop" onClick={() => setSelectedFeedback(null)}>
            <motion.div
              className="FeedbackDetailModal__card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="FeedbackModal__close"
                onClick={() => setSelectedFeedback(null)}
              >
                <FiX />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className={`FeedbackBadge FeedbackBadge--${selectedFeedback.target_type}`}>
                  {selectedFeedback.target_type}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#9cb8d9' }}>
                  {formatDate(selectedFeedback.created_at)}
                </span>
              </div>

              <h2 style={{ fontSize: '1.4rem', margin: '0 0 16px', color: '#fff' }}>
                {getTargetTitle(selectedFeedback)}
              </h2>

              {/* Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: '0.9rem', color: '#b0cfee', fontWeight: 600 }}>Performance Rating:</span>
                {selectedFeedback.rating ? (
                  <div className="FeedbackAdminTab__stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <FiStar
                        key={s}
                        style={{
                          fill: s <= selectedFeedback.rating ? '#ffc107' : 'none',
                          color: s <= selectedFeedback.rating ? '#ffc107' : 'rgba(255,255,255,0.2)',
                          fontSize: 20
                        }}
                      />
                    ))}
                    <span style={{ marginLeft: 8, color: '#ffc107', fontWeight: 700 }}>
                      {selectedFeedback.rating} / 5
                    </span>
                  </div>
                ) : (
                  <span style={{ opacity: 0.6 }}>No rating provided</span>
                )}
              </div>

              {/* Positives */}
              {selectedFeedback.positives && (
                <div className="FeedbackDetailModal__section FeedbackDetailModal__section--pos">
                  <div className="FeedbackDetailModal__label" style={{ color: '#4caf50' }}>
                    <FiThumbsUp /> What went well (Positives)
                  </div>
                  <p className="FeedbackDetailModal__text">{selectedFeedback.positives}</p>
                </div>
              )}

              {/* Negatives */}
              {selectedFeedback.negatives && (
                <div className="FeedbackDetailModal__section FeedbackDetailModal__section--neg">
                  <div className="FeedbackDetailModal__label" style={{ color: '#ff9800' }}>
                    <FiTrendingUp /> What could be improved (Negatives & Critiques)
                  </div>
                  <p className="FeedbackDetailModal__text">{selectedFeedback.negatives}</p>
                </div>
              )}

              {/* Overall Comments */}
              {selectedFeedback.feedback && (
                <div className="FeedbackDetailModal__section">
                  <div className="FeedbackDetailModal__label" style={{ color: '#81d4fa' }}>
                    <FiMessageSquare /> Additional Remarks & Feedback
                  </div>
                  <p className="FeedbackDetailModal__text">{selectedFeedback.feedback}</p>
                </div>
              )}

              {/* Submitter Info */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(142, 194, 240, 0.15)', fontSize: '0.88rem', color: '#9cb8d9' }}>
                <div>
                  <strong>Submitted by: </strong>
                  {selectedFeedback.anonymous
                    ? 'Anonymous'
                    : selectedFeedback.name || selectedFeedback.user?.full_name || 'Guest'}
                </div>
                {!selectedFeedback.anonymous && (selectedFeedback.email || selectedFeedback.user?.email) && (
                  <div>
                    <strong>Email: </strong>
                    {selectedFeedback.email || selectedFeedback.user?.email}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button
                  type="button"
                  className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                  onClick={() => handleDelete(selectedFeedback.feedback_id)}
                >
                  <FiTrash2 /> Delete Feedback
                </button>
                <button
                  type="button"
                  className="FeedbackModal__btn FeedbackModal__btn--cancel"
                  onClick={() => setSelectedFeedback(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

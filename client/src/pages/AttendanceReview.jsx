import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import './PageBase.css';

const AttendanceReview = () => {
  const navigate = useNavigate();
  const [attendanceRequests, setAttendanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    event_id: '',
    attended: '',
    search: ''
  });
  
  // Events list for filter dropdown
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Update status for individual requests
  const [updatingIds, setUpdatingIds] = useState(new Set());

  // Check authentication and user role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true);
        if (!ApiService.isAuthenticated()) {
          setIsAuthenticated(false);
          setUserRole(null);
          setIsCheckingAuth(false);
          return;
        }

        const user = await ApiService.getProfile();
        setUserRole(user.role);
        const isBoardOrAdmin = user.role === 'board' || user.role === 'admin';
        setIsAuthenticated(isBoardOrAdmin);

        if (!isBoardOrAdmin) {
          setError('Access denied. This page is only available to board members and administrators.');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setUserRole(null);
        setError('Failed to verify authentication. Please try logging in again.');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch events for filter dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const eventsData = await ApiService.getEvents();
        setEvents(eventsData || []);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  // Fetch attendance requests
  const fetchAttendanceRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build filters object (only include defined values)
      const filtersToSend = {};
      if (filters.event_id) filtersToSend.event_id = filters.event_id;
      if (filters.attended !== '') filtersToSend.attended = filters.attended === 'true';
      if (filters.search) filtersToSend.search = filters.search;

      const data = await ApiService.getAttendanceRequests(filtersToSend);
      setAttendanceRequests(data || []);
    } catch (error) {
      console.error('Error fetching attendance requests:', error);
      setError(error.message || 'Failed to load attendance requests');
      setAttendanceRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch requests when filters change or after authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchAttendanceRequests();
    }
  }, [isAuthenticated, fetchAttendanceRequests]);

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle attended status update
  const handleAttendedChange = async (requestId, currentAttended, newAttended) => {
    // Prevent unnecessary updates
    if (currentAttended === newAttended) return;

    try {
      setUpdatingIds(prev => new Set(prev).add(requestId));
      
      await ApiService.updateAttendanceRequest(requestId, newAttended);
      
      // Update local state
      setAttendanceRequests(prev =>
        prev.map(req =>
          req.request_id === requestId
            ? { ...req, attended: newAttended }
            : req
        )
      );
    } catch (error) {
      console.error('Error updating attendance status:', error);
      alert(`Failed to update attendance status: ${error.message || 'Unknown error'}`);
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Format date (compact for table)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '');
    } catch (error) {
      return dateString;
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <section className="PageBase">
        <div className="container">
          <PageLoader message="Checking authentication..." />
        </div>
      </section>
    );
  }

  // Show error if not authenticated or not board/admin
  if (!isAuthenticated) {
    return (
      <section className="PageBase">
        <div className="container">
          <motion.div
            className="neo-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h1 className="card-title">Access Denied</h1>
            <p style={{ color: '#e74c3c', marginBottom: '1rem' }}>
              {error || 'This page is only available to board members and administrators.'}
            </p>
            <div className="actions">
              <motion.button
                className="btn primary"
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Go to Login
              </motion.button>
              <motion.button
                className="btn secondary"
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Go Home
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="PageBase" style={{ padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        <motion.div
          className="neo-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ maxWidth: '100%' }}
        >
          <h1 className="card-title">Attendance Review</h1>
          <p className="card-sub">
            Review and manage attendance requests for events. Update the attendance status for registered users.
          </p>

          {/* Summary Stats - Top */}
          {!loading && attendanceRequests.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#8EC2F0', marginBottom: '0.25rem' }}>
                  {attendanceRequests.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#B0C4DE' }}>Total Requests</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4caf50', marginBottom: '0.25rem' }}>
                  {attendanceRequests.filter(r => r.attended).length}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#B0C4DE' }}>Attended</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ffc107', marginBottom: '0.25rem' }}>
                  {attendanceRequests.filter(r => !r.attended).length}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#B0C4DE' }}>Not Attended</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid" style={{ marginBottom: '1.5rem', gap: '1rem', gridTemplateColumns: '2fr 1fr 1fr' }}>
            <label className="floating-input">
              Search
              <input
                type="text"
                placeholder="Search by name, university ID, phone, or course code..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pill"
                style={{ width: '100%' }}
              />
            </label>

            <label className="floating-input">
              Event
              <select
                value={filters.event_id}
                onChange={(e) => handleFilterChange('event_id', e.target.value)}
                className="pill"
                style={{ width: '100%' }}
                disabled={loadingEvents}
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.event_id} value={event.event_id}>
                    {event.name || `Event ${event.event_id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="floating-input">
              Status
              <select
                value={filters.attended}
                onChange={(e) => handleFilterChange('attended', e.target.value)}
                className="pill"
                style={{ width: '100%' }}
              >
                <option value="">All</option>
                <option value="false">Not Attended</option>
                <option value="true">Attended</option>
              </select>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem', color: '#e74c3c' }}>
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <PageLoader message="Loading attendance requests..." />
          ) : (
            <>
              {/* Attendance Requests Table */}
              {attendanceRequests.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem 1rem',
                  color: '#8EC2F0'
                }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    No attendance requests found
                  </p>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    {Object.values(filters).some(f => f) 
                      ? 'Try adjusting your filters' 
                      : 'There are no registered users yet'}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  overflowX: 'auto',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.03)'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem'
                  }}>
                    <thead>
                      <tr style={{ 
                        background: 'linear-gradient(180deg, rgba(57, 90, 127, 0.6), rgba(57, 90, 127, 0.4))',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>#</th>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          minWidth: '180px'
                        }}>Full Name</th>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          minWidth: '130px'
                        }}>University ID</th>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          minWidth: '140px'
                        }}>Phone</th>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          minWidth: '200px'
                        }}>Event</th>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          minWidth: '120px'
                        }}>Course Code</th>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          minWidth: '160px'
                        }}>Registered Date</th>
                        <th style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'left', 
                          color: '#8EC2F0',
                          fontWeight: '600',
                          minWidth: '150px'
                        }}>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRequests.map((request, index) => (
                        <motion.tr
                          key={request.request_id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            background: index % 2 === 0 
                              ? 'rgba(255, 255, 255, 0.02)' 
                              : 'rgba(255, 255, 255, 0.04)',
                            transition: 'background 0.2s'
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: index * 0.01 }}
                          whileHover={{ background: 'rgba(255, 255, 255, 0.08)' }}
                        >
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            color: '#B0C4DE',
                            fontSize: '0.85rem'
                          }}>
                            {index + 1}
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            color: '#eaf2ff',
                            fontWeight: '500'
                          }}>
                            {request.full_name}
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            color: '#B0C4DE',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem'
                          }}>
                            {request.university_id}
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            color: '#B0C4DE'
                          }}>
                            {request.phone_number}
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            color: '#B0C4DE'
                          }}>
                            {request.event ? (request.event.name || `Event ${request.event_id}`) : 'N/A'}
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            color: '#B0C4DE'
                          }}>
                            {request.course_code || '-'}
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            color: '#B0C4DE',
                            fontSize: '0.85rem'
                          }}>
                            {formatDate(request.created_at)}
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                value={request.attended ? 'true' : 'false'}
                                onChange={(e) => {
                                  const newValue = e.target.value === 'true';
                                  handleAttendedChange(request.request_id, request.attended, newValue);
                                }}
                                className="pill"
                                disabled={updatingIds.has(request.request_id)}
                                style={{ 
                                  minWidth: '100px',
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.85rem',
                                  opacity: updatingIds.has(request.request_id) ? 0.6 : 1,
                                  cursor: updatingIds.has(request.request_id) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                              </select>
                              {updatingIds.has(request.request_id) && (
                                <span className="dots-loader" aria-hidden="true" style={{ fontSize: '0.6rem' }}>
                                  <span></span>
                                  <span></span>
                                  <span></span>
                                </span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default AttendanceReview;


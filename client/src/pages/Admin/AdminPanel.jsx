import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ApiService from '../../services/api';
import BackButton from '../../components/BackButton';
import SEO from '../../components/SEO';
import './AdminPanel.css';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [alert, setAlert] = useState(null);

    // Dashboard state
    const [stats, setStats] = useState(null);

    // Competitions state
    const [competitions, setCompetitions] = useState([]);
    const [showCompModal, setShowCompModal] = useState(false);
    const [editingComp, setEditingComp] = useState(null);
    const [compForm, setCompForm] = useState({
        name: '', description: '', start_date: '', end_date: '',
        registration_deadline: '', max_team_size: 4, min_team_size: 1,
        max_teams: '', status: 'upcoming', location: ''
    });

    // Attendance state
    const [attendance, setAttendance] = useState([]);
    const [attendanceFilters, setAttendanceFilters] = useState({ event_id: '', attended: '' });

    // Registrations state
    const [registrations, setRegistrations] = useState([]);
    const [regSearch, setRegSearch] = useState('');
    const [regStatusFilter, setRegStatusFilter] = useState('');

    // Check admin access on mount
    useEffect(() => {
        const checkAccess = async () => {
            if (!ApiService.isAuthenticated()) {
                navigate('/login', { replace: true });
                return;
            }

            const result = await ApiService.checkAdminAccess();
            if (!result.success) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            setHasAccess(true);
            setLoading(false);
            fetchDashboard();
        };

        checkAccess();
    }, [navigate]);

    // Auto dismiss alerts
    useEffect(() => {
        if (!alert) return;
        const t = setTimeout(() => setAlert(null), 4000);
        return () => clearTimeout(t);
    }, [alert]);

    // Fetch functions
    const fetchDashboard = async () => {
        try {
            const data = await ApiService.getAdminDashboard();
            setStats(data);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
    };

    const fetchCompetitions = useCallback(async () => {
        try {
            const data = await ApiService.getAdminCompetitions();
            setCompetitions(data || []);
        } catch (err) {
            console.error('Failed to load competitions:', err);
        }
    }, []);

    const fetchAttendance = useCallback(async () => {
        try {
            const data = await ApiService.getAdminAttendance(attendanceFilters);
            setAttendance(data || []);
        } catch (err) {
            console.error('Failed to load attendance:', err);
        }
    }, [attendanceFilters]);

    const fetchRegistrations = useCallback(async () => {
        try {
            const filters = {};
            if (regStatusFilter) filters.status = regStatusFilter;
            if (regSearch) filters.search = regSearch;
            const data = await ApiService.getAdminRegistrations(filters);
            setRegistrations(data || []);
        } catch (err) {
            console.error('Failed to load registrations:', err);
        }
    }, [regStatusFilter, regSearch]);

    // Load data when tab changes
    useEffect(() => {
        if (!hasAccess) return;
        if (activeTab === 'dashboard') fetchDashboard();
        if (activeTab === 'competitions') fetchCompetitions();
        if (activeTab === 'attendance') fetchAttendance();
        if (activeTab === 'registrations') fetchRegistrations();
    }, [activeTab, hasAccess, fetchCompetitions, fetchAttendance, fetchRegistrations]);

    // Competition CRUD
    const openCompModal = (comp = null) => {
        if (comp) {
            setEditingComp(comp);
            setCompForm({
                name: comp.name || '',
                description: comp.description || '',
                start_date: comp.start_date ? comp.start_date.split('T')[0] : '',
                end_date: comp.end_date ? comp.end_date.split('T')[0] : '',
                registration_deadline: comp.registration_deadline ? comp.registration_deadline.split('T')[0] : '',
                max_team_size: comp.max_team_size || 4,
                min_team_size: comp.min_team_size || 1,
                max_teams: comp.max_teams || '',
                status: comp.status || 'upcoming',
                location: comp.location || ''
            });
        } else {
            setEditingComp(null);
            setCompForm({
                name: '', description: '', start_date: '', end_date: '',
                registration_deadline: '', max_team_size: 4, min_team_size: 1,
                max_teams: '', status: 'upcoming', location: ''
            });
        }
        setShowCompModal(true);
    };

    const saveCompetition = async () => {
        try {
            const data = { ...compForm };
            if (data.max_teams === '') data.max_teams = null;

            if (editingComp) {
                await ApiService.updateAdminCompetition(editingComp.competition_id, data);
                setAlert({ type: 'success', message: 'Competition updated successfully!' });
            } else {
                await ApiService.createAdminCompetition(data);
                setAlert({ type: 'success', message: 'Competition created successfully!' });
            }

            setShowCompModal(false);
            fetchCompetitions();
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to save competition' });
        }
    };

    const deleteCompetition = async (id) => {
        if (!window.confirm('Are you sure you want to delete this competition?')) return;
        try {
            await ApiService.deleteAdminCompetition(id);
            setAlert({ type: 'success', message: 'Competition deleted successfully!' });
            fetchCompetitions();
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to delete competition' });
        }
    };

    // Attendance toggle
    const toggleAttendance = async (id, current) => {
        try {
            await ApiService.updateAdminAttendance(id, !current);
            setAlert({ type: 'success', message: 'Attendance updated!' });
            fetchAttendance();
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to update attendance' });
        }
    };

    // Registration status
    const updateRegStatus = async (id, status) => {
        try {
            await ApiService.updateAdminRegistration(id, status);
            setAlert({ type: 'success', message: `Application ${status}!` });
            fetchRegistrations();
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to update status' });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    // Loading state
    if (loading) {
        return (
            <div className="AdminPanel">
                <div className="AdminPanel__loading">
                    <div className="AdminPanel__spinner" />
                    <p>Verifying admin access...</p>
                </div>
            </div>
        );
    }

    // Access denied
    if (!hasAccess) {
        return (
            <div className="AdminPanel">
                <div className="AdminPanel__container">
                    <div className="AdminPanel__accessDenied">
                        <div style={{ fontSize: '3rem' }}>🔒</div>
                        <h2>Access Denied</h2>
                        <p>Only the President, Vice President, and Head of Software Development can access the admin panel.</p>
                        <button className="AdminPanel__homeBtn" onClick={() => navigate('/')}>
                            Go to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="AdminPanel">
            <SEO title="Admin Panel — MSP MIU" description="MSP MIU Admin Panel" />
            <div className="AdminPanel__container">
                <BackButton to="/" label="Back to Home" />

                <div className="AdminPanel__header">
                    <h1 className="AdminPanel__title">Admin Panel</h1>
                    <p className="AdminPanel__subtitle">Manage competitions, attendance, and registrations</p>
                </div>

                {/* Alert */}
                <AnimatePresence>
                    {alert && (
                        <motion.div
                            className={`AdminPanel__alert AdminPanel__alert--${alert.type}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {alert.type === 'success' ? '✅' : '❌'} {alert.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs */}
                <div className="AdminPanel__tabs">
                    {[
                        { key: 'dashboard', label: '📊 Dashboard' },
                        { key: 'competitions', label: '🏆 Competitions' },
                        { key: 'attendance', label: '📋 Attendance' },
                        { key: 'registrations', label: '📝 Registrations' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            className={`AdminPanel__tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* === DASHBOARD === */}
                {activeTab === 'dashboard' && stats && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="AdminPanel__stats">
                            {[
                                { icon: '👥', value: stats.totalMembers, label: 'Total Members' },
                                { icon: '🏆', value: stats.totalCompetitions, label: 'Competitions' },
                                { icon: '📅', value: stats.totalEvents, label: 'Events' },
                                { icon: '⏳', value: stats.pendingAttendance, label: 'Pending Attendance' },
                                { icon: '📝', value: stats.totalApplications, label: 'Total Applications' },
                                { icon: '🔔', value: stats.pendingApplications, label: 'Pending Applications' }
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    className="AdminPanel__statCard"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <span className="AdminPanel__statIcon">{stat.icon}</span>
                                    <p className="AdminPanel__statValue">{stat.value}</p>
                                    <p className="AdminPanel__statLabel">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* === COMPETITIONS === */}
                {activeTab === 'competitions' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="AdminPanel__section">
                            <div className="AdminPanel__sectionHeader">
                                <h2 className="AdminPanel__sectionTitle">Manage Competitions</h2>
                                <button className="AdminPanel__addBtn" onClick={() => openCompModal()}>
                                    + Add Competition
                                </button>
                            </div>

                            {competitions.length === 0 ? (
                                <div className="AdminPanel__empty"><p>No competitions yet.</p></div>
                            ) : (
                                <table className="AdminPanel__table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Teams</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {competitions.map(comp => (
                                            <tr key={comp.competition_id}>
                                                <td style={{ fontWeight: 600 }}>{comp.name}</td>
                                                <td>
                                                    <span className={`AdminPanel__badge AdminPanel__badge--${comp.status}`}>
                                                        {comp.status}
                                                    </span>
                                                </td>
                                                <td>{formatDate(comp.start_date)}</td>
                                                <td>{formatDate(comp.end_date)}</td>
                                                <td>{comp.max_teams || '∞'}</td>
                                                <td>
                                                    <button
                                                        className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                                        onClick={() => openCompModal(comp)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                                        onClick={() => deleteCompetition(comp.competition_id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Competition Modal */}
                        {showCompModal && (
                            <div className="AdminPanel__modal" onClick={() => setShowCompModal(false)}>
                                <div className="AdminPanel__modalContent" onClick={e => e.stopPropagation()}>
                                    <h3 className="AdminPanel__modalTitle">
                                        {editingComp ? 'Edit Competition' : 'Create Competition'}
                                    </h3>

                                    <div className="AdminPanel__formGroup">
                                        <label>Name *</label>
                                        <input
                                            value={compForm.name}
                                            onChange={e => setCompForm({ ...compForm, name: e.target.value })}
                                            placeholder="Competition name"
                                        />
                                    </div>

                                    <div className="AdminPanel__formGroup">
                                        <label>Description *</label>
                                        <textarea
                                            value={compForm.description}
                                            onChange={e => setCompForm({ ...compForm, description: e.target.value })}
                                            placeholder="Competition description"
                                        />
                                    </div>

                                    <div className="AdminPanel__formRow">
                                        <div className="AdminPanel__formGroup">
                                            <label>Start Date</label>
                                            <input
                                                type="date"
                                                value={compForm.start_date}
                                                onChange={e => setCompForm({ ...compForm, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="AdminPanel__formGroup">
                                            <label>End Date</label>
                                            <input
                                                type="date"
                                                value={compForm.end_date}
                                                onChange={e => setCompForm({ ...compForm, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="AdminPanel__formRow">
                                        <div className="AdminPanel__formGroup">
                                            <label>Registration Deadline</label>
                                            <input
                                                type="date"
                                                value={compForm.registration_deadline}
                                                onChange={e => setCompForm({ ...compForm, registration_deadline: e.target.value })}
                                            />
                                        </div>
                                        <div className="AdminPanel__formGroup">
                                            <label>Status</label>
                                            <select
                                                value={compForm.status}
                                                onChange={e => setCompForm({ ...compForm, status: e.target.value })}
                                            >
                                                <option value="upcoming">Upcoming</option>
                                                <option value="active">Active</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="AdminPanel__formRow">
                                        <div className="AdminPanel__formGroup">
                                            <label>Min Team Size</label>
                                            <input
                                                type="number"
                                                value={compForm.min_team_size}
                                                onChange={e => setCompForm({ ...compForm, min_team_size: parseInt(e.target.value) || 1 })}
                                                min="1"
                                            />
                                        </div>
                                        <div className="AdminPanel__formGroup">
                                            <label>Max Team Size</label>
                                            <input
                                                type="number"
                                                value={compForm.max_team_size}
                                                onChange={e => setCompForm({ ...compForm, max_team_size: parseInt(e.target.value) || 4 })}
                                                min="1"
                                            />
                                        </div>
                                    </div>

                                    <div className="AdminPanel__formRow">
                                        <div className="AdminPanel__formGroup">
                                            <label>Max Teams (leave empty for unlimited)</label>
                                            <input
                                                type="number"
                                                value={compForm.max_teams}
                                                onChange={e => setCompForm({ ...compForm, max_teams: e.target.value })}
                                                placeholder="Unlimited"
                                                min="1"
                                            />
                                        </div>
                                        <div className="AdminPanel__formGroup">
                                            <label>Location</label>
                                            <input
                                                value={compForm.location}
                                                onChange={e => setCompForm({ ...compForm, location: e.target.value })}
                                                placeholder="e.g. MIU Campus"
                                            />
                                        </div>
                                    </div>

                                    <div className="AdminPanel__modalActions">
                                        <button
                                            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                                            onClick={() => setShowCompModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                                            onClick={saveCompetition}
                                        >
                                            {editingComp ? 'Save Changes' : 'Create'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* === ATTENDANCE === */}
                {activeTab === 'attendance' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="AdminPanel__section">
                            <div className="AdminPanel__sectionHeader">
                                <h2 className="AdminPanel__sectionTitle">Attendance Review</h2>
                            </div>

                            <div className="AdminPanel__filters">
                                <select
                                    className="AdminPanel__filterSelect"
                                    value={attendanceFilters.attended}
                                    onChange={e => setAttendanceFilters({ ...attendanceFilters, attended: e.target.value })}
                                >
                                    <option value="">All Status</option>
                                    <option value="true">Attended</option>
                                    <option value="false">Not Attended</option>
                                </select>
                                <button
                                    className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                    onClick={fetchAttendance}
                                >
                                    Apply Filter
                                </button>
                            </div>

                            {attendance.length === 0 ? (
                                <div className="AdminPanel__empty"><p>No attendance requests found.</p></div>
                            ) : (
                                <table className="AdminPanel__table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>University ID</th>
                                            <th>Event</th>
                                            <th>Date</th>
                                            <th>Attended</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.map(req => (
                                            <tr key={req.attendance_id}>
                                                <td style={{ fontWeight: 600 }}>{req.full_name}</td>
                                                <td>{req.university_id}</td>
                                                <td>{req.event_name || req.event_id}</td>
                                                <td>{formatDate(req.created_at)}</td>
                                                <td>
                                                    <button
                                                        className={`AdminPanel__toggle ${req.attended ? 'active' : ''}`}
                                                        onClick={() => toggleAttendance(req.attendance_id, req.attended)}
                                                        title={req.attended ? 'Attended' : 'Not attended'}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* === REGISTRATIONS === */}
                {activeTab === 'registrations' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="AdminPanel__section">
                            <div className="AdminPanel__sectionHeader">
                                <h2 className="AdminPanel__sectionTitle">Registration Management</h2>
                            </div>

                            <div className="AdminPanel__filters">
                                <input
                                    className="AdminPanel__filterInput"
                                    placeholder="Search by name, email, or ID..."
                                    value={regSearch}
                                    onChange={e => setRegSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && fetchRegistrations()}
                                />
                                <select
                                    className="AdminPanel__filterSelect"
                                    value={regStatusFilter}
                                    onChange={e => setRegStatusFilter(e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <button
                                    className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                    onClick={fetchRegistrations}
                                >
                                    Search
                                </button>
                            </div>

                            {registrations.length === 0 ? (
                                <div className="AdminPanel__empty"><p>No registrations found.</p></div>
                            ) : (
                                <table className="AdminPanel__table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>University ID</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {registrations.map(reg => (
                                            <tr key={reg.application_id}>
                                                <td style={{ fontWeight: 600 }}>{reg.full_name}</td>
                                                <td>{reg.email}</td>
                                                <td>{reg.university_id}</td>
                                                <td>
                                                    <span className={`AdminPanel__badge AdminPanel__badge--${reg.status?.split('_')[0] || 'pending'}`}>
                                                        {reg.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td>{formatDate(reg.created_at)}</td>
                                                <td>
                                                    {reg.status !== 'approved' && (
                                                        <button
                                                            className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                                                            onClick={() => updateRegStatus(reg.application_id, 'approved')}
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    {reg.status !== 'rejected' && (
                                                        <button
                                                            className="AdminPanel__actionBtn AdminPanel__actionBtn--reject"
                                                            onClick={() => updateRegStatus(reg.application_id, 'rejected')}
                                                        >
                                                            Reject
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdDashboard, MdEmojiEvents, MdAppRegistration,
    MdNotifications, MdHome, MdAdd,
    MdPeople, MdEvent, MdPendingActions, MdDescription,
    MdTrendingUp, MdCalendarToday, MdCalendarMonth, MdCampaign, MdFeedback, MdPerson, MdSettings,
    MdBusiness, MdGroups, MdPermMedia, MdArticle, MdEmail, MdPhoneAndroid, MdAccountTree
} from 'react-icons/md';
import { FiDownload } from 'react-icons/fi';
import ApiService from '../../services/api';
import SEO from '../../components/SEO';
import Pagination from '../../components/Pagination';
import SeasonBadge from '../../components/SeasonBadge';
import { useSeason } from '../../context/SeasonContext';
import AdminShell, { ParticleBackground } from './AdminShell';
import RegistrationsTab from './RegistrationsTab';
import SponsorsAdminTab from './SponsorsAdminTab';
import BoardAdminTab from './BoardAdminTab';
import DepartmentsAdminTab from './DepartmentsAdminTab';
import MediaAdminTab from './MediaAdminTab';
import SiteContentAdminTab from './SiteContentAdminTab';
import MembersAdminTab from './MembersAdminTab';
import EventsAdminTab from './EventsAdminTab';
import SeasonsAdminTab from './SeasonsAdminTab';
import EmailManagementAdminTab from './EmailManagementAdminTab';
import AndroidAppAdminTab from './AndroidAppAdminTab';
import './AdminPanel.css';

const LIST_LIMIT = 20;
const NOTIFICATIONS_LIMIT = 50;
const ANNOUNCEMENT_TITLE_MAX = 50;
const ANNOUNCEMENT_DESC_MAX = 220;

const ADMIN_TAB_TO_ROUTE = {
    dashboard: 'dashboard',
    events: 'events',
    competitions: 'competitions',
    registrations: 'registrations',
    notifications: 'notifications',
    announcements: 'announcements',
    suggestions: 'suggestions',
    sponsors: 'sponsors',
    board: 'board',
    departments: 'departments',
    media: 'media',
    content: 'content',
    members: 'members',
    seasons: 'seasons',
    emails: 'emails',
    android: 'android'
};

const ADMIN_ROUTE_TO_TAB = {
    dashboard: 'dashboard',
    events: 'events',
    competitions: 'competitions',
    attendance: 'events',
    registrations: 'registrations',
    notifications: 'notifications',
    announcements: 'announcements',
    suggestions: 'suggestions',
    sponsors: 'sponsors',
    board: 'board',
    departments: 'departments',
    media: 'media',
    content: 'content',
    members: 'members',
    seasons: 'seasons',
    emails: 'emails',
    android: 'android'
};

/* ═══════════════════════════════════════════════════════════
   Admin Panel Component
   ═══════════════════════════════════════════════════════════ */
const AdminPanel = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { seasonFilters, isAll, selectedSeasonId } = useSeason();

    const getAdminTabFromPath = useCallback((pathname) => {
        if (!pathname.startsWith('/admin')) return 'dashboard';
        const segment = pathname.split('/')[2];
        if (!segment) return 'dashboard';
        return ADMIN_ROUTE_TO_TAB[segment] || 'dashboard';
    }, []);

    const [activeTab, setActiveTab] = useState(() => getAdminTabFromPath(location.pathname));
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    /** 'full' | 'registrations' — registrations = board/dept5 without full admin */
    const [accessLevel, setAccessLevel] = useState('full');
    const [alert, setAlert] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        document.body.classList.add('admin-panel-active');
        return () => document.body.classList.remove('admin-panel-active');
    }, []);

    useEffect(() => {
        if (location.pathname === '/admin' || location.pathname === '/admin/') {
            navigate(accessLevel === 'registrations' ? '/admin/registrations' : '/admin/dashboard', { replace: true });
            return;
        }

        // Attendance lives under Events now
        if (location.pathname === '/admin/attendance') {
            navigate('/admin/events?view=attendance', { replace: true });
            return;
        }

        const tabFromPath = getAdminTabFromPath(location.pathname);
        if (accessLevel === 'registrations' && tabFromPath !== 'registrations') {
            navigate('/admin/registrations', { replace: true });
            setActiveTab('registrations');
            return;
        }
        setActiveTab((prev) => (prev === tabFromPath ? prev : tabFromPath));
    }, [location.pathname, navigate, getAdminTabFromPath, accessLevel]);

    // Dashboard state
    const [stats, setStats] = useState(null);
    const [isExportingCsv, setIsExportingCsv] = useState(false);

    // Competitions state
    const [competitions, setCompetitions] = useState([]);
    const [competitionsPage, setCompetitionsPage] = useState(1);
    const [competitionsPagination, setCompetitionsPagination] = useState(null);

    // Attendance review is nested under Events tab
    // Registrations handled by RegistrationsTab (rich FormAdmin UI)

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState(null);
    const [notificationsPage, setNotificationsPage] = useState(1);
    const [notificationsPagination, setNotificationsPagination] = useState(null);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
    const notificationsFetchedRef = useRef(false);

    // Announcements state (for sidepanel view)
    const [announcements, setAnnouncements] = useState([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(false);
    const [announcementsError, setAnnouncementsError] = useState(null);
    const [announcementsPage, setAnnouncementsPage] = useState(1);
    const [announcementsPagination, setAnnouncementsPagination] = useState(null);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [announcementForm, setAnnouncementForm] = useState({
        title: '', description: '', department: '', announcement_date: '', priority: false
    });

    // Suggestions & Feedback state
    const [suggestions, setSuggestions] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackError, setFeedbackError] = useState(null);
    const [suggestionsPage, setSuggestionsPage] = useState(1);
    const [suggestionsPagination, setSuggestionsPagination] = useState(null);
    const [feedbackPage, setFeedbackPage] = useState(1);
    const [feedbackPagination, setFeedbackPagination] = useState(null);

    // Admin profile for avatar
    const [adminProfile, setAdminProfile] = useState(null);

    // Navigation items
    const fullNavItems = useMemo(() => [
        { key: 'dashboard', label: 'Dashboard', icon: <MdDashboard /> },
        { key: 'events', label: 'Events', icon: <MdEvent /> },
        { key: 'competitions', label: 'Competitions', icon: <MdEmojiEvents /> },
        { key: 'registrations', label: 'Registrations', icon: <MdAppRegistration /> },
        { key: 'members', label: 'Members', icon: <MdPeople /> },
        { key: 'sponsors', label: 'Sponsors', icon: <MdBusiness /> },
        { key: 'board', label: 'Board', icon: <MdGroups /> },
        { key: 'departments', label: 'Departments', icon: <MdAccountTree /> },
        { key: 'seasons', label: 'Season', icon: <MdCalendarMonth /> },
        { key: 'media', label: 'Media', icon: <MdPermMedia /> },
        { key: 'content', label: 'Site content', icon: <MdArticle /> },
        { key: 'android', label: 'Android app', icon: <MdPhoneAndroid /> },
        { key: 'emails', label: 'Email management', icon: <MdEmail /> },
        { key: 'notifications', label: 'Notifications', icon: <MdNotifications /> },
        { key: 'announcements', label: 'Announcements', icon: <MdCampaign /> },
        { key: 'suggestions', label: 'Suggestions', icon: <MdFeedback /> },
    ], []);

    const registrationsOnlyNav = useMemo(() => [
        { key: 'registrations', label: 'Registrations', icon: <MdAppRegistration /> },
    ], []);

    const navItems = accessLevel === 'registrations' ? registrationsOnlyNav : fullNavItems;

    const bottomItems = useMemo(() => [
        { key: 'profile', label: 'Profile', icon: <MdPerson />, onClick: () => navigate('/profile') },
        { key: 'home', label: 'Home', icon: <MdHome />, onClick: () => navigate('/') },
    ], [navigate]);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Check admin access on mount
    useEffect(() => {
        const checkAccess = async () => {
            if (!ApiService.isAuthenticated()) {
                navigate('/login', { replace: true });
                return;
            }

            let profile = null;
            try {
                profile = await ApiService.getProfile();
                setAdminProfile(profile);
            } catch (err) {
                console.error('Failed to load admin profile:', err);
            }

            const result = await ApiService.checkAdminAccess();
            if (result.success) {
                setAccessLevel('full');
                setHasAccess(true);
                setLoading(false);
                fetchDashboard();
                fetchCompetitions();
                fetchNotifications();
                return;
            }

            // Board or department 5 → registrations-only access
            const deptRaw = profile?.department_id;
            const deptId = typeof deptRaw === 'number' ? deptRaw : parseInt(deptRaw, 10);
            const hasRegAccess = profile?.role === 'board' || (!isNaN(deptId) && deptId === 5);

            if (hasRegAccess) {
                setAccessLevel('registrations');
                setHasAccess(true);
                setLoading(false);
                if (!location.pathname.includes('/admin/registrations')) {
                    navigate('/admin/registrations', { replace: true });
                }
                return;
            }

            setHasAccess(false);
            setLoading(false);
        };

        checkAccess();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    // Auto dismiss alerts
    useEffect(() => {
        if (!alert) return;
        const t = setTimeout(() => setAlert(null), 4000);
        return () => clearTimeout(t);
    }, [alert]);

    // Fetch functions
    const fetchDashboard = useCallback(async () => {
        try {
            const data = await ApiService.getAdminDashboard({ ...seasonFilters });
            setStats(data);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
    }, [seasonFilters]);

    const exportMembersAndBoardCsv = useCallback(async () => {
        try {
            setIsExportingCsv(true);
            await ApiService.exportMembersAndBoardToCSV({ ...seasonFilters });
            setAlert({ type: 'success', message: 'Members/board CSV export started.' });
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to export members/board.' });
        } finally {
            setIsExportingCsv(false);
        }
    }, [seasonFilters]);

    const fetchCompetitions = useCallback(async () => {
        try {
            const result = await ApiService.getAdminCompetitions({
                page: competitionsPage,
                limit: LIST_LIMIT,
                ...seasonFilters
            });
            setCompetitions(Array.isArray(result?.data) ? result.data : []);
            setCompetitionsPagination(result?.pagination || null);
        } catch (err) {
            console.error('Failed to load competitions:', err);
            setCompetitions([]);
            setCompetitionsPagination(null);
        }
    }, [competitionsPage, seasonFilters]);

    const fetchNotifications = useCallback(async (opts = {}) => {
        const { forDropdown = false } = opts;
        try {
            setNotificationsLoading(true);
            setNotificationsError(null);
            const result = await ApiService.getAdminNotifications(
                forDropdown
                    ? { limit: 100, page: 1, ...seasonFilters }
                    : { limit: NOTIFICATIONS_LIMIT, page: notificationsPage, ...seasonFilters }
            );
            setNotifications(Array.isArray(result?.data) ? result.data : []);
            if (!forDropdown) {
                setNotificationsPagination(result?.pagination || null);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
            setNotificationsError(err.message || 'Failed to load notifications');
            setNotifications([]);
            if (!forDropdown) setNotificationsPagination(null);
        } finally {
            setNotificationsLoading(false);
            notificationsFetchedRef.current = true;
        }
    }, [notificationsPage, seasonFilters]);

    const fetchAnnouncementsAdmin = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setAnnouncementsLoading(true);
            setAnnouncementsError(null);
            const result = await ApiService.getAnnouncements({
                includeInactive: false,
                page: announcementsPage,
                limit: LIST_LIMIT,
                ...seasonFilters
            });
            setAnnouncements(Array.isArray(result?.data) ? result.data : []);
            setAnnouncementsPagination(result?.pagination || null);
        } catch (err) {
            console.error('Failed to load announcements:', err);
            setAnnouncementsError(err.message || 'Failed to load announcements');
            setAnnouncements([]);
            setAnnouncementsPagination(null);
        } finally {
            setAnnouncementsLoading(false);
        }
    }, [announcementsPage, seasonFilters]);

    const fetchSuggestionsAndFeedback = useCallback(async () => {
        setSuggestionsLoading(true);
        setSuggestionsError(null);
        setFeedbackLoading(true);
        setFeedbackError(null);
        try {
            const [sug, fb] = await Promise.all([
                ApiService.getAdminSuggestions({ page: suggestionsPage, limit: LIST_LIMIT }),
                ApiService.getAdminFeedback({ page: feedbackPage, limit: LIST_LIMIT })
            ]);
            setSuggestions(Array.isArray(sug?.data) ? sug.data : []);
            setSuggestionsPagination(sug?.pagination || null);
            setFeedbackList(Array.isArray(fb?.data) ? fb.data : []);
            setFeedbackPagination(fb?.pagination || null);
        } catch (err) {
            console.error('Failed to load suggestions/feedback:', err);
            setSuggestionsError(err.message || 'Failed to load');
            setFeedbackError(err.message || 'Failed to load');
            setSuggestions([]);
            setFeedbackList([]);
        } finally {
            setSuggestionsLoading(false);
            setFeedbackLoading(false);
        }
    }, [suggestionsPage, feedbackPage]);

    // Reset list page when switching tabs
    useEffect(() => {
        setCompetitionsPage(1);
        setNotificationsPage(1);
        setAnnouncementsPage(1);
        setSuggestionsPage(1);
        setFeedbackPage(1);
    }, [activeTab]);

    // Load data when tab / page changes
    useEffect(() => {
        if (!hasAccess || accessLevel !== 'full') return;
        if (activeTab === 'dashboard') fetchDashboard();
        if (activeTab === 'competitions') fetchCompetitions();
        if (activeTab === 'notifications') fetchNotifications({ forDropdown: false });
        if (activeTab === 'announcements') fetchAnnouncementsAdmin(true);
        if (activeTab === 'suggestions') fetchSuggestionsAndFeedback();
    }, [
        activeTab,
        hasAccess,
        accessLevel,
        fetchDashboard,
        fetchCompetitions,
        fetchNotifications,
        fetchAnnouncementsAdmin,
        fetchSuggestionsAndFeedback
    ]);

    // Refresh list when returning from full-page competition editor
    useEffect(() => {
        if (!hasAccess) return;
        if (location.pathname === '/admin/competitions') {
            fetchCompetitions();
        }
        // Only re-run on path/access change — not when page-driven fetchCompetitions identity changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, hasAccess]);

    const openAnnouncementModal = (announcement = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setAnnouncementForm({
                title: (announcement.title || '').slice(0, ANNOUNCEMENT_TITLE_MAX),
                description: (announcement.description || '').slice(0, ANNOUNCEMENT_DESC_MAX),
                department: announcement.department || '',
                announcement_date: announcement.announcement_date ? announcement.announcement_date.split('T')[0] : '',
                priority: !!announcement.priority
            });
        } else {
            setEditingAnnouncement(null);
            setAnnouncementForm({
                title: '', description: '', department: '',
                announcement_date: new Date().toISOString().split('T')[0],
                priority: false
            });
        }
        setShowAnnouncementModal(true);
    };

    const saveAnnouncement = async () => {
        try {
            const payload = { ...announcementForm };
            if (!editingAnnouncement && typeof selectedSeasonId === 'number') {
                payload.season_id = selectedSeasonId;
            }
            if (editingAnnouncement) {
                await ApiService.updateAnnouncement(editingAnnouncement.announcement_id, payload);
                setAlert({ type: 'success', message: 'Announcement updated!' });
            } else {
                await ApiService.createAnnouncement(payload);
                setAlert({ type: 'success', message: 'Announcement created!' });
            }
            setShowAnnouncementModal(false);
            fetchAnnouncementsAdmin(false);
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to save announcement' });
        }
    };

    const deleteAnnouncement = async (id) => {
        if (!window.confirm('Are you sure you want to remove this announcement?')) return;
        try {
            await ApiService.deleteAnnouncement(id);
            setAnnouncements((prev) => prev.filter((a) => a.announcement_id !== id));
            setAlert({ type: 'success', message: 'Announcement removed!' });
            fetchAnnouncementsAdmin(false);
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to delete announcement' });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatCompetitionType = (t) => {
        switch (t) {
            case 'task_quiz':
                return 'Task quiz';
            case 'quiz':
                return 'Quiz';
            case 'external':
                return 'External';
            case 'project':
            default:
                return 'Project';
        }
    };

    const handleTabChange = (key) => {
        if (accessLevel === 'registrations' && key !== 'registrations') return;
        setActiveTab(key);
        setMobileMenuOpen(false);

        const routeSegment = ADMIN_TAB_TO_ROUTE[key];
        if (routeSegment) {
            const targetPath = `/admin/${routeSegment}`;
            if (location.pathname !== targetPath) {
                navigate(targetPath);
            }
        }
    };

    // Get current page title
    const getPageTitle = () => {
        if (activeTab === 'emails') {
            const sub = location.pathname.split('/')[3];
            if (sub === 'whatsapp') return 'WhatsApp links';
            if (sub) {
                return sub
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
            }
            return 'Email management';
        }
        const item = navItems.find(n => n.key === activeTab);
        return item ? item.label : 'Dashboard';
    };

    const handleRegAlert = useCallback((a) => setAlert(a), []);

    const adminName = stats?.adminInfo?.full_name || adminProfile?.full_name || 'Admin';
    const adminTitle = stats?.adminInfo?.title || 'Admin Panel';

    let roleInitials = 'AD';
    const position = stats?.adminInfo?.position;
    if (position === 'President') {
        roleInitials = 'P';
    } else if (position === 'Vice President') {
        roleInitials = 'VP';
    } else if (position === 'Head') {
        roleInitials = 'H';
    } else if (adminProfile?.full_name) {
        const parts = adminProfile.full_name.trim().split(/\s+/);
        roleInitials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'AD';
    }

    const avatarInitials = roleInitials;

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
                <ParticleBackground />
                <div className="AdminPanel__accessDenied">
                    <div style={{ fontSize: '3rem' }}>🔒</div>
                    <h2>Access Denied</h2>
                    <p>Only authorized board members can access the admin panel. Registration managers need board role or HR department access.</p>
                    <button className="AdminPanel__accessDeniedBtn" onClick={() => navigate('/')}>
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    const topRight = (
        <>
            {accessLevel === 'full' && (
                <button
                    className="AdminPanel__topBtn"
                    aria-label="Notifications"
                    onClick={() => {
                        const open = !showNotificationsDropdown;
                        setShowNotificationsDropdown(open);
                        if (open && !notificationsFetchedRef.current) {
                            fetchNotifications({ forDropdown: true });
                        }
                    }}
                >
                    <MdNotifications />
                </button>
            )}
            <div className="AdminPanel__userAvatar">
                {adminProfile?.profile_picture_url ? (
                    <img
                        src={adminProfile.profile_picture_url}
                        alt={adminName}
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '8px',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    avatarInitials
                )}
            </div>

            {showNotificationsDropdown && accessLevel === 'full' && (
                <div className="AdminPanel__notificationsDropdown">
                    <div className="AdminPanel__notificationsHeader">
                        <span>Recent activity</span>
                    </div>
                    {notificationsLoading ? (
                        <div className="AdminPanel__notificationsEmpty">Loading...</div>
                    ) : notificationsError ? (
                        <div className="AdminPanel__notificationsEmpty">
                            {notificationsError}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="AdminPanel__notificationsEmpty">
                            No notifications. When another admin takes an action (e.g. competition or registration), it will appear here.
                        </div>
                    ) : (
                        <ul className="AdminPanel__notificationsList">
                            {notifications.slice(0, 4).map((n) => (
                                <li key={n.notification_id} className="AdminPanel__notificationItem">
                                    <p className="AdminPanel__notificationMessage">{n.message}</p>
                                    <span className="AdminPanel__notificationMeta">
                                        {n.performer_position} •{' '}
                                        {new Date(n.created_at).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        className="AdminPanel__notificationsViewAll"
                        onClick={() => {
                            setShowNotificationsDropdown(false);
                            handleTabChange('notifications');
                        }}
                    >
                        View all notifications
                    </button>
                </div>
            )}
        </>
    );

    return (
        <AdminShell
            seo={<SEO title="Admin Panel — MSP MIU" description="MSP MIU Admin Panel" />}
            navItems={navItems}
            bottomItems={bottomItems}
            activeKey={activeTab}
            onNavClick={handleTabChange}
            pageTitle={getPageTitle()}
            pageIcon={navItems.find(n => n.key === activeTab)?.icon}
            topRight={topRight}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
        >
                    {/* Greeting — dashboard only */}
                    {activeTab === 'dashboard' && accessLevel === 'full' && (
                        <div className="AdminPanel__greeting">
                            <div className="AdminPanel__greetingTop">
                                <div>
                                    <p className="AdminPanel__greetingSub">{getGreeting()},</p>
                                    <h2 className="AdminPanel__greetingName">{adminTitle}</h2>
                                    <p className="AdminPanel__greetingSub">{adminName}</p>
                                </div>
                                <button
                                    type="button"
                                    className="AdminPanel__exportCsvBtn"
                                    onClick={exportMembersAndBoardCsv}
                                    disabled={isExportingCsv}
                                >
                                    <FiDownload />
                                    {isExportingCsv ? 'Exporting…' : 'Export Members/Board to CSV'}
                                </button>
                            </div>
                        </div>
                    )}

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

                    {/* === DASHBOARD === */}
                    {accessLevel === 'full' && activeTab === 'dashboard' && stats && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__stats">
                                {[
                                    { icon: <MdPeople />, value: stats.totalMembers, label: 'Total Members' },
                                    { icon: <MdEmojiEvents />, value: stats.totalCompetitions, label: 'Competitions' },
                                    { icon: <MdEvent />, value: stats.totalEvents, label: 'Events' },
                                    { icon: <MdPendingActions />, value: stats.pendingAttendance, label: 'Pending Attendance' },
                                    { icon: <MdDescription />, value: stats.totalApplications, label: 'Total Applications' },
                                    { icon: <MdNotifications />, value: stats.pendingApplications, label: 'Pending Applications' }
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        className="AdminPanel__statCard"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08, duration: 0.35 }}
                                    >
                                        <div className="AdminPanel__statIcon">{stat.icon}</div>
                                        <p className="AdminPanel__statValue">{stat.value}</p>
                                        <p className="AdminPanel__statLabel">{stat.label}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Quick Summary Cards */}
                            <div className="AdminPanel__quickSummary">
                                <motion.div
                                    className="AdminPanel__summaryCard"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <h3><MdTrendingUp /> Overview</h3>
                                    <div className="AdminPanel__summaryItem">
                                        <span>Active Competitions</span>
                                        <span className="AdminPanel__summaryValue">{stats.totalCompetitions || 0}</span>
                                    </div>
                                    <div className="AdminPanel__summaryItem">
                                        <span>Total Events</span>
                                        <span className="AdminPanel__summaryValue">{stats.totalEvents || 0}</span>
                                    </div>
                                    <div className="AdminPanel__summaryItem">
                                        <span>Members Registered</span>
                                        <span className="AdminPanel__summaryValue">{stats.totalMembers || 0}</span>
                                    </div>
                                </motion.div>

                                <motion.div
                                    className="AdminPanel__summaryCard"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <h3><MdCalendarToday /> Pending Tasks</h3>
                                    <div className="AdminPanel__summaryItem">
                                        <span>Pending Attendance</span>
                                        <span className="AdminPanel__summaryValue">{stats.pendingAttendance || 0}</span>
                                    </div>
                                    <div className="AdminPanel__summaryItem">
                                        <span>Pending Applications</span>
                                        <span className="AdminPanel__summaryValue">{stats.pendingApplications || 0}</span>
                                    </div>
                                    <div className="AdminPanel__summaryItem">
                                        <span>Total Applications</span>
                                        <span className="AdminPanel__summaryValue">{stats.totalApplications || 0}</span>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {/* === EVENTS === */}
                    {accessLevel === 'full' && activeTab === 'events' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <EventsAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {/* === COMPETITIONS === */}
                    {accessLevel === 'full' && activeTab === 'competitions' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <div className="AdminPanel__sectionHeader">
                                    <h2 className="AdminPanel__sectionTitle">
                                        <MdEmojiEvents /> Manage Competitions
                                    </h2>
                                    <button
                                        className="AdminPanel__addBtn"
                                        onClick={() => navigate('/admin/competition-management')}
                                    >
                                        <MdAdd /> New competition
                                    </button>
                                </div>

                                {(() => {
                                    if (competitions.length === 0) {
                                        return (
                                            <div className="AdminPanel__empty">
                                                <p>No competitions yet.</p>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="AdminPanel__tableWrap">
                                        <table className="AdminPanel__table" key="comp-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Type</th>
                                                    <th>Status</th>
                                                    <th>Start Date</th>
                                                    <th>End Date</th>
                                                    <th>Format</th>
                                                    <th>Max size</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {competitions.map(comp => (
                                                    <tr key={comp.competition_id}>
                                                        <td style={{ fontWeight: 600 }}>
                                                            {comp.title}
                                                            {isAll && (comp.season || comp.season_id) && (
                                                                <> {' '}<SeasonBadge season={comp.season} /></>
                                                            )}
                                                        </td>
                                                        <td>{formatCompetitionType(comp.type)}</td>
                                                        <td>
                                                            <span className={`AdminPanel__badge AdminPanel__badge--${comp.status || 'draft'}`}>
                                                                {comp.status}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(comp.start_at)}</td>
                                                        <td>{formatDate(comp.end_at)}</td>
                                                        <td>
                                                            {comp.is_team_based === false || comp.is_team_based === 0 ? 'Individual' : 'Team'}
                                                        </td>
                                                        <td>{comp.max_team_size || '-'}</td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/admin/competition-management/${comp.competition_id}`
                                                                    )
                                                                }
                                                                title="Edit competition, quiz, tasks, and teams"
                                                            >
                                                                <MdSettings style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                                                Manage
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    );
                                })()}
                                <Pagination
                                    pagination={competitionsPagination}
                                    onPageChange={(p) => { setCompetitionsPage(p); }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* === REGISTRATIONS === */}
                    {activeTab === 'registrations' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <div className="AdminPanel__sectionHeader">
                                    <h2 className="AdminPanel__sectionTitle">
                                        <MdAppRegistration /> Applications Dashboard
                                    </h2>
                                </div>
                                <RegistrationsTab onAlert={handleRegAlert} />
                            </div>
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'sponsors' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <SponsorsAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'board' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <BoardAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'departments' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <DepartmentsAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'seasons' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <SeasonsAdminTab />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'media' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <MediaAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'content' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <SiteContentAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'android' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <AndroidAppAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'emails' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <EmailManagementAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {accessLevel === 'full' && activeTab === 'members' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <MembersAdminTab onAlert={setAlert} />
                        </motion.div>
                    )}

                    {/* === NOTIFICATIONS (FULL LIST) === */}
                    {accessLevel === 'full' && activeTab === 'notifications' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <div className="AdminPanel__sectionHeader">
                                    <h2 className="AdminPanel__sectionTitle">
                                        <MdNotifications /> Admin Notifications
                                    </h2>
                                </div>

                                {notificationsLoading ? (
                                    <div className="AdminPanel__empty"><p>Loading notifications...</p></div>
                                ) : notificationsError ? (
                                    <div className="AdminPanel__empty"><p>{notificationsError}</p></div>
                                ) : notifications.length === 0 ? (
                                    <div className="AdminPanel__empty">
                                        <p>No notifications yet. When another admin takes an action (e.g. creates or edits a competition, updates attendance or a registration), it will appear here and in the bell icon.</p>
                                    </div>
                                ) : (
                                    <table className="AdminPanel__table">
                                        <thead>
                                            <tr>
                                                <th>When</th>
                                                <th>Action</th>
                                                <th>Performed By</th>
                                                <th>Area</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {notifications.map((n) => (
                                                <tr key={n.notification_id}>
                                                    <td>{new Date(n.created_at).toLocaleString()}</td>
                                                    <td style={{ fontWeight: 600 }}>{n.message}</td>
                                                    <td>{n.performer_name} ({n.performer_position})</td>
                                                    <td>{n.entity_type || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <Pagination
                                    pagination={notificationsPagination}
                                    onPageChange={(p) => { setNotificationsPage(p); }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* === ANNOUNCEMENTS OVERVIEW === */}
                    {accessLevel === 'full' && activeTab === 'announcements' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <div className="AdminPanel__sectionHeader">
                                    <h2 className="AdminPanel__sectionTitle">
                                        <MdCampaign /> Announcements
                                    </h2>
                                    <button className="AdminPanel__addBtn" onClick={() => openAnnouncementModal()}>
                                        <MdAdd /> Add Announcement
                                    </button>
                                </div>

                                {announcementsLoading && announcements.length === 0 ? (
                                    <div className="AdminPanel__empty"><p>Loading announcements...</p></div>
                                ) : announcementsError ? (
                                    <div className="AdminPanel__empty"><p>{announcementsError}</p></div>
                                ) : announcements.length === 0 ? (
                                    <div className="AdminPanel__empty"><p>No announcements yet.</p></div>
                                ) : (
                                    <table className="AdminPanel__table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Department</th>
                                                <th>Date</th>
                                                <th>Priority</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {announcements.map((a) => (
                                                <tr key={a.announcement_id}>
                                                    <td style={{ fontWeight: 600 }}>
                                                        {a.title}
                                                        {isAll && (a.season || a.season_id) && (
                                                            <> {' '}<SeasonBadge season={a.season} /></>
                                                        )}
                                                    </td>
                                                    <td>{a.department}</td>
                                                    <td>{formatDate(a.announcement_date)}</td>
                                                    <td>
                                                        <span className={`AdminPanel__badge AdminPanel__badge--${a.priority ? 'active' : 'completed'}`}>
                                                            {a.priority ? 'High' : 'Normal'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="AdminPanel__actionBtn AdminPanel__actionBtn--edit" onClick={() => openAnnouncementModal(a)}>Edit</button>
                                                        <button className="AdminPanel__actionBtn AdminPanel__actionBtn--delete" onClick={() => deleteAnnouncement(a.announcement_id)}>Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <Pagination
                                    pagination={announcementsPagination}
                                    onPageChange={(p) => { setAnnouncementsPage(p); }}
                                />
                            </div>

                            {showAnnouncementModal
                                ? createPortal(
                                    <div
                                        className="AdminPanel__modal"
                                        onClick={() => setShowAnnouncementModal(false)}
                                        role="presentation"
                                    >
                                        <div
                                            className="AdminPanel__modalContent"
                                            onClick={e => e.stopPropagation()}
                                            role="dialog"
                                            aria-modal="true"
                                        >
                                            <h3 className="AdminPanel__modalTitle">{editingAnnouncement ? 'Edit Announcement' : 'Add Announcement'}</h3>
                                            {!editingAnnouncement && (
                                                <p className="AdminPanel__emailNote" role="note">
                                                    Note: creating this announcement will send an email about it to all members.
                                                </p>
                                            )}
                                            <div className="AdminPanel__formGroup">
                                                <label htmlFor="announcement-title">Title *</label>
                                                <input
                                                    id="announcement-title"
                                                    value={announcementForm.title}
                                                    onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value.slice(0, ANNOUNCEMENT_TITLE_MAX) })}
                                                    placeholder="Title"
                                                    maxLength={ANNOUNCEMENT_TITLE_MAX}
                                                />
                                                <span className={`AdminPanel__charCount${announcementForm.title.length >= ANNOUNCEMENT_TITLE_MAX ? ' is-max' : ''}`}>
                                                    {announcementForm.title.length}/{ANNOUNCEMENT_TITLE_MAX}
                                                </span>
                                            </div>
                                            <div className="AdminPanel__formGroup">
                                                <label htmlFor="announcement-description">Description *</label>
                                                <textarea
                                                    id="announcement-description"
                                                    value={announcementForm.description}
                                                    onChange={e => setAnnouncementForm({ ...announcementForm, description: e.target.value.slice(0, ANNOUNCEMENT_DESC_MAX) })}
                                                    placeholder="Description"
                                                    rows={4}
                                                    maxLength={ANNOUNCEMENT_DESC_MAX}
                                                />
                                                <span className={`AdminPanel__charCount${announcementForm.description.length >= ANNOUNCEMENT_DESC_MAX ? ' is-max' : ''}`}>
                                                    {announcementForm.description.length}/{ANNOUNCEMENT_DESC_MAX}
                                                </span>
                                            </div>
                                            <div className="AdminPanel__formGroup">
                                                <label>Department *</label>
                                                <input value={announcementForm.department} onChange={e => setAnnouncementForm({ ...announcementForm, department: e.target.value })} placeholder="e.g. Technical" />
                                            </div>
                                            <div className="AdminPanel__formGroup">
                                                <label>Date *</label>
                                                <input type="date" value={announcementForm.announcement_date} onChange={e => setAnnouncementForm({ ...announcementForm, announcement_date: e.target.value })} />
                                            </div>
                                            <div className="AdminPanel__formGroup">
                                                <label>
                                                    <input type="checkbox" checked={announcementForm.priority} onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.checked })} />
                                                    {' '}Priority
                                                </label>
                                            </div>
                                            <div className="AdminPanel__modalActions">
                                                <button className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary" onClick={() => setShowAnnouncementModal(false)}>Cancel</button>
                                                <button className="AdminPanel__modalBtn AdminPanel__modalBtn--primary" onClick={saveAnnouncement}>{editingAnnouncement ? 'Save' : 'Create'}</button>
                                            </div>
                                        </div>
                                    </div>,
                                    document.body
                                )
                                : null}
                        </motion.div>
                    )}

                    {/* === SUGGESTIONS & FEEDBACK === */}
                    {accessLevel === 'full' && activeTab === 'suggestions' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <h2 className="AdminPanel__sectionTitle"><MdFeedback /> Suggestions</h2>
                                {suggestionsLoading ? (
                                    <div className="AdminPanel__empty"><p>Loading suggestions...</p></div>
                                ) : suggestionsError ? (
                                    <div className="AdminPanel__empty"><p>{suggestionsError}</p></div>
                                ) : suggestions.length === 0 ? (
                                    <div className="AdminPanel__empty"><p>No suggestions yet.</p></div>
                                ) : (
                                    <table className="AdminPanel__table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>From</th>
                                                <th>Suggestion</th>
                                                <th>Anonymous</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {suggestions.map((s) => (
                                                <tr key={s.suggestion_id}>
                                                    <td>{formatDate(s.created_at)}</td>
                                                    <td>
                                                        {s.anonymous
                                                            ? '—'
                                                            : (s.member?.full_name || s.name || s.email || s.member_id || 'Guest')}
                                                    </td>
                                                    <td style={{ maxWidth: 320 }}>{s.suggestion}</td>
                                                    <td>{s.anonymous ? 'Yes' : 'No'}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                                            onClick={async () => {
                                                                if (!window.confirm('Delete this suggestion?')) return;
                                                                try {
                                                                    await ApiService.deleteAdminSuggestion(s.suggestion_id);
                                                                    setAlert({ type: 'success', message: 'Suggestion deleted.' });
                                                                    fetchSuggestionsAndFeedback();
                                                                } catch (err) {
                                                                    setAlert({ type: 'error', message: err.message || 'Delete failed' });
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <Pagination
                                    pagination={suggestionsPagination}
                                    onPageChange={(p) => { setSuggestionsPage(p); }}
                                />
                            </div>
                            <div className="AdminPanel__section" style={{ marginTop: 24 }}>
                                <h2 className="AdminPanel__sectionTitle">Event Feedback</h2>
                                {feedbackLoading ? (
                                    <div className="AdminPanel__empty"><p>Loading feedback...</p></div>
                                ) : feedbackError ? (
                                    <div className="AdminPanel__empty"><p>{feedbackError}</p></div>
                                ) : feedbackList.length === 0 ? (
                                    <div className="AdminPanel__empty"><p>No feedback yet.</p></div>
                                ) : (
                                    <table className="AdminPanel__table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Event</th>
                                                <th>Feedback</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {feedbackList.map((f) => (
                                                <tr key={f.feedback_id}>
                                                    <td>{formatDate(f.created_at)}</td>
                                                    <td>{f.event?.name || f.event_id}</td>
                                                    <td style={{ maxWidth: 400 }}>{f.feedback}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                                            onClick={async () => {
                                                                if (!window.confirm('Delete this feedback?')) return;
                                                                try {
                                                                    await ApiService.deleteAdminFeedback(f.feedback_id);
                                                                    setAlert({ type: 'success', message: 'Feedback deleted.' });
                                                                    fetchSuggestionsAndFeedback();
                                                                } catch (err) {
                                                                    setAlert({ type: 'error', message: err.message || 'Delete failed' });
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <Pagination
                                    pagination={feedbackPagination}
                                    onPageChange={(p) => { setFeedbackPage(p); }}
                                />
                            </div>
                        </motion.div>
                    )}
        </AdminShell>
    );
};

export default AdminPanel;

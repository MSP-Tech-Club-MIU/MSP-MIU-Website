import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MdDashboard, MdEmojiEvents, MdFactCheck, MdAppRegistration,
    MdSearch, MdNotifications, MdLogout, MdHome, MdAdd, MdMenu,
    MdClose, MdPeople, MdEvent, MdPendingActions, MdDescription,
    MdTrendingUp, MdCalendarToday, MdCampaign, MdFeedback, MdPerson
} from 'react-icons/md';
import ApiService from '../../services/api';
import SEO from '../../components/SEO';
import mspLogo from '../../assets/Images/msp-logo.png';
import './AdminPanel.css';

/* ═══════════════════════════════════════════════════════════
   Antigravity-style Particle Background (Canvas)
   ═══════════════════════════════════════════════════════════ */
const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Create particles
        const PARTICLE_COUNT = 180;
        const colors = [
            'rgba(74, 166, 255, 0.4)',
            'rgba(30, 198, 255, 0.35)',
            'rgba(13, 123, 216, 0.3)',
            'rgba(191, 224, 255, 0.2)',
            'rgba(0, 51, 255, 0.25)',
        ];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2.2 + 0.3,
                speedX: (Math.random() - 0.5) * 0.35,
                speedY: (Math.random() - 0.5) * 0.35,
                color: colors[Math.floor(Math.random() * colors.length)],
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.015 + 0.005,
                depth: Math.random(),
            });
        }

        // Mouse interaction
        let mouse = { x: -1000, y: -1000 };
        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, i) => {
                p.pulse += p.pulseSpeed;
                const sizeMod = Math.sin(p.pulse) * 0.5 + 0.5;
                const currentSize = p.size * (0.6 + sizeMod * 0.6);

                // Mouse repulsion (antigravity effect)
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const magnetRadius = 120;

                if (dist < magnetRadius && dist > 0) {
                    const force = (1 - dist / magnetRadius) * 2.5;
                    p.x += (dx / dist) * force;
                    p.y += (dy / dist) * force;
                }

                // Movement
                p.x += p.speedX * (0.5 + p.depth * 0.5);
                p.y += p.speedY * (0.5 + p.depth * 0.5);

                // Wrap around
                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;
                if (p.y < -10) p.y = canvas.height + 10;
                if (p.y > canvas.height + 10) p.y = -10;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                // Draw connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const cdx = p.x - p2.x;
                    const cdy = p.y - p2.y;
                    const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                    const connectDist = 100 + p.depth * 40;

                    if (cdist < connectDist) {
                        const alpha = (1 - cdist / connectDist) * 0.12;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(74, 166, 255, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return <canvas ref={canvasRef} className="AdminPanel__particleBg" />;
};

const ADMIN_TAB_TO_ROUTE = {
    dashboard: 'dashboard',
    competitions: 'competitions',
    attendance: 'attendance',
    registrations: 'registrations',
    notifications: 'notifications',
    announcements: 'announcements',
    suggestions: 'suggestions'
};

const ADMIN_ROUTE_TO_TAB = {
    dashboard: 'dashboard',
    competitions: 'competitions',
    attendance: 'attendance',
    registrations: 'registrations',
    notifications: 'notifications',
    announcements: 'announcements',
    suggestions: 'suggestions'
};

/* ═══════════════════════════════════════════════════════════
   Admin Panel Component
   ═══════════════════════════════════════════════════════════ */
const AdminPanel = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const getAdminTabFromPath = useCallback((pathname) => {
        if (!pathname.startsWith('/admin')) return 'dashboard';
        const segment = pathname.split('/')[2];
        if (!segment) return 'dashboard';
        return ADMIN_ROUTE_TO_TAB[segment] || 'dashboard';
    }, []);

    const [activeTab, setActiveTab] = useState(() => getAdminTabFromPath(location.pathname));
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [alert, setAlert] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Hide Navbar and Footer when AdminPanel is mounted
    useEffect(() => {
        document.body.classList.add('admin-panel-active');
        return () => {
            document.body.classList.remove('admin-panel-active');
        };
    }, []);

    useEffect(() => {
        if (location.pathname === '/admin' || location.pathname === '/admin/') {
            navigate('/admin/dashboard', { replace: true });
            return;
        }

        const tabFromPath = getAdminTabFromPath(location.pathname);
        setActiveTab((prev) => (prev === tabFromPath ? prev : tabFromPath));
    }, [location.pathname, navigate, getAdminTabFromPath]);

    // Dashboard state
    const [stats, setStats] = useState(null);

    // Competitions state
    const [competitions, setCompetitions] = useState([]);
    const [showCompModal, setShowCompModal] = useState(false);
    const [editingComp, setEditingComp] = useState(null);
    const [compForm, setCompForm] = useState({
        name: '', description: '', start_date: '', end_date: '',
        registration_deadline: '', max_team_size: 4, min_team_size: 1,
        max_teams: '', status: 'draft', location_type: 'on-campus', location: '', rules: '',
        type: 'project', submission_mode: 'upload', evaluation_mode: 'manual',
        is_multitask: false,
        is_team_based: true
    });

    // Competition Teams state
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [viewingCompTeams, setViewingCompTeams] = useState(null); // The competition we are viewing teams for
    const [teamsList, setTeamsList] = useState([]);
    const [teamsLoading, setTeamsLoading] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamForm, setTeamForm] = useState({ team_name: '', is_locked: false });

    // Attendance state
    const [attendance, setAttendance] = useState([]);
    const [attendanceFilters, setAttendanceFilters] = useState({ event_id: '', attended: '' });

    // Registrations state
    const [registrations, setRegistrations] = useState([]);
    const [regSearch, setRegSearch] = useState('');
    const [regStatusFilter, setRegStatusFilter] = useState('');

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState(null);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
    const notificationsFetchedRef = useRef(false);

    // Announcements state (for sidepanel view)
    const [announcements, setAnnouncements] = useState([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(false);
    const [announcementsError, setAnnouncementsError] = useState(null);
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

    // Admin profile for avatar
    const [adminProfile, setAdminProfile] = useState(null);

    // Global search (top bar)
    const [searchQuery, setSearchQuery] = useState('');

    // Navigation items
    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <MdDashboard /> },
        { key: 'competitions', label: 'Competitions', icon: <MdEmojiEvents /> },
        { key: 'attendance', label: 'Attendance', icon: <MdFactCheck /> },
        { key: 'registrations', label: 'Registrations', icon: <MdAppRegistration /> },
        { key: 'notifications', label: 'Notifications', icon: <MdNotifications /> },
        { key: 'announcements', label: 'Announcements', icon: <MdCampaign /> },
        { key: 'suggestions', label: 'Suggestions & Feedback', icon: <MdFeedback /> },
        { key: 'profile', label: 'Profile', icon: <MdPerson />, onClick: () => navigate('/profile') },
        { key: 'home', label: 'Home', icon: <MdHome />, onClick: () => navigate('/') },
    ];

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

            const result = await ApiService.checkAdminAccess();
            if (!result.success) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            setHasAccess(true);
            setLoading(false);

            // Load initial data for the admin
            fetchDashboard();
            fetchCompetitions();
            fetchAttendance();
            fetchRegistrations();
            fetchNotifications();

            // Load admin profile for avatar / initials
            try {
                const profile = await ApiService.getProfile();
                setAdminProfile(profile);
            } catch (err) {
                console.error('Failed to load admin profile:', err);
            }
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
    const fetchDashboard = useCallback(async () => {
        try {
            const data = await ApiService.getAdminDashboard();
            setStats(data);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        }
    }, []);

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

    const fetchRegistrations = useCallback(async (overrideSearch) => {
        try {
            const filters = {};
            if (regStatusFilter) filters.status = regStatusFilter;
            const searchValue = overrideSearch !== undefined ? overrideSearch : regSearch;
            if (searchValue) filters.search = searchValue;
            const data = await ApiService.getAdminRegistrations(filters);
            setRegistrations(data || []);
        } catch (err) {
            console.error('Failed to load registrations:', err);
        }
    }, [regStatusFilter, regSearch]);

    const fetchNotifications = useCallback(async () => {
        try {
            setNotificationsLoading(true);
            setNotificationsError(null);
            const data = await ApiService.getAdminNotifications(100);
            setNotifications(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
            setNotificationsError(err.message || 'Failed to load notifications');
            setNotifications([]);
        } finally {
            setNotificationsLoading(false);
            notificationsFetchedRef.current = true;
        }
    }, []);

    const fetchAnnouncementsAdmin = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setAnnouncementsLoading(true);
            setAnnouncementsError(null);
            const data = await ApiService.getAnnouncements(false);
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load announcements:', err);
            setAnnouncementsError(err.message || 'Failed to load announcements');
            setAnnouncements([]);
        } finally {
            setAnnouncementsLoading(false);
        }
    }, []);

    // Load data when tab changes
    useEffect(() => {
        if (!hasAccess) return;
        if (activeTab === 'dashboard') fetchDashboard();
        if (activeTab === 'competitions') fetchCompetitions();
        if (activeTab === 'attendance') fetchAttendance();
        if (activeTab === 'registrations') fetchRegistrations();
        if (activeTab === 'notifications') fetchNotifications();
        if (activeTab === 'announcements') fetchAnnouncementsAdmin(announcements.length === 0);
        if (activeTab === 'suggestions') {
            (async () => {
                setSuggestionsLoading(true);
                setSuggestionsError(null);
                setFeedbackLoading(true);
                setFeedbackError(null);
                try {
                    const [sug, fb] = await Promise.all([
                        ApiService.getAdminSuggestions(),
                        ApiService.getAdminFeedback()
                    ]);
                    setSuggestions(sug || []);
                    setFeedbackList(fb || []);
                } catch (err) {
                    console.error('Failed to load suggestions/feedback:', err);
                    setSuggestionsError(err.message || 'Failed to load');
                    setFeedbackError(err.message || 'Failed to load');
                } finally {
                    setSuggestionsLoading(false);
                    setFeedbackLoading(false);
                }
            })();
        }
    }, [
        activeTab,
        hasAccess,
        fetchDashboard,
        fetchCompetitions,
        fetchAttendance,
        fetchRegistrations,
        fetchNotifications,
        fetchAnnouncementsAdmin
    ]);

    // Competition CRUD
    const openCompModal = (comp = null) => {
        if (comp) {
            setEditingComp(comp);
            setCompForm({
                name: comp.title || '',
                description: comp.description || '',
                start_date: comp.start_at ? comp.start_at.split('T')[0] : '',
                end_date: comp.end_at ? comp.end_at.split('T')[0] : '',
                registration_deadline: '',
                max_team_size: comp.max_team_size || 4,
                min_team_size: comp.min_team_size || 1,
                max_teams: '',
                status: comp.status || 'draft',
                location_type: comp.location_type || 'on-campus',
                location: comp.location_details || '',
                rules: comp.rules != null ? String(comp.rules) : ''
            });
        } else {
            setEditingComp(null);
            setCompForm({
                name: '', description: '', start_date: '', end_date: '',
                registration_deadline: '', max_team_size: 4, min_team_size: 1,
                max_teams: '', status: 'draft', location: '', rules: '',
                type: 'project', submission_mode: 'upload', evaluation_mode: 'manual',
                is_multitask: false,
                is_team_based: true
            });
        }
        setShowCompModal(true);
    };

    const saveCompetition = async () => {
        try {
            const data = {
                title: compForm.name,
                description: compForm.description,
                start_at: compForm.start_date,
                end_at: compForm.end_date,
                max_team_size: compForm.max_team_size,
                min_team_size: compForm.min_team_size,
                status: compForm.status,
                location_type: compForm.location_type || 'on-campus',
                location_details: compForm.location || null,
                rules: compForm.rules != null && String(compForm.rules).trim() !== '' ? String(compForm.rules).trim() : ''
            };

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

    // ===================================
    // Team Management (Competitions)
    // ===================================
    const fetchCompTeams = async (compId) => {
        try {
            setTeamsLoading(true);
            const data = await ApiService.getAdminCompetitionTeams(compId);
            setTeamsList(data || []);
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to load teams' });
        } finally {
            setTeamsLoading(false);
        }
    };

    const openTeamModal = async (comp) => {
        setViewingCompTeams(comp);
        setEditingTeam(null);
        setTeamForm({ team_name: '', is_locked: false });
        setShowTeamModal(true);
        await fetchCompTeams(comp.competition_id);
    };

    const closeTeamModal = () => {
        setShowTeamModal(false);
        setViewingCompTeams(null);
        setTeamsList([]);
    };

    const saveTeam = async () => {
        if (!teamForm.team_name.trim()) {
            setAlert({ type: 'error', message: 'Team name is required' });
            return;
        }

        try {
            if (editingTeam) {
                await ApiService.updateAdminTeam(editingTeam.team_id, teamForm);
                setAlert({ type: 'success', message: 'Team updated successfully!' });
            } else {
                await ApiService.createAdminTeam(viewingCompTeams.competition_id, teamForm);
                setAlert({ type: 'success', message: 'Team created successfully!' });
            }

            setEditingTeam(null);
            setTeamForm({ team_name: '', is_locked: false });
            fetchCompTeams(viewingCompTeams.competition_id);
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to save team' });
        }
    };

    const editTeamSettings = (team) => {
        setEditingTeam(team);
        setTeamForm({ team_name: team.team_name, is_locked: team.is_locked || false });
    };

    const deleteTeam = async (teamId) => {
        if (!window.confirm('Are you sure you want to delete this team?')) return;
        try {
            await ApiService.deleteAdminTeam(teamId);
            setAlert({ type: 'success', message: 'Team deleted successfully!' });
            fetchCompTeams(viewingCompTeams.competition_id);
        } catch (err) {
            setAlert({ type: 'error', message: err.message || 'Failed to delete team' });
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

    const openAnnouncementModal = (announcement = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setAnnouncementForm({
                title: announcement.title || '',
                description: announcement.description || '',
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
            if (editingAnnouncement) {
                await ApiService.updateAnnouncement(editingAnnouncement.announcement_id, announcementForm);
                setAlert({ type: 'success', message: 'Announcement updated!' });
            } else {
                await ApiService.createAnnouncement(announcementForm);
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

    const getLeaderMember = (team) => (team?.members || []).find((member) => member.role === 'leader');
    const getTeammates = (team) => (team?.members || []).filter((member) => member.role !== 'leader');

    const handleTabChange = (key) => {
        const item = navItems.find(n => n.key === key);
        if (item?.onClick) {
            item.onClick();
            return;
        }
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
        const item = navItems.find(n => n.key === activeTab);
        return item ? item.label : 'Dashboard';
    };

    const handleSearchSubmit = () => {
        if (activeTab === 'registrations') {
            setRegSearch(searchQuery);
            fetchRegistrations(searchQuery);
        }
        // Competitions and attendance filter client-side by searchQuery (state already drives the filter)
    };

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
                    <p>Only the President, Vice President, and Head of Software Development can access the admin panel.</p>
                    <button className="AdminPanel__accessDeniedBtn" onClick={() => navigate('/')}>
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="AdminPanel">
            <SEO title="Admin Panel — MSP MIU" description="MSP MIU Admin Panel" />
            <ParticleBackground />

            {/* Mobile overlay */}
            <div
                className={`AdminPanel__mobileOverlay ${mobileMenuOpen ? 'visible' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* ── Sidebar ── */}
            <aside className={`AdminPanel__sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <img
                    src={mspLogo}
                    alt="MSP Logo"
                    className="AdminPanel__sidebarLogo"
                    onClick={() => navigate('/')}
                />

                <nav className="AdminPanel__sidebarNav">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            className={`AdminPanel__navItem ${activeTab === item.key ? 'active' : ''}`}
                            onClick={() => handleTabChange(item.key)}
                            aria-label={item.label}
                        >
                            {item.icon}
                            <span className="AdminPanel__navTooltip">{item.label}</span>
                        </button>
                    ))}
                </nav>


            </aside>

            {/* ── Main Content ── */}
            <main className="AdminPanel__main">
                {/* Top Bar */}
                <header className="AdminPanel__topBar">
                    <div className="AdminPanel__topLeft">
                        <h1 className="AdminPanel__pageTitle">
                            <span className="AdminPanel__pageTitleIcon">
                                {navItems.find(n => n.key === activeTab)?.icon}
                            </span>
                            {getPageTitle()}
                        </h1>
                    </div>

                    <div className="AdminPanel__topRight">
                        <button
                            className="AdminPanel__topBtn"
                            aria-label="Notifications"
                            onClick={() => {
                                const open = !showNotificationsDropdown;
                                setShowNotificationsDropdown(open);
                                if (open && !notificationsFetchedRef.current) {
                                    fetchNotifications();
                                }
                            }}
                        >
                            <MdNotifications />
                        </button>
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

                        {showNotificationsDropdown && (
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
                                        setActiveTab('notifications');
                                    }}
                                >
                                    View all notifications
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="AdminPanel__content">
                    {/* Greeting */}
                    <div className="AdminPanel__greeting">
                        <p className="AdminPanel__greetingSub">{getGreeting()},</p>
                        <h2 className="AdminPanel__greetingName">{adminTitle}</h2>
                        <p className="AdminPanel__greetingSub">{adminName}</p>
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

                    {/* === DASHBOARD === */}
                    {activeTab === 'dashboard' && stats && (
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

                    {/* === COMPETITIONS === */}
                    {activeTab === 'competitions' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <div className="AdminPanel__sectionHeader">
                                    <h2 className="AdminPanel__sectionTitle">
                                        <MdEmojiEvents /> Manage Competitions
                                    </h2>
                                    <button className="AdminPanel__addBtn" onClick={() => openCompModal()}>
                                        <MdAdd /> Add Competition
                                    </button>
                                </div>

                                {(() => {
                                    const filtered = competitions.filter(comp => {
                                        if (!searchQuery || activeTab !== 'competitions') return true;
                                        const q = searchQuery.toLowerCase();
                                        return (
                                            comp.title?.toLowerCase().includes(q) ||
                                            comp.status?.toLowerCase().includes(q)
                                        );
                                    });
                                    if (filtered.length === 0) {
                                        return (
                                            <div className="AdminPanel__empty">
                                                <p>{searchQuery && activeTab === 'competitions' ? `No competitions match "${searchQuery}".` : 'No competitions yet.'}</p>
                                            </div>
                                        );
                                    }
                                    return (
                                        <table className="AdminPanel__table" key="comp-table">
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
                                                {filtered.map(comp => (
                                                    <tr key={comp.competition_id}>
                                                        <td style={{ fontWeight: 600 }}>{comp.title}</td>
                                                        <td>
                                                            <span className={`AdminPanel__badge AdminPanel__badge--${comp.status || 'draft'}`}>
                                                                {comp.status}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(comp.start_at)}</td>
                                                        <td>{formatDate(comp.end_at)}</td>
                                                        <td>{comp.max_team_size || '-'}</td>
                                                        <td>
                                                            <button
                                                                className="AdminPanel__actionBtn AdminPanel__actionBtn--view"
                                                                onClick={() => openTeamModal(comp)}
                                                            >
                                                                View Teams
                                                            </button>
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
                                    );
                                })()}
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
                                                    <option value="draft">Draft</option>
                                                    <option value="open">Open</option>
                                                    <option value="locked">Locked</option>
                                                    <option value="judging">Judging</option>
                                                    <option value="finished">Finished</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="AdminPanel__formGroup">
                                            <label>Rules (optional)</label>
                                            <textarea
                                                value={compForm.rules}
                                                onChange={e => setCompForm({ ...compForm, rules: e.target.value })}
                                                placeholder="Competition rules"
                                                rows={3}
                                            />
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
                                                <label>Location Type</label>
                                                <select
                                                    value={compForm.location_type}
                                                    onChange={e => setCompForm({ ...compForm, location_type: e.target.value })}
                                                >
                                                    <option value="on-campus">On Campus</option>
                                                    <option value="online">Online</option>
                                                </select>
                                            </div>
                                            <div className="AdminPanel__formGroup">
                                                <label>Location Details</label>
                                                <input
                                                    value={compForm.location}
                                                    onChange={e => setCompForm({ ...compForm, location: e.target.value })}
                                                    placeholder={compForm.location_type === 'online' ? 'e.g. Zoom / Google Meet link' : 'e.g. MIU Campus'}
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

                            {/* Teams Modal */}
                            {showTeamModal && viewingCompTeams && (
                                <div className="AdminPanel__modalOverlay" onClick={closeTeamModal}>
                                    <div className="AdminPanel__modalContent AdminPanel__modalContent--large" onClick={e => e.stopPropagation()}>
                                        <div className="AdminPanel__modalHeader">
                                            <h3>Teams: {viewingCompTeams.title}</h3>
                                            <button className="AdminPanel__modalClose" onClick={closeTeamModal}>
                                                <MdClose />
                                            </button>
                                        </div>

                                        <div className="AdminPanel__teamsSection">
                                            <div className="AdminPanel__teamForm">
                                                <h4>{editingTeam ? 'Edit Team' : 'Add New Team'}</h4>
                                                <div className="AdminPanel__formRow">
                                                    <div className="AdminPanel__formGroup" style={{ flex: 2 }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Team Name"
                                                            value={teamForm.team_name}
                                                            onChange={e => setTeamForm({ ...teamForm, team_name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="AdminPanel__formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                                        <label htmlFor="isLocked">Locked?</label>
                                                        <input
                                                            id="isLocked"
                                                            type="checkbox"
                                                            checked={teamForm.is_locked}
                                                            onChange={e => setTeamForm({ ...teamForm, is_locked: e.target.checked })}
                                                            style={{ width: 'auto', marginBottom: 0 }}
                                                        />
                                                    </div>
                                                    <button
                                                        className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                                                        onClick={saveTeam}
                                                        style={{ height: '42px' }}
                                                    >
                                                        {editingTeam ? 'Update Team' : 'Add Team'}
                                                    </button>
                                                    {editingTeam && (
                                                        <button
                                                            className="AdminPanel__actionBtn AdminPanel__actionBtn--secondary"
                                                            onClick={() => {
                                                                setEditingTeam(null);
                                                                setTeamForm({ team_name: '', is_locked: false });
                                                            }}
                                                            style={{ height: '42px' }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {teamsLoading ? (
                                                <div className="AdminPanel__loading">Loading teams...</div>
                                            ) : teamsList.length === 0 ? (
                                                <div className="AdminPanel__emptyState">No teams created for this competition yet.</div>
                                            ) : (
                                                <table className="AdminPanel__table">
                                                    <thead>
                                                        <tr>
                                                            <th>Team Name</th>
                                                            <th>Participants</th>
                                                            <th>Created By</th>
                                                            <th>Status</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {teamsList.map(team => {
                                                            const leader = getLeaderMember(team);
                                                            const teammates = getTeammates(team);

                                                            return (
                                                                <tr key={team.team_id}>
                                                                    <td style={{ fontWeight: 600 }}>{team.team_name}</td>
                                                                    <td>
                                                                        {(team.members || []).length === 0 ? (
                                                                            <span>No participants yet</span>
                                                                        ) : (
                                                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                                                <div>
                                                                                    <strong>Leader:</strong>{' '}
                                                                                    {leader?.user?.full_name || team.creator?.full_name || 'Unknown'}
                                                                                    {leader?.user?.university_id ? ` (${leader.user.university_id})` : ''}
                                                                                    {leader?.user?.email ? ` - ${leader.user.email}` : ''}
                                                                                </div>

                                                                                {teammates.length > 0 ? (
                                                                                    <div>
                                                                                        <strong>Teammates:</strong>
                                                                                        <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                                                                                            {teammates.map((member) => (
                                                                                                <li key={member.team_member_id}>
                                                                                                    {member?.user?.full_name || 'Unknown'}
                                                                                                    {member?.user?.university_id ? ` (${member.user.university_id})` : ''}
                                                                                                    {member?.user?.email ? ` - ${member.user.email}` : ''}
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div><strong>Teammates:</strong> No teammates yet</div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td>{team.creator?.full_name || 'Admin'}</td>
                                                                    <td>
                                                                        <span className={`AdminPanel__badge AdminPanel__badge--${team.is_locked ? 'rejected' : 'approved'}`}>
                                                                            {team.is_locked ? 'Locked' : 'Open'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <button
                                                                            className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                                                                            onClick={() => editTeamSettings(team)}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                                                                            onClick={() => deleteTeam(team.team_id)}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* === ATTENDANCE === */}
                    {activeTab === 'attendance' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <div className="AdminPanel__sectionHeader">
                                    <h2 className="AdminPanel__sectionTitle">
                                        <MdFactCheck /> Attendance Review
                                    </h2>
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
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                            <div className="AdminPanel__section">
                                <div className="AdminPanel__sectionHeader">
                                    <h2 className="AdminPanel__sectionTitle">
                                        <MdAppRegistration /> Registration Management
                                    </h2>
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
                                        onClick={() => fetchRegistrations()}
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

                    {/* === NOTIFICATIONS (FULL LIST) === */}
                    {activeTab === 'notifications' && (
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
                            </div>
                        </motion.div>
                    )}

                    {/* === ANNOUNCEMENTS OVERVIEW === */}
                    {activeTab === 'announcements' && (
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
                                                    <td style={{ fontWeight: 600 }}>{a.title}</td>
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
                            </div>

                            {showAnnouncementModal && (
                                <div className="AdminPanel__modal" onClick={() => setShowAnnouncementModal(false)}>
                                    <div className="AdminPanel__modalContent" onClick={e => e.stopPropagation()}>
                                        <h3 className="AdminPanel__modalTitle">{editingAnnouncement ? 'Edit Announcement' : 'Add Announcement'}</h3>
                                        <div className="AdminPanel__formGroup">
                                            <label>Title *</label>
                                            <input value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="Title" />
                                        </div>
                                        <div className="AdminPanel__formGroup">
                                            <label>Description *</label>
                                            <textarea value={announcementForm.description} onChange={e => setAnnouncementForm({ ...announcementForm, description: e.target.value })} placeholder="Description" rows={4} />
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
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* === SUGGESTIONS & FEEDBACK === */}
                    {activeTab === 'suggestions' && (
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
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {suggestions.map((s) => (
                                                <tr key={s.suggestion_id}>
                                                    <td>{formatDate(s.created_at)}</td>
                                                    <td>{s.anonymous ? '—' : (s.member?.full_name || s.member_id)}</td>
                                                    <td style={{ maxWidth: 320 }}>{s.suggestion}</td>
                                                    <td>{s.anonymous ? 'Yes' : 'No'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
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
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {feedbackList.map((f) => (
                                                <tr key={f.feedback_id}>
                                                    <td>{formatDate(f.created_at)}</td>
                                                    <td>{f.event?.name || f.event_id}</td>
                                                    <td style={{ maxWidth: 400 }}>{f.feedback}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Mobile toggle button */}
            <button
                className="AdminPanel__mobileToggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
            >
                {mobileMenuOpen ? <MdClose /> : <MdMenu />}
            </button>
        </div>
    );
};

export default AdminPanel;

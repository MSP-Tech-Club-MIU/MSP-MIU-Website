import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from 'react-use-gesture';
import {
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaUser,
  FaTimes,
  FaUserPlus,
  FaSignInAlt,
  FaSignOutAlt,
  FaAndroid,
  FaChevronDown,
  FaHandshake,
  FaGamepad,
  FaTrophy,
  FaClipboardCheck,
} from 'react-icons/fa';
import {
  MdGroups,
  MdEmojiEvents,
  MdFeedback,
  MdMenuBook,
  MdDashboard,
  MdOutlineAdminPanelSettings,
} from 'react-icons/md';
import './Navbar.css';
import ApiService from '../../services/api';
import AndroidBackButtonHandler from '../../components/AndroidBackButtonHandler';
import { isCapacitor, isAndroid } from '../../utils/androidBackButton';
import mspLogo from '../../assets/Images/msp-logo.png';

function pathMatchesNavTarget(pathname, to) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

const Navbar = memo(() => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const moreWrapRef = useRef(null);
  const moreMegaRef = useRef(null);
  const profileWrapRef = useRef(null);
  const profileMenuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Authentication check: run on mount, tab focus, and storage event
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async (forceRefresh = false) => {
      const isAuth = ApiService.isAuthenticated();
      if (!isMounted) return;
      setIsAuthenticated(isAuth);

      if (isAuth) {
        if (forceRefresh || !user) {
          try {
            const userData = await ApiService.getProfile();
            if (isMounted) {
              setUser(userData);
            }
          } catch (error) {
            if (isMounted) {
              setIsAuthenticated(false);
              setUser(null);
            }
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
        }
      }
    };

    checkAuth();

    // Check when user returns to tab
    const handleFocus = () => {
      const currentTokenState = ApiService.isAuthenticated();
      if (currentTokenState !== isAuthenticated) {
        checkAuth(true);
      }
    };

    // Storage event for multi-tab synchronization or explicit logout
    const handleStorageChange = (e) => {
      if (!e || e.key === 'authToken' || e.type === 'storage') {
        checkAuth(true);
      }
    };

    // Periodic token expiration check (every 45s)
    const intervalId = setInterval(() => {
      if (ApiService.isAuthenticated()) {
        if (ApiService.isTokenExpired && ApiService.isTokenExpired()) {
          checkAuth(true);
        }
      } else if (isAuthenticated) {
        checkAuth(true);
      }
    }, 45000);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, user]);

  // Sync auth state if token state changes during route transition
  useEffect(() => {
    const hasToken = ApiService.isAuthenticated();
    if (hasToken !== isAuthenticated) {
      setIsAuthenticated(hasToken);
      if (hasToken) {
        ApiService.getProfile()
          .then((data) => setUser(data))
          .catch(() => {
            setIsAuthenticated(false);
            setUser(null);
          });
      } else {
        setUser(null);
      }
    }
  }, [location.pathname, isAuthenticated]);

  // Android Capacitor safe-area detection
  useEffect(() => {
    const android = isAndroid();
    setIsAndroidDevice(android);

    if (android) {
      const getStatusBarHeight = () => {
        if (window.visualViewport) {
          const diff = window.innerHeight - window.visualViewport.height;
          if (diff > 0 && diff < 100) {
            return diff;
          }
        }
        try {
          const testEl = document.createElement('div');
          testEl.style.cssText = 'position:fixed;top:0;left:-9999px;padding-top:env(safe-area-inset-top,0px);';
          document.body.appendChild(testEl);
          const computed = window.getComputedStyle(testEl);
          const paddingTop = computed.paddingTop;
          const value = parseFloat(paddingTop);
          document.body.removeChild(testEl);
          if (value > 0) return value;
        } catch (e) {
          // Ignore
        }
        return 0;
      };

      const checkHeight = () => {
        const height = getStatusBarHeight();
        setStatusBarHeight(height);
      };

      checkHeight();
      const timeoutId = setTimeout(checkHeight, 100);

      const handleResize = () => checkHeight();
      window.addEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
      }

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
        }
      };
    }
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Throttled scroll listener
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 20;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Logout handler
  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    try {
      await ApiService.logout();
    } catch (err) {
      console.error('Logout failed:', err);
      ApiService.removeAuthToken();
    }
    setIsAuthenticated(false);
    setUser(null);
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  }, [navigate]);

  // Role resolution
  const userRole = user?.role?.toLowerCase();
  const deptRaw = user?.department_id;
  const deptId = typeof deptRaw === 'number' ? deptRaw : parseInt(deptRaw, 10);
  const isAdminOrBoard = Boolean(
    userRole === 'board' ||
    userRole === 'admin' ||
    (!Number.isNaN(deptId) && deptId === 5)
  );

  const roleLabel = useMemo(() => {
    if (userRole === 'board') return 'Board Member';
    if (userRole === 'admin') return 'Admin';
    if (userRole === 'instructor') return 'Instructor';
    if (userRole === 'judge') return 'Judge';
    return 'Member';
  }, [userRole]);

  // Navigation items definition (Leaderboard intentionally excluded)
  const navSections = useMemo(() => {
    const primary = [
      { to: '/', label: 'Home', icon: <FaHome /> },
      { to: '/about', label: 'About Us', icon: <MdGroups /> },
      { to: '/events', label: 'Events', icon: <FaCalendarAlt /> },
      { to: '/courses', label: 'Courses', icon: <MdMenuBook /> },
      { to: '/competitions', label: 'Competitions', icon: <MdEmojiEvents /> },
    ];
    const extended = [
      { to: '/Meet-the-board', label: 'Meet the Board', icon: <FaUsers /> },
      { to: '/sponsors', label: 'Sponsors', icon: <FaHandshake /> },
      { to: '/suggestions', label: 'Suggestions / Feedback', icon: <MdFeedback /> },
      { to: '/game', label: 'Cyber Runner', icon: <FaGamepad /> },
    ];
    if (!isCapacitor()) {
      extended.push({ to: '/download-android', label: 'Download App', icon: <FaAndroid /> });
    }
    return { primary, extended };
  }, []);

  const extendedHasActive = useMemo(
    () => navSections.extended.some((l) => pathMatchesNavTarget(location.pathname, l.to)),
    [navSections.extended, location.pathname]
  );

  // Close menus on navigation
  useEffect(() => {
    setMoreOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (extendedHasActive) {
      setMobileMoreOpen(true);
    }
  }, [extendedHasActive]);

  // Click-outside listener for desktop dropdowns
  useEffect(() => {
    if (!moreOpen && !profileOpen) return;
    const onPointerDown = (e) => {
      if (moreOpen) {
        const inTrigger = moreWrapRef.current?.contains(e.target);
        const inMega = moreMegaRef.current?.contains(e.target);
        if (!inTrigger && !inMega) {
          setMoreOpen(false);
        }
      }
      if (profileOpen) {
        const inProfileWrap = profileWrapRef.current?.contains(e.target);
        const inProfileMenu = profileMenuRef.current?.contains(e.target);
        if (!inProfileWrap && !inProfileMenu) {
          setProfileOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [moreOpen, profileOpen]);

  // Close desktop menus on viewport resize
  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth <= 1180) {
        if (moreOpen) setMoreOpen(false);
        if (profileOpen) setProfileOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [moreOpen, profileOpen]);

  // Keyboard accessibility: Escape key closes menus
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      if (mobileOpen) closeMobile();
      else if (moreOpen) setMoreOpen(false);
      else if (profileOpen) setProfileOpen(false);
    };
    if (mobileOpen || moreOpen || profileOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [mobileOpen, moreOpen, profileOpen, closeMobile]);

  // Swipe-to-close gesture on mobile drawer
  const bindDrawerCloseGesture = useDrag(
    ({ swipe: [swipeX] }) => {
      if (swipeX === 1) {
        closeMobile();
      }
    },
    {
      axis: 'x',
      swipeVelocity: [0.3, 0.3],
      filterTaps: true,
      enabled: mobileOpen,
    }
  );

  return (
    <header
      className={`Navbar ${scrolled ? 'Navbar--scrolled' : ''} ${moreOpen ? 'Navbar--megaOpen' : ''} ${
        isAndroidDevice && statusBarHeight > 0 ? 'Navbar--android' : ''
      }`}
      style={isAndroidDevice && statusBarHeight > 0 ? { paddingTop: `${statusBarHeight}px` } : {}}
    >
      {/* Accessible Skip Link */}
      <a href="#main-content" className="Navbar__skipLink">
        Skip to content
      </a>

      <div className="Navbar__inner">
        <NavLink to="/" className="Navbar__brand" aria-label="MSP Home">
          <img
            src={mspLogo}
            alt="MSP Logo"
            height={40}
            width={50}
          />
          <div className="Navbar__logoMark">MSP</div>
          <div className="Navbar__logoText">Tech Club</div>
        </NavLink>

        {/* Center: Navigation Links */}
        <nav className="Navbar__center" aria-label="Main Navigation">
          <ul className="Navbar__links">
            {navSections.primary.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) => `NavItem ${isActive ? 'is-active' : ''}`}
                >
                  <span className="NavItem__icon">{l.icon}</span>
                  <span className="NavItem__label">{l.label}</span>
                </NavLink>
              </li>
            ))}

            {/* Desktop "More" Dropdown Trigger */}
            {navSections.extended.length > 0 && (
              <li className="Navbar__moreWrap" ref={moreWrapRef}>
                <button
                  type="button"
                  className={`NavItem NavItem--more ${moreOpen ? 'is-open' : ''} ${
                    extendedHasActive ? 'has-active-child' : ''
                  }`}
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                  aria-controls="navbar-more-panel"
                  id="navbar-more-trigger"
                  onClick={() => setMoreOpen((o) => !o)}
                >
                  <span className="NavItem__icon NavItem__icon--chevron">
                    <FaChevronDown />
                  </span>
                  <span className="NavItem__label">More</span>
                </button>
              </li>
            )}
          </ul>
        </nav>

        {/* Right: Auth / Profile Actions */}
        <div className="Navbar__right">
          {isAuthenticated ? (
            <div className="Navbar__profileWrap" ref={profileWrapRef}>
              <button
                type="button"
                className={`Navbar__profileBtn ${profileOpen ? 'is-open' : ''}`}
                onClick={() => setProfileOpen((o) => !o)}
                aria-expanded={profileOpen}
                aria-haspopup="true"
                aria-controls="navbar-profile-menu"
                aria-label={`Account menu for ${user?.full_name || 'user'}`}
              >
                <span className="Navbar__profileAvatar">
                  {user?.profile_picture_url ? (
                    <img
                      src={user.profile_picture_url}
                      alt={user?.full_name || 'Profile'}
                      className="Navbar__avatarImg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.parentElement?.querySelector('.Navbar__avatarFallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span
                    className="Navbar__avatarFallback"
                    style={{ display: user?.profile_picture_url ? 'none' : 'flex' }}
                    aria-hidden="true"
                  >
                    <FaUser />
                  </span>
                  <span className="Navbar__statusDot" />
                </span>
                <span className="Navbar__profileChevron">
                  <FaChevronDown />
                </span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    ref={profileMenuRef}
                    id="navbar-profile-menu"
                    role="menu"
                    aria-label="User Account Menu"
                    className="Navbar__profileDropdown"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* User Header */}
                    <div className="Navbar__profileHeader">
                      <div className="Navbar__profileHeaderAvatar">
                        {user?.profile_picture_url ? (
                          <img
                            src={user.profile_picture_url}
                            alt=""
                            className="Navbar__avatarImg"
                          />
                        ) : (
                          <FaUser />
                        )}
                      </div>
                      <div className="Navbar__profileHeaderMeta">
                        <span className="Navbar__profileName" title={user?.full_name || 'Member'}>
                          {user?.full_name || 'Member'}
                        </span>
                        {user?.email && (
                          <span className="Navbar__profileEmail" title={user.email}>
                            {user.email}
                          </span>
                        )}
                        <span className={`Navbar__roleBadge Navbar__roleBadge--${userRole || 'member'}`}>
                          {roleLabel}
                        </span>
                      </div>
                    </div>

                    <div className="Navbar__profileDivider" />

                    {/* Member Quick Links */}
                    <div className="Navbar__profileGroup">
                      <NavLink
                        to="/profile"
                        role="menuitem"
                        className="Navbar__profileMenuItem"
                        onClick={() => setProfileOpen(false)}
                      >
                        <FaUser className="Navbar__profileItemIcon" />
                        <span>My Profile</span>
                      </NavLink>
                      <NavLink
                        to="/attendance-request"
                        role="menuitem"
                        className="Navbar__profileMenuItem"
                        onClick={() => setProfileOpen(false)}
                      >
                        <FaClipboardCheck className="Navbar__profileItemIcon" />
                        <span>Attendance Request</span>
                      </NavLink>
                    </div>

                    {/* Admin Shortcuts (Board / Admin only) */}
                    {isAdminOrBoard && (
                      <>
                        <div className="Navbar__profileDivider" />
                        <div className="Navbar__profileSectionTitle">Management</div>
                        <div className="Navbar__profileGroup">
                          <NavLink
                            to="/admin"
                            role="menuitem"
                            className="Navbar__profileMenuItem Navbar__profileMenuItem--admin"
                            onClick={() => setProfileOpen(false)}
                          >
                            <MdDashboard className="Navbar__profileItemIcon" />
                            <span>Admin Panel</span>
                          </NavLink>
                          <NavLink
                            to="/admin/competition-management"
                            role="menuitem"
                            className="Navbar__profileMenuItem Navbar__profileMenuItem--admin"
                            onClick={() => setProfileOpen(false)}
                          >
                            <FaTrophy className="Navbar__profileItemIcon" />
                            <span>Competition Manager</span>
                          </NavLink>
                          <NavLink
                            to="/attendance-review"
                            role="menuitem"
                            className="Navbar__profileMenuItem Navbar__profileMenuItem--admin"
                            onClick={() => setProfileOpen(false)}
                          >
                            <MdOutlineAdminPanelSettings className="Navbar__profileItemIcon" />
                            <span>Review Attendance</span>
                          </NavLink>
                        </div>
                      </>
                    )}

                    <div className="Navbar__profileDivider" />

                    {/* Logout Button */}
                    <button
                      type="button"
                      role="menuitem"
                      className="Navbar__profileMenuItem Navbar__profileMenuItem--logout"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt className="Navbar__profileItemIcon" />
                      <span>Log Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="Navbar__authActions">
              <NavLink
                to="/become-member"
                className="NavItem NavItem--cta"
                aria-label="Become a Member"
              >
                <span className="NavItem__icon"><FaUserPlus /></span>
                <span className="NavItem__label">Become a Member</span>
              </NavLink>
              <NavLink
                to="/login"
                className="NavItem NavItem--login"
                aria-label="Login"
              >
                <span className="NavItem__icon"><FaSignInAlt /></span>
                <span className="NavItem__label">Login</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className={`NavHamburger ${mobileOpen ? 'is-open' : ''}`}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Desktop Mega Panel Backdrop Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {moreOpen && navSections.extended.length > 0 && (
              <motion.div
                className="Navbar__megaBackdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setMoreOpen(false)}
                aria-hidden="true"
              />
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Desktop Mega Panel */}
      <AnimatePresence>
        {moreOpen && navSections.extended.length > 0 && (
          <motion.div
            ref={moreMegaRef}
            id="navbar-more-panel"
            role="region"
            aria-labelledby="navbar-more-heading navbar-more-trigger"
            className="Navbar__mega"
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0 round 0 0 14px 14px)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0 round 0 0 14px 14px)' }}
            exit={{
              opacity: 0,
              clipPath: 'inset(0 0 100% 0 round 0 0 14px 14px)',
              transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            }}
            transition={{
              duration: 0.45,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
            }}
          >
            <motion.div
              className="Navbar__megaInner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="Navbar__megaHeader">
                <p className="Navbar__megaTitle" id="navbar-more-heading">
                  Explore More
                </p>
                <p className="Navbar__megaSubtitle">
                  Discover club activities, leadership, sponsors, and interactive tools
                </p>
              </div>
              <ul className="Navbar__megaGrid">
                {navSections.extended.map((l) => (
                  <li key={l.to} className="Navbar__megaCell">
                    <NavLink
                      to={l.to}
                      className={({ isActive }) =>
                        `Navbar__megaCard ${isActive ? 'Navbar__megaCard--active' : ''}`
                      }
                      onClick={() => setMoreOpen(false)}
                    >
                      <span className="Navbar__megaCardIcon">{l.icon}</span>
                      <span className="Navbar__megaCardLabel">{l.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer (Portal) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  className="NavOverlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeMobile}
                  aria-label="Close menu"
                />
                <motion.div
                  aria-label="Mobile navigation"
                  role="dialog"
                  aria-modal="true"
                  id="mobile-nav-drawer"
                  className="NavDrawer"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'tween', duration: 0.28 }}
                  onClick={(e) => e.stopPropagation()}
                  {...bindDrawerCloseGesture()}
                >
                  <div className="NavDrawer__topBar">
                    <div className="NavDrawer__brandMini">
                      <img src={mspLogo} alt="" height={30} width={38} />
                      <span className="NavDrawer__brandName">MSP MIU</span>
                    </div>
                    <button
                      className="NavDrawer__close"
                      onClick={closeMobile}
                      aria-label="Close menu"
                    >
                      <FaTimes />
                    </button>
                  </div>

                  {/* Drawer User Card or Join Card */}
                  {isAuthenticated ? (
                    <div className="NavDrawer__userCard">
                      <div className="NavDrawer__userCardTop">
                        <div className="NavDrawer__userAvatar">
                          {user?.profile_picture_url ? (
                            <img src={user.profile_picture_url} alt="" />
                          ) : (
                            <FaUser />
                          )}
                        </div>
                        <div className="NavDrawer__userMeta">
                          <span className="NavDrawer__userName">{user?.full_name || 'Club Member'}</span>
                          <span className={`NavDrawer__roleBadge NavDrawer__roleBadge--${userRole || 'member'}`}>
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                      <div className="NavDrawer__userCardActions">
                        <NavLink
                          to="/profile"
                          onClick={closeMobile}
                          className="NavDrawer__userActionBtn"
                        >
                          <FaUser /> My Profile
                        </NavLink>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="NavDrawer__userActionBtn NavDrawer__userActionBtn--logout"
                        >
                          <FaSignOutAlt /> Log Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="NavDrawer__joinCard">
                      <div className="NavDrawer__joinContent">
                        <p className="NavDrawer__joinTitle">Join MSP Tech Club</p>
                        <p className="NavDrawer__joinSubtitle">
                          Learn, compete, and grow with Microsoft Student Partners
                        </p>
                      </div>
                      <div className="NavDrawer__joinActions">
                        <NavLink
                          to="/become-member"
                          onClick={closeMobile}
                          className="NavDrawer__ctaBtn"
                        >
                          <FaUserPlus /> Become a Member
                        </NavLink>
                        <NavLink
                          to="/login"
                          onClick={closeMobile}
                          className="NavDrawer__loginBtn"
                        >
                          <FaSignInAlt /> Login
                        </NavLink>
                      </div>
                    </div>
                  )}

                  {/* Drawer Navigation List */}
                  <ul className="NavDrawer__list">
                    <li className="NavDrawer__sectionLabel">Browse</li>
                    {navSections.primary.map((l) => (
                      <li key={l.to}>
                        <NavLink
                          to={l.to}
                          onClick={closeMobile}
                          className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                          end={l.to === '/'}
                        >
                          <span className="NavDrawer__icon">{l.icon}</span>
                          <span className="NavDrawer__label">{l.label}</span>
                        </NavLink>
                      </li>
                    ))}

                    {/* Explore & More Collapsible Accordion */}
                    {navSections.extended.length > 0 && (
                      <>
                        <li className="NavDrawer__sectionLabel NavDrawer__sectionLabel--spaced">Explore &amp; More</li>
                        <li className="NavDrawer__expandRow">
                          <button
                            type="button"
                            className={`NavDrawer__expandToggle ${mobileMoreOpen ? 'is-open' : ''}`}
                            aria-expanded={mobileMoreOpen}
                            onClick={() => setMobileMoreOpen((o) => !o)}
                          >
                            <span className="NavDrawer__expandToggleLabel">
                              {mobileMoreOpen ? 'Hide' : 'Show'} club links ({navSections.extended.length})
                            </span>
                            <FaChevronDown className="NavDrawer__expandChevron" aria-hidden="true" />
                          </button>
                        </li>
                        {mobileMoreOpen && (
                          <li className="NavDrawer__extendedBlock">
                            <ul className="NavDrawer__nestedList">
                              {navSections.extended.map((l) => (
                                <li key={l.to}>
                                  <NavLink
                                    to={l.to}
                                    onClick={closeMobile}
                                    className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                                    end
                                  >
                                    <span className="NavDrawer__icon">{l.icon}</span>
                                    <span className="NavDrawer__label">{l.label}</span>
                                  </NavLink>
                                </li>
                              ))}
                            </ul>
                          </li>
                        )}
                      </>
                    )}

                    {/* Authenticated Member Services */}
                    {isAuthenticated && (
                      <>
                        <li className="NavDrawer__sectionLabel NavDrawer__sectionLabel--spaced">Member Services</li>
                        <li>
                          <NavLink
                            to="/attendance-request"
                            onClick={closeMobile}
                            className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                          >
                            <span className="NavDrawer__icon"><FaClipboardCheck /></span>
                            <span className="NavDrawer__label">Attendance Request</span>
                          </NavLink>
                        </li>
                        {isAdminOrBoard && (
                          <>
                            <li>
                              <NavLink
                                to="/admin"
                                onClick={closeMobile}
                                className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                              >
                                <span className="NavDrawer__icon"><MdDashboard /></span>
                                <span className="NavDrawer__label">Admin Panel</span>
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/admin/competition-management"
                                onClick={closeMobile}
                                className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                              >
                                <span className="NavDrawer__icon"><FaTrophy /></span>
                                <span className="NavDrawer__label">Competition Manager</span>
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/attendance-review"
                                onClick={closeMobile}
                                className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                              >
                                <span className="NavDrawer__icon"><MdOutlineAdminPanelSettings /></span>
                                <span className="NavDrawer__label">Review Attendance</span>
                              </NavLink>
                            </li>
                          </>
                        )}
                      </>
                    )}
                  </ul>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Android Native Back Button Handler */}
      <AndroidBackButtonHandler
        onCloseModal={() => {}}
        onCloseDrawer={closeMobile}
        isModalOpen={false}
        isDrawerOpen={mobileOpen}
      />
    </header>
  );
});

Navbar.displayName = 'Navbar';

export { Navbar };
export default Navbar;

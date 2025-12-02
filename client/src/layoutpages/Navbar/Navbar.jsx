import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHome, FaSignInAlt, FaCalendarAlt, FaUsers, FaUser, FaTimes, FaUserCog, FaUserPlus, FaAndroid } from 'react-icons/fa';
import { MdGroups } from 'react-icons/md';
import './Navbar.css';
import LoginCard from '../../components/LoginCard';
import ApiService from '../../services/api';
import AndroidBackButtonHandler from '../../components/AndroidBackButtonHandler';
import { isCapacitor } from '../../utils/androidBackButton';
import mspLogo from '../../assets/Images/msp-logo.png';

const Navbar = memo(() => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLoginCard, setShowLoginCard] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  // Check authentication status and handle token expiration
  useEffect(() => {
    const checkAuth = async () => {
      // Check if token exists and is valid (not expired)
      const isAuth = ApiService.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      // If authenticated, fetch user profile to get role
      if (isAuth) {
        try {
          const userData = await ApiService.getProfile();
          setUser(userData);
        } catch (error) {
          // If profile fetch fails, user might not be authenticated
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    
    checkAuth();
    
    // Check on focus (when user returns to tab)
    const handleFocus = () => {
      checkAuth().catch(() => {
        // Silently handle errors
      });
    };
    
    // Check on storage change (token removed in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'authToken') {
        checkAuth().catch(() => {
          // Silently handle errors
        });
      }
    };
    
    // Periodic check for token expiration (every 30 seconds)
    const intervalId = setInterval(() => {
      checkAuth().catch(() => {
        // Silently handle errors in interval
      });
    }, 30000);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [location.pathname]);

  useEffect(() => { 
    document.body.style.overflow = mobileOpen ? 'hidden' : ''; 
  }, [mobileOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);
  
  const handleLoginClick = useCallback((e) => {
    e.preventDefault();
    setShowLoginCard(true);
    closeMobile();
  }, [closeMobile]);
  
  const closeLoginCard = useCallback(async () => {
    setShowLoginCard(false);
    // Check auth status after closing login card (user might have logged in)
    setTimeout(async () => {
      const isAuth = ApiService.isAuthenticated();
      setIsAuthenticated(isAuth);
      if (isAuth) {
        try {
          const userData = await ApiService.getProfile();
          setUser(userData);
        } catch (error) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }, 100);
  }, []);
  
  // Get navigation links based on authentication status
  const getLinks = useCallback(() => {
    const baseLinks = [
      { to: '/', label: 'Home', icon: <FaHome /> },
      { to: '/about', label: 'About Us', icon: <MdGroups /> },
      { to: '/Meet-the-board', label: 'Meet the Board', icon: <FaUsers /> },
      // { to: '/exercises', label: 'Exercises', icon: <FaLaptop /> },
      { to: '/events', label: 'Events', icon: <FaCalendarAlt /> },
      // Only include download link if not in Capacitor environment (not in native app)
      ...(!isCapacitor() ? [{ to: '/download-android', label: 'Download App', icon: <FaAndroid /> }] : []),
      // { to: '/suggestions', label: 'Suggestions', icon: <FaLightbulb /> },
      // { to: '/leaderboard', label: 'Leaderboard', icon: <FaTrophy /> },
      // { to: '/sponsors', label: 'Sponsors', icon: <FaHandshake /> }
    ];
    
    // Add Login or Profile based on authentication status
    if (isAuthenticated) {
      baseLinks.push({ to: '/profile', label: 'Profile', icon: <FaUser /> });
    } else {
      baseLinks.push({ to: '/login', label: 'Login', icon: <FaSignInAlt /> });
    }

    // Add "Become a Member" for non-authenticated users
    if (!isAuthenticated) {
      baseLinks.push({ to: '/become-member', label: 'Become a Member', icon: <FaUserPlus /> });
    }

    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'board' || user.department_id === 5)) {
      baseLinks.push({ to: '/registration-admin', label: 'Registration Admin', icon: <FaUserCog /> });
    }
    
    return baseLinks;
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mobileOpen) {
        closeMobile();
      }
    };
    if (mobileOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [mobileOpen, closeMobile]);

  return (
    <header className={`Navbar ${scrolled ? 'Navbar--scrolled' : ''}`}>      
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
        <ul className={`Navbar__links ${(user && (user.role === 'admin' || user.role === 'board' || user.department_id === 5)) || !isAuthenticated ? 'Navbar__links--admin' : ''}`}>
          {getLinks().map(l => (
            <li key={l.to}>
              {!isAuthenticated && l.to === '/login' ? (
                <button
                  onClick={handleLoginClick}
                  className="NavItem login-nav-button"
                >
                  <span className="NavItem__icon">{l.icon}</span>
                  <span className="NavItem__label">{l.label}</span>
                </button>
              ) : (
                <NavLink
                  to={l.to}
                  className={({ isActive }) => `NavItem ${isActive ? 'is-active' : ''}`}
                >
                  <span className="NavItem__icon">{l.icon}</span>
                  <span className="NavItem__label">{l.label}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
        <button 
          className={`NavHamburger ${mobileOpen ? 'is-open' : ''}`} 
          aria-label="Menu" 
          aria-expanded={mobileOpen} 
          onClick={() => setMobileOpen(o => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {createPortal(
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
                role="navigation"
                className="NavDrawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                onClick={(e) => {
                  // Prevent clicks inside drawer from closing it
                  e.stopPropagation();
                }}
              >
                <button
                  className="NavDrawer__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMobile();
                  }}
                  aria-label="Close menu"
                >
                  <FaTimes />
                </button>
                <ul className="NavDrawer__list">
                  {getLinks().map(l => (
                    <li key={l.to}>
                      {!isAuthenticated && l.to === '/login' ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLoginClick(e);
                          }}
                          className="NavDrawer__link"
                        >
                          <span className="NavDrawer__icon">{l.icon}</span>
                          <span className="NavDrawer__label">{l.label}</span>
                        </button>
                      ) : (
                        <NavLink
                          to={l.to}
                          onClick={(e) => {
                            e.stopPropagation();
                            closeMobile();
                          }}
                          className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                          end
                        >
                          <span className="NavDrawer__icon">{l.icon}</span>
                          <span className="NavDrawer__label">{l.label}</span>
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      {/* Login Card Overlay */}
      <LoginCard isOpen={showLoginCard} onClose={closeLoginCard} />
      
      {/* Android Back Button Handler */}
      <AndroidBackButtonHandler
        onCloseModal={closeLoginCard}
        onCloseDrawer={closeMobile}
        isModalOpen={showLoginCard}
        isDrawerOpen={mobileOpen}
      />
    </header>
  );
});

Navbar.displayName = 'Navbar';

export { Navbar };
export default Navbar;

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from 'react-use-gesture';
import { FaHome, FaSignInAlt, FaCalendarAlt, FaUsers, FaUser, FaTimes, FaUserPlus, FaAndroid, FaChevronDown, FaHandshake } from 'react-icons/fa';
import { MdGroups, MdEmojiEvents, MdFeedback } from 'react-icons/md';
import './Navbar.css';
import LoginCard from '../../components/LoginCard';
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
  const [showLoginCard, setShowLoginCard] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAndroidDevice, setIsAndroidDevice] = useState(false);
  const [statusBarHeight, setStatusBarHeight] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const moreWrapRef = useRef(null);
  const moreMegaRef = useRef(null);
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

  // Check if running on Android device and detect status bar height
  useEffect(() => {
    const android = isAndroid();
    setIsAndroidDevice(android);
    
    if (android) {
      const getStatusBarHeight = () => {
        // Method 1: Check visual viewport vs window height difference
        // This detects if status bar is taking up space
        if (window.visualViewport) {
          const diff = window.innerHeight - window.visualViewport.height;
          // Status bar is typically 24-48px, so use this if it's in a reasonable range
          if (diff > 0 && diff < 100) {
            return diff;
          }
        }
        
        // Method 2: Check if we can detect safe-area-inset via CSS custom property
        // Try to read it from a test element
        try {
          const testEl = document.createElement('div');
          testEl.style.cssText = 'position:fixed;top:0;left:-9999px;padding-top:env(safe-area-inset-top,0px);';
          document.body.appendChild(testEl);
          const computed = window.getComputedStyle(testEl);
          const paddingTop = computed.paddingTop;
          const value = parseFloat(paddingTop);
          document.body.removeChild(testEl);
          
          if (value > 0) {
            return value;
          }
        } catch (e) {
          // Ignore errors
        }
        
        // No status bar detected
        return 0;
      };
      
      // Set initial status bar height after a small delay to ensure viewport is ready
      const checkHeight = () => {
        const height = getStatusBarHeight();
        setStatusBarHeight(height);
      };
      
      // Check immediately and after a short delay
      checkHeight();
      const timeoutId = setTimeout(checkHeight, 100);
      
      // Re-check on resize/orientation change
      const handleResize = () => {
        checkHeight();
      };
      
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
  
  const navSections = useMemo(() => {
    const primary = [
      { to: '/', label: 'Home', icon: <FaHome /> },
      { to: '/events', label: 'Events', icon: <FaCalendarAlt /> },
      { to: '/competitions', label: 'Competitions', icon: <MdEmojiEvents /> },
    ];
    const extended = [
      { to: '/about', label: 'About Us', icon: <MdGroups /> },
      { to: '/Meet-the-board', label: 'Meet the Board', icon: <FaUsers /> },
      { to: '/sponsors', label: 'Sponsors', icon: <FaHandshake /> },
      { to: '/suggestions', label: 'Suggestions', icon: <MdFeedback /> },
    ];
    if (!isCapacitor()) {
      extended.push({ to: '/download-android', label: 'Download App', icon: <FaAndroid /> });
    }
    if (!isAuthenticated) {
      extended.push({ to: '/become-member', label: 'Become a Member', icon: <FaUserPlus /> });
    }
    const account = [];
    if (isAuthenticated) {
      account.push({ to: '/profile', label: 'Profile', icon: <FaUser />, isProfile: true });
    } else {
      account.push({ to: '/login', label: 'Login', icon: <FaSignInAlt /> });
    }
    return { primary, extended, account };
  }, [isAuthenticated]);

  const extendedHasActive = useMemo(
    () => navSections.extended.some((l) => pathMatchesNavTarget(location.pathname, l.to)),
    [navSections.extended, location.pathname]
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (extendedHasActive) {
      setMobileMoreOpen(true);
    }
  }, [extendedHasActive]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e) => {
      const inTrigger = moreWrapRef.current?.contains(e.target);
      const inMega = moreMegaRef.current?.contains(e.target);
      if (!inTrigger && !inMega) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [moreOpen]);

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth <= 1180 && moreOpen) {
        setMoreOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [moreOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      if (mobileOpen) closeMobile();
      else if (moreOpen) setMoreOpen(false);
    };
    if (mobileOpen || moreOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [mobileOpen, moreOpen, closeMobile]);

  const renderDesktopItem = (l) => (
    <li key={l.to}>
      {!isAuthenticated && l.to === '/login' ? (
        <button type="button" onClick={handleLoginClick} className="NavItem login-nav-button">
          <span className="NavItem__icon">{l.icon}</span>
          <span className="NavItem__label">{l.label}</span>
        </button>
      ) : (
        <NavLink
          to={l.to}
          className={({ isActive }) =>
            `NavItem ${isActive ? 'is-active' : ''} ${l.isProfile ? 'NavItem--profile-only' : ''}`
          }
        >
          <span className={`NavItem__icon ${l.isProfile ? 'NavItem__icon--profile' : ''}`}>
            {l.isProfile ? (
              <>
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt="Profile"
                    className="NavItem__profile-picture"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.NavItem__profile-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="NavItem__profile-fallback"
                  style={{ display: user?.profile_picture_url ? 'none' : 'flex' }}
                >
                  <FaUser />
                </span>
              </>
            ) : (
              l.icon
            )}
          </span>
          {!l.isProfile && <span className="NavItem__label">{l.label}</span>}
        </NavLink>
      )}
    </li>
  );

  const renderDrawerItem = (l) => (
    <li key={l.to}>
      {!isAuthenticated && l.to === '/login' ? (
        <button
          type="button"
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
          className={({ isActive }) =>
            `NavDrawer__link ${isActive ? 'is-active' : ''} ${l.isProfile ? 'NavDrawer__link--profile-only' : ''}`
          }
          end
        >
          <span className={`NavDrawer__icon ${l.isProfile ? 'NavDrawer__icon--profile' : ''}`}>
            {l.isProfile ? (
              <>
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt="Profile"
                    className="NavDrawer__profile-picture"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.NavDrawer__profile-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="NavDrawer__profile-fallback"
                  style={{ display: user?.profile_picture_url ? 'none' : 'flex' }}
                >
                  <FaUser />
                </span>
              </>
            ) : (
              l.icon
            )}
          </span>
          {!l.isProfile && <span className="NavDrawer__label">{l.label}</span>}
        </NavLink>
      )}
    </li>
  );

  // Swipe left gesture to open drawer (Android only) using react-use-gesture
  const edgeThreshold = 30; // Px from the left edge to initiate a swipe
  
  const bindSwipeGesture = useDrag(
    ({ swipe: [swipeX], first, initial: [ix, iy] }) => {
      // Only enable swipe gesture on Android
      if (!isAndroid()) {
        return;
      }

      // Only handle if drawer is closed
      if (mobileOpen) {
        return;
      }

      // Check if swipe started from the left edge
      if (first && ix > edgeThreshold) {
        return; // Don't start tracking if not from edge
      }

      // Handle swipe left gesture
      if (swipeX === -1) {
        // Swipe left detected - open drawer
        setMobileOpen(true);
      }
    },
    {
      // Only detect horizontal swipes
      axis: 'x',
      // Only trigger on swipe left (negative direction)
      swipeDistance: [50, 50],
      swipeVelocity: [0.5, 0.5],
      // Filter to only allow swipes from left edge
      filterTaps: true,
      // Prevent conflicts with vertical gestures (pull-to-refresh)
      threshold: 10,
      // Only enable on Android
      enabled: isAndroid() && !mobileOpen,
    }
  );

  return (
    <header 
      className={`Navbar ${scrolled ? 'Navbar--scrolled' : ''} ${moreOpen ? 'Navbar--megaOpen' : ''} ${isAndroidDevice && statusBarHeight > 0 ? 'Navbar--android' : ''}`}
      style={isAndroidDevice && statusBarHeight > 0 ? { paddingTop: `${statusBarHeight}px` } : {}}
      {...bindSwipeGesture()}
    >      
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
        <ul className="Navbar__links">
          {navSections.primary.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) => `NavItem ${isActive ? 'is-active' : ''}`}
              >
                <span className="NavItem__icon">{l.icon}</span>
                <span className="NavItem__label">{l.label}</span>
              </NavLink>
            </li>
          ))}
          {navSections.extended.length > 0 && (
            <li className="Navbar__moreWrap" ref={moreWrapRef}>
              <button
                type="button"
                className={`NavItem NavItem--more ${moreOpen ? 'is-open' : ''} ${extendedHasActive ? 'has-active-child' : ''}`}
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
          {navSections.account.map((l) => renderDesktopItem(l))}
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
              transition: { duration: 0.36, ease: [0.4, 0, 0.2, 1] },
            }}
            transition={{
              duration: 0.56,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
            }}
          >
            <motion.div
              className="Navbar__megaInner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="Navbar__megaHeader">
                <p className="Navbar__megaTitle" id="navbar-more-heading">
                  Explore more
                </p>
                <p className="Navbar__megaSubtitle">
                  Learn about the club, get the app, and access member tools
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
                  <li className="NavDrawer__sectionLabel">Browse</li>
                  {navSections.primary.map((l) => (
                    <li key={l.to}>
                      <NavLink
                        to={l.to}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeMobile();
                        }}
                        className={({ isActive }) => `NavDrawer__link ${isActive ? 'is-active' : ''}`}
                        end={l.to === '/'}
                      >
                        <span className="NavDrawer__icon">{l.icon}</span>
                        <span className="NavDrawer__label">{l.label}</span>
                      </NavLink>
                    </li>
                  ))}
                  {navSections.extended.length > 0 && (
                    <>
                      <li className="NavDrawer__sectionLabel NavDrawer__sectionLabel--spaced">About &amp; more</li>
                      <li className="NavDrawer__expandRow">
                        <button
                          type="button"
                          className={`NavDrawer__expandToggle ${mobileMoreOpen ? 'is-open' : ''}`}
                          aria-expanded={mobileMoreOpen}
                          onClick={() => setMobileMoreOpen((o) => !o)}
                        >
                          <span className="NavDrawer__expandToggleLabel">
                            {mobileMoreOpen ? 'Hide' : 'Show'} sections
                          </span>
                          <FaChevronDown className="NavDrawer__expandChevron" aria-hidden />
                        </button>
                      </li>
                      {mobileMoreOpen && (
                        <li className="NavDrawer__extendedBlock">
                          <ul className="NavDrawer__nestedList">
                            {navSections.extended.map((l) => (
                              <li key={l.to}>
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
                              </li>
                            ))}
                          </ul>
                        </li>
                      )}
                    </>
                  )}
                  <li className="NavDrawer__sectionLabel NavDrawer__sectionLabel--spaced">Account</li>
                  {navSections.account.map((l) => renderDrawerItem(l))}
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

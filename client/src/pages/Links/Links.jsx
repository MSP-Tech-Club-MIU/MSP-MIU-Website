import React, { memo, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaYoutube,
  FaInstagram,
  FaTiktok,
  FaLinkedinIn,
  FaGlobe,
  FaCalendarAlt,
  FaGraduationCap,
  FaTrophy,
  FaUsers,
  FaUserPlus,
  FaAndroid,
  FaComments,
  FaShareAlt,
  FaCopy,
  FaCheck,
  FaQrcode,
  FaSearch,
  FaTimes,
  FaArrowRight,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaHandshake,
  FaQuestionCircle,
  FaCode,
  FaFire
} from 'react-icons/fa';
import { MdVerified, MdPlayArrow, MdStars } from 'react-icons/md';
import SEO from '../../components/SEO';
import BackButton from '../../components/BackButton';
import mspLogo from '../../assets/Images/msp-logo.png';
import miuLogo from '../../assets/Images/miu-logo.png';
import './Links.css';

const PRIMARY_SOCIALS = [
  {
    id: 'youtube',
    name: 'YouTube Channel',
    handle: '@MSP-MIU',
    url: 'https://www.youtube.com/@MSP-MIU',
    icon: <FaYoutube />,
    color: '#FF0000',
    tag: 'Featured & Video Sessions',
    tagType: 'youtube',
    cta: 'Subscribe @MSP-MIU',
    description: 'Watch recorded tech workshops, guest speaker talks, bootcamp lectures, and coding tutorials.'
  },
  {
    id: 'instagram',
    name: 'Instagram Page',
    handle: '@mspmiu',
    url: 'https://www.instagram.com/mspmiu',
    icon: <FaInstagram />,
    color: '#E1306C',
    tag: 'Daily Stories & Photos',
    tagType: 'instagram',
    cta: 'Follow @mspmiu',
    description: 'Event photos, live session announcements, team takeovers, and club announcements.'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@mspmiu',
    url: 'https://www.tiktok.com/@mspmiu',
    icon: <FaTiktok />,
    color: '#00F2FE',
    tag: 'Reels & Student Life',
    tagType: 'tiktok',
    cta: 'Follow on TikTok',
    description: 'Short video recaps, fun tech reels, behind-the-scenes, and student highlights.'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Company',
    handle: 'MSP Tech Club — MIU',
    url: 'https://www.linkedin.com/company/mspmiu',
    icon: <FaLinkedinIn />,
    color: '#0A66C2',
    tag: 'Career & Network',
    tagType: 'linkedin',
    cta: 'Connect on LinkedIn',
    description: 'Official corporate updates, partnership announcements, and member achievements.'
  }
];

const SECONDARY_LINKS = [
  {
    id: 'website',
    title: 'Official Website & Portal',
    description: 'Explore the full platform, member dashboard, and announcements.',
    url: '/',
    isExternal: false,
    icon: <FaGlobe />,
    color: '#03A9F4',
    badge: 'Web Portal',
    category: 'platform'
  },
  {
    id: 'events',
    title: 'Upcoming Events & Sessions',
    description: 'Browse scheduled tech talks, workshops, and hackathons at MIU.',
    url: '/events',
    isExternal: false,
    icon: <FaCalendarAlt />,
    color: '#03A9F4',
    badge: 'Live Events',
    category: 'learning'
  },
  {
    id: 'courses',
    title: 'Free Tech Courses & Tracks',
    description: 'Structured programming, AI, web dev, and cybersecurity courses.',
    url: '/courses',
    isExternal: false,
    icon: <FaGraduationCap />,
    color: '#83BD00',
    badge: 'Free Learning',
    category: 'learning'
  },
  {
    id: 'competitions',
    title: 'Competitions & Hackathons',
    description: 'Participate in challenges, submit projects, and win awards.',
    url: '/competitions',
    isExternal: false,
    icon: <FaTrophy />,
    color: '#FFC107',
    badge: 'Compete',
    category: 'learning'
  },
  {
    id: 'board',
    title: 'Meet the Board',
    description: 'Connect with the student leadership team behind MSP Tech Club.',
    url: '/Meet-the-board',
    isExternal: false,
    icon: <FaUsers />,
    color: '#5AA0E6',
    badge: 'Leadership',
    category: 'community'
  },
  {
    id: 'android-app',
    title: 'Download Android App',
    description: 'Get real-time push notifications & course tracks on your Android device.',
    url: '/download-android',
    isExternal: false,
    icon: <FaAndroid />,
    color: '#3DDC84',
    badge: 'Mobile App',
    category: 'platform'
  },
  {
    id: 'exercises',
    title: 'Practice Exercises & Problems',
    description: 'Solve interactive programming questions and practice tracks.',
    url: '/exercises',
    isExternal: false,
    icon: <FaCode />,
    color: '#00D2D3',
    badge: 'Practice',
    category: 'learning'
  },
  {
    id: 'suggestions',
    title: 'Suggestions & Feedback',
    description: 'Share feedback, suggest workshop topics, or reach out to organizers.',
    url: '/suggestions',
    isExternal: false,
    icon: <FaComments />,
    color: '#8EC2F0',
    badge: 'Feedback',
    category: 'community'
  },
  {
    id: 'sponsors',
    title: 'Sponsors & Partners',
    description: 'Organizations and sponsors supporting student tech initiatives at MIU.',
    url: '/sponsors',
    isExternal: false,
    icon: <FaHandshake />,
    color: '#A29BFE',
    badge: 'Partners',
    category: 'community'
  },
  {
    id: 'faqs',
    title: 'Frequently Asked Questions',
    description: 'Common questions about club activities, membership, and certificates.',
    url: '/faqs',
    isExternal: false,
    icon: <FaQuestionCircle />,
    color: '#6C5CE7',
    badge: 'FAQs',
    category: 'community'
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'How member data is collected, stored, and protected.',
    url: '/privacy',
    isExternal: false,
    icon: <FaShieldAlt />,
    color: '#74B9FF',
    badge: 'Policy',
    category: 'community'
  }
];

function LinksQrCode() {
  const matrix = [
    [1,1,1,1,1,1,1,0,0,1,0,1,1,0,1,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,0,1,0,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,1,0,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,1,0,0,1,1,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0],
    [1,1,0,1,0,1,1,1,0,0,1,0,1,1,0,1,1,1,0,1,0,1,1,0],
    [0,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,0,1],
    [1,0,1,1,0,1,1,0,0,1,0,1,1,0,1,0,0,1,1,0,1,0,1,0],
    [0,1,0,0,1,0,0,1,1,0,1,1,0,1,0,1,1,0,0,1,0,1,1,1],
    [1,1,1,0,1,1,1,0,1,1,0,0,1,1,0,0,1,1,1,0,1,0,0,1],
    [0,0,1,1,0,0,1,1,0,1,1,0,1,0,1,1,0,0,1,1,0,1,1,0],
    [1,0,0,1,1,0,0,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,1,0,1,0,0,1,0,1,1,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,0,1,1,0,1,1,0,1,0,1,1,0],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,1,0,0,1,1,0,1,0,1,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,0,1,0,1,1,0,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,0,0,1,1,0,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,0,1,0,1,0,1,0,0,1,0,0,1,1],
    [1,1,1,1,1,1,1,0,1,1,1,0,0,1,0,1,1,1,1,0,1,1,0,1]
  ];

  const size = matrix.length;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="LinksQrCode__svg" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell === 1 ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#031C35" /> : null
        )
      )}
    </svg>
  );
}

const Links = memo(() => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://msp-miu.tech/links';

  const handleCopyLink = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pageUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = pageUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [pageUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MSP Tech Club — MIU Links & Socials',
          text: 'Official social channels, YouTube sessions, and membership application for MSP Tech Club at Misr International University.',
          url: pageUrl
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    }
    handleCopyLink();
  }, [pageUrl, handleCopyLink]);

  const filteredSecondary = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return SECONDARY_LINKS;
    return SECONDARY_LINKS.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: 'MSP Tech Club — MIU Official Links & Social Media',
    description: 'Official Linktree portal for MSP Tech Club at Misr International University with YouTube, Instagram, and Member Registration.',
    url: 'https://msp-miu.tech/links',
    mainEntity: {
      '@type': 'EducationalOrganization',
      name: 'MSP Tech Club — MIU',
      url: 'https://msp-miu.tech',
      sameAs: [
        'https://www.youtube.com/@MSP-MIU',
        'https://www.instagram.com/mspmiu',
        'https://www.tiktok.com/@mspmiu',
        'https://www.linkedin.com/company/mspmiu'
      ]
    }
  };

  return (
    <div className="LinksPage">
      <SEO
        title="Links & Socials | MSP Tech Club — MIU"
        description="Official social media channels, YouTube videos, and member registration for MSP Tech Club at Misr International University."
        keywords="MSP links, MSP linktree, MSP MIU YouTube, MSP MIU Instagram, MSP registration, become a member MIU"
        url="https://msp-miu.tech/links"
        structuredData={structuredData}
      />

      <div className="LinksPage__glow LinksPage__glow--top" aria-hidden="true" />
      <div className="LinksPage__glow LinksPage__glow--bottom" aria-hidden="true" />

      <div className="LinksPage__container">
        <BackButton to="/" label="Back to Home" />

        {/* Profile Header */}
        <header className="LinksProfile">
          <div className="LinksProfile__avatarWrap">
            <div className="LinksProfile__avatarRing" />
            <img
              src={mspLogo}
              alt="MSP Tech Club Logo"
              className="LinksProfile__avatar"
              width={104}
              height={104}
            />
            <span className="LinksProfile__verifiedBadge" title="Official Verified Community">
              <MdVerified aria-hidden="true" />
            </span>
          </div>

          <div className="LinksProfile__logos">
            <span className="LinksProfile__orgBadge">
              <img src={miuLogo} alt="MIU" className="LinksProfile__miuLogo" width={22} height={22} />
              Misr International University
            </span>
          </div>

          <h1 className="LinksProfile__name">MSP Tech Club — MIU</h1>
          <p className="LinksProfile__bio">
            Student-led innovation community powered by <strong>Microsoft Learn Student Ambassadors</strong>.
            Follow our channels and apply to join our teams below.
          </p>

          {/* Quick Action Toolbar */}
          <div className="LinksActions">
            <button
              type="button"
              className={`LinksActions__btn ${copied ? 'LinksActions__btn--copied' : ''}`}
              onClick={handleCopyLink}
              aria-label="Copy link to clipboard"
            >
              {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              className="LinksActions__btn"
              onClick={handleShare}
              aria-label="Share page"
            >
              <FaShareAlt aria-hidden="true" />
              <span>Share</span>
            </button>

            <button
              type="button"
              className="LinksActions__btn"
              onClick={() => setQrOpen(true)}
              aria-label="View QR Code"
            >
              <FaQrcode aria-hidden="true" />
              <span>QR Code</span>
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* SECTION 1: TOP PRIORITY — BECOME A MEMBER (REGISTRATION) */}
        {/* ======================================================== */}
        <section className="LinksSection" aria-labelledby="section-join-heading">
          <div className="LinksSection__header">
            <span className="LinksSection__badge LinksSection__badge--fire">
              <FaFire /> Member Applications
            </span>
            <h2 id="section-join-heading" className="LinksSection__title">
              Join MSP Tech Club
            </h2>
          </div>

          <Link to="/become-member" className="LinksHeroJoinCard">
            <div className="LinksHeroJoinCard__ambient" aria-hidden="true" />
            <div className="LinksHeroJoinCard__content">
              <div className="LinksHeroJoinCard__iconBox">
                <FaUserPlus />
              </div>
              <div className="LinksHeroJoinCard__text">
                <div className="LinksHeroJoinCard__badgeRow">
                  <span className="LinksHeroJoinCard__pill">Official Registration</span>
                  <span className="LinksHeroJoinCard__pill LinksHeroJoinCard__pill--highlight">Open to All MIU Students</span>
                </div>
                <h3 className="LinksHeroJoinCard__title">Become a Member — Apply Now</h3>
                <p className="LinksHeroJoinCard__desc">
                  Join our Software Dev, AI, Cyber Security, Technical Training, Media, PR & Event Planning teams.
                </p>
              </div>
            </div>
            <div className="LinksHeroJoinCard__ctaRow">
              <span className="LinksHeroJoinCard__ctaBtn">
                <span>Start Application</span>
                <FaArrowRight className="LinksHeroJoinCard__arrowIcon" />
              </span>
            </div>
          </Link>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: TOP PRIORITY — OFFICIAL SOCIAL MEDIA CHANNELS */}
        {/* ======================================================== */}
        <section className="LinksSection" aria-labelledby="section-socials-heading">
          <div className="LinksSection__header">
            <span className="LinksSection__badge LinksSection__badge--socials">
              <MdStars /> Official Channels
            </span>
            <h2 id="section-socials-heading" className="LinksSection__title">
              Connect on Social Media
            </h2>
            <p className="LinksSection__subtitle">
              Follow our official pages for event coverage, announcements, and video tutorials.
            </p>
          </div>

          <div className="LinksSocialCards">
            {PRIMARY_SOCIALS.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
              >
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`SocialCard SocialCard--${s.id}`}
                >
                  <div className="SocialCard__left">
                    <div className="SocialCard__iconBox" style={{ color: s.color }}>
                      {s.icon}
                    </div>
                  </div>

                  <div className="SocialCard__main">
                    <div className="SocialCard__headerRow">
                      <h3 className="SocialCard__name">{s.name}</h3>
                      <span className={`SocialCard__tag SocialCard__tag--${s.tagType}`}>
                        {s.tag}
                      </span>
                    </div>
                    <span className="SocialCard__handle">{s.handle}</span>
                    <p className="SocialCard__desc">{s.description}</p>
                  </div>

                  <div className="SocialCard__action">
                    <span className="SocialCard__actionBtn">
                      {s.id === 'youtube' && <MdPlayArrow className="SocialCard__playIcon" />}
                      <span>{s.cta}</span>
                      <FaExternalLinkAlt className="SocialCard__extIcon" />
                    </span>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 3: EXPLORE PLATFORM & RESOURCES                  */}
        {/* ======================================================== */}
        <section className="LinksSection" aria-labelledby="section-more-heading">
          <div className="LinksSection__header">
            <h2 id="section-more-heading" className="LinksSection__title">
              Explore More Resources
            </h2>
          </div>

          <div className="LinksFilter__search" style={{ marginBottom: 14 }}>
            <FaSearch className="LinksFilter__searchIcon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search courses, events, competitions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="LinksFilter__input"
              aria-label="Search resources"
            />
            {searchQuery && (
              <button
                type="button"
                className="LinksFilter__clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="LinksList" aria-label="More resources">
            {filteredSecondary.length === 0 ? (
              <div className="LinksList__empty">
                <p>No resources found matching &ldquo;{searchQuery}&rdquo;</p>
                <button
                  type="button"
                  className="LinksList__resetBtn"
                  onClick={() => setSearchQuery('')}
                >
                  View all resources
                </button>
              </div>
            ) : (
              filteredSecondary.map((item, idx) => {
                const CardInner = (
                  <>
                    <div
                      className="LinkCard__iconBox"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      {item.icon}
                    </div>
                    <div className="LinkCard__info">
                      <div className="LinkCard__titleRow">
                        <span className="LinkCard__title">{item.title}</span>
                        {item.badge && (
                          <span className="LinkCard__badge LinkCard__badge--neutral">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="LinkCard__desc">{item.description}</p>
                    </div>
                    <div className="LinkCard__arrow" aria-hidden="true">
                      {item.isExternal ? <FaExternalLinkAlt /> : <FaArrowRight />}
                    </div>
                  </>
                );

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                  >
                    {item.isExternal ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="LinkCard"
                      >
                        {CardInner}
                      </a>
                    ) : (
                      <Link to={item.url} className="LinkCard">
                        {CardInner}
                      </Link>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="LinksFooter">
          <p className="LinksFooter__brand">
            MSP Tech Club &middot; Misr International University
          </p>
          <div className="LinksFooter__links">
            <Link to="/">Home</Link>
            <span>&bull;</span>
            <Link to="/about">About Us</Link>
            <span>&bull;</span>
            <Link to="/become-member">Registration</Link>
            <span>&bull;</span>
            <Link to="/events">Events</Link>
            <span>&bull;</span>
            <Link to="/faqs">FAQs</Link>
          </div>
        </footer>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {qrOpen && (
          <div className="LinksModalOverlay" onClick={() => setQrOpen(false)}>
            <motion.div
              className="LinksQrModal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-modal-title"
            >
              <button
                type="button"
                className="LinksQrModal__close"
                onClick={() => setQrOpen(false)}
                aria-label="Close QR Modal"
              >
                <FaTimes />
              </button>

              <div className="LinksQrModal__header">
                <img src={mspLogo} alt="MSP Logo" className="LinksQrModal__logo" width={48} height={48} />
                <h3 id="qr-modal-title" className="LinksQrModal__title">
                  Scan for MSP-MIU Links
                </h3>
                <p className="LinksQrModal__subtitle">
                  Point your mobile camera to open all official club socials and registration.
                </p>
              </div>

              <div className="LinksQrModal__card">
                <LinksQrCode />
                <span className="LinksQrModal__url">msp-miu.tech/links</span>
              </div>

              <div className="LinksQrModal__footer">
                <button
                  type="button"
                  className="btn primary LinksQrModal__btn"
                  onClick={handleCopyLink}
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                  <span>{copied ? 'Link Copied!' : 'Copy Page URL'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

Links.displayName = 'Links';

export default Links;

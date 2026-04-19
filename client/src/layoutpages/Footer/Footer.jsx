import React, { useMemo, memo } from 'react';
import './Footer.css';

import mspLogo from '../../assets/Images/msp-logo.png';
import AMLogo from '../../assets/Images/Geometric-AM-logo-design.webp';

const social = [
  { href: 'https://www.tiktok.com/@mspmiu', label: 'TikTok', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3.5c-.1 0-.2 0-.3.1-1.4.9-2.8 1.2-4.1 1.2v6.2c0 1.8-.7 3.4-2 4.6-1.1 1-2.6 1.6-4.2 1.6-3.3 0-6-2.7-6-6s2.7-6 6-6c.3 0 .6 0 .9.1v2.1c-.3-.1-.6-.1-.9-.1-2.2 0-4 1.8-4 4s1.8 4 4 4c1.1 0 2.1-.4 2.9-1.1 1-1 1.6-2.5 1.6-4.1V4.7c1.6 0 3.1-.4 4.6-1.3.1 0 .2-.1.2-.2.1-.1 0-.2-.1-.2z"/></svg>
  ) },
  { href: 'https://www.instagram.com/mspmiu', label: 'Instagram', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zM17.5 6.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z"/></svg>
  ) },
  {
    href: 'https://www.linkedin.com/company/mspmiu', label: 'LinkedIn', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.03-1.85-3.03-1.85 0-2.13 1.44-2.13 2.93v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.31zM5.34 7.43a2.06 2.06 0 11.01-4.12 2.06 2.06 0 01-.01 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>
    ) }   
];

export const Footer = memo(() => {
  const year = useMemo(() => new Date().getFullYear(), []);
  const developerTitle = year >= 2027 ? 'Original Lead Developer' : 'Lead Developer';
  return (
    <footer className="Footer">
      <div className="Footer__grid">
        <section className="Footer__brand" aria-labelledby="footer-brand-heading">
          <div className="Footer__brandContainer">
            <img
              src={mspLogo}
              alt="MSP Logo"
              className="Footer__logoImg"
              height={166}
              width={186}
            />
            <h2
              id="footer-brand-heading"
              className="Footer__logo"
            >MSP Tech Club</h2>
          </div>
          <p className="Footer__vision">Our Vision: <span>Empowering students through innovation, collaboration, and continuous learning.</span></p>
        </section>
        <section className="Footer__social" aria-labelledby="footer-social-heading">
          <h3 id="footer-social-heading" className="Footer__heading">Connect</h3>
          <ul className="Footer__socialList">
            {social.map(s => (
              <li key={s.label} className="Footer__socialItem">
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="Footer__socialLink"
                >
                  <span className="Footer__socialIcon">{s.icon}</span>
                  <span className="Footer__socialLabel">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section className="Footer__meta" aria-labelledby="footer-meta-heading">
          <h3 id="footer-meta-heading" className="Footer__heading">Info</h3>
          <p className="Footer__copy">&copy; {year} MSP Tech Club MIU. All rights reserved.</p>
          <a
            href="https://ahmedmostafa-swe.tech"
            target="_blank"
            rel="noreferrer"
            className="Footer__developer"
            aria-label="Developer website"
          >
            <img
              src={AMLogo}
              alt="Geometric AM logo"
              className="Footer__developerLogo"
              width={44}
              height={44}
            />
            <span className="Footer__developerText">
              {developerTitle}: Ahmed Mostafa
            </span>
          </a>
        </section>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;

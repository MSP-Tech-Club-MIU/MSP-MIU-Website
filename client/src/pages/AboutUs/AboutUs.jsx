import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';
import './AboutUs.css';
import { FiTarget, FiEye, FiHeart, FiUsers, FiCpu, FiArrowRight } from 'react-icons/fi';
import { FaMicrosoft, FaRocket, FaTrophy, FaCode, FaHandshake, FaUserPlus } from 'react-icons/fa';
import { MdLightbulbOutline, MdStar } from 'react-icons/md';

// Memoized animation variants
const heroParent = {
  hidden: { opacity: 0 },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 }
};

// Memoized data arrays
const missionValues = [
  {
    id: 'm1',
    title: 'Mission',
    icon: <FiTarget />,
    body: 'To inspire and equip students with the knowledge, tools, and opportunities to innovate and make an impact through technology.'
  },
  {
    id: 'm2',
    title: 'Vision',
    icon: <FiEye />,
    body: 'A thriving community of future tech leaders driving digital transformation through creativity, collaboration, and continuous learning.'
  },
  {
    id: 'm3',
    title: 'Values',
    icon: <FiHeart />,
    body: 'Innovation · Growth · Collaboration · Inclusion · Excellence'
  }
];

const AboutUs = memo(() => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About MSP Tech Club - MIU",
    "description": "MSP Tech Club is a student-led innovation community powered by the Microsoft Learn Student Ambassadors program. We explore cutting-edge technologies, build real projects, and develop technical & leadership excellence together.",
    "mainEntity": {
      "@type": "Organization",
      "name": "MSP Tech Club - MIU",
      "mission": "To inspire and equip students with the knowledge, tools, and opportunities to innovate and make an impact through technology.",
      "foundingLocation": {
        "@type": "Place",
        "name": "Misr International University"
      }
    }
  };

  return (
    <main className="About">
      <SEO
        title="About Us"
        description="Learn about MSP Tech Club at MIU - a student-led innovation community powered by Microsoft Learn Student Ambassadors. Discover our mission, vision, values, and how we help students grow through technology."
        keywords="MSP, Microsoft Student Partners, about MSP, MIU tech club, student organization, Microsoft Learn Student Ambassadors, technology community"
        url="https://msp-miu.tech/about"
        structuredData={structuredData}
      />
      <section className="AboutHero" aria-labelledby="about-hero-heading">
        <div className="AboutHero__bg" aria-hidden="true" />
        <motion.div className="AboutHero__inner">
          <h1 id="about-hero-heading" className="AboutHero__title AboutHero__title--animate" style={{ animationDelay: '0.1s' }}>About MSP Tech Club</h1>
          <p className="AboutHero__subtitle AboutHero__subtitle--animate" style={{ animationDelay: '0.3s' }}>MSP Tech Club is a student-led innovation community powered by the Microsoft Learn Student Ambassadors program. We explore cutting‑edge technologies, build real projects, and develop technical & leadership excellence together.</p>
        </motion.div>
      </section>


      <section className="AboutTriad" aria-label="Mission Vision Values">
        <div className="AboutTriad__grid">
          {missionValues.map((item, index) => (
            <motion.article 
              key={item.id} 
              className="TriadCard TriadCard--animate" 
              whileHover={{ scale: 1.05 }}
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <motion.div className="TriadCard__icon">
                {item.icon}
              </motion.div>
              <h3 className="TriadCard__title" >{item.title}</h3>
              <p className="TriadCard__body">{item.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="AboutMeaning" aria-labelledby="about-meaning-heading">
        <div className="AboutMeaning__accent" aria-hidden="true" />
        <header className="AboutMeaning__head">
          <h2 id="about-meaning-heading" className="AboutMeaning__title AboutMeaning__title--animate" style={{ animationDelay: '0.9s' }}>What MSP Stands For</h2>
        </header>
        <motion.div className="AboutMeaning__content">
          <p className="AboutMeaning__text">MSP stands for <span className="hi">Microsoft Student Partners </span>led by Microsoft Learn Student Ambassadors — a global program connecting passionate student technologists with resources, mentorship, and pathways to impact. At MIU, our MSP Tech Club activates this mission through hands‑on sessions, workshops, hackathons, peer mentoring, and community solution building.</p>
          <p className="AboutMeaning__text">We focus on practical exploration across cloud, AI, developer tooling, productivity, and emerging experiences. Members grow by <span className="hi">learning</span>, <span className="hi">building</span>, <span className="hi">sharing</span>, and <span className="hi">leading</span>.</p>
          <ul className="AboutMeaning__iconList" aria-label="Focus Areas">
            <motion.li 
              className="li--animate"
              whileHover={{ scale: 1.08 }}
              style={{ animationDelay: '1.2s' }}
            >
              <FaMicrosoft /> Program Alignment
            </motion.li>
            <motion.li 
              className="li--animate"
              whileHover={{ scale: 1.08 }}
              style={{ animationDelay: '1.3s' }}
            >
              <FiCpu /> Emerging Tech Labs
            </motion.li>
            <motion.li 
              className="li--animate"
              whileHover={{ scale: 1.08 }}
              style={{ animationDelay: '1.4s' }}
            >
              <FiUsers /> Community & Mentorship
            </motion.li>
            <motion.li 
              className="li--animate"
              whileHover={{ scale: 1.08 }}
              style={{ animationDelay: '1.5s' }}
            >
              <MdStar /> Excellence & Impact
            </motion.li>
          </ul>
        </motion.div>
      </section>
    </main>
  );
});

AboutUs.displayName = 'AboutUs';

export default AboutUs;
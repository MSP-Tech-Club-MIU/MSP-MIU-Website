import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import BackButton from '../../components/BackButton';
import useSiteContent from '../../hooks/useSiteContent';
import './AboutUs.css';

// React Icons
import {
  FiTarget,
  FiEye,
  FiHeart,
  FiUsers,
  FiCpu,
  FiArrowRight,
  FiCalendar,
  FiAward,
  FiCheckCircle,
  FiLayers,
  FiShield,
  FiExternalLink
} from 'react-icons/fi';
import {
  FaMicrosoft,
  FaRocket,
  FaTrophy,
  FaCode,
  FaBrain,
  FaShieldAlt,
  FaPaintBrush,
  FaBullhorn,
  FaUsersCog,
  FaCalendarAlt,
  FaUserPlus
} from 'react-icons/fa';
import { MdStar, MdSchool, MdLightbulbOutline } from 'react-icons/md';

// Default / fallback content enriched with verified database records
const FALLBACK_ABOUT = {
  about: {
    pageTitle: 'About MSP Tech Club',
    badge: 'Student-Led Innovation Community · Founded in 2025 at MIU',
    subtitle:
      'MSP Tech Club was founded in 2025 at Misr International University, officially powered by the Microsoft Learn Student Ambassadors program. We empower future engineers, innovators, and leaders to master emerging technologies, build real-world products, and compete in continuous hands-on challenges.',
    mission:
      'To inspire, educate, and equip students with hands-on engineering capabilities, modern toolsets, and mentorship needed to innovate and make a lasting impact through technology.',
    vision:
      'A thriving university community of future tech pioneers driving digital transformation through relentless curiosity, open collaboration, and continuous learning.',
    values: 'Innovation · Technical Mastery · Collaborative Spirit · Inclusivity · Leadership',
    meaningTitle: 'What MSP Stands For',
    meaningBody:
      'MSP stands for Microsoft Student Partners — now known as Microsoft Learn Student Ambassadors (MLSA). Founded at MIU in 2025, our club connects passionate student technologists with industry-grade tools, mentors, and pathways to impact through hands-on bootcamps, continuous hackathons, open project incubation, and community solution building.',
    focusChips: [
      'Microsoft Learn Alignment',
      'Agentic AI & Emerging Tech',
      'Cybersecurity & CTF',
      'Full-Stack Software Engineering',
      'Competitive Programming',
      'Student Leadership & Mentorship'
    ],
    stats: [
      { id: 'attendees', value: '240+', label: 'Verified Attendances', desc: 'Logged across technical sessions & campus workshops' },
      { id: 'members', value: '90+', label: 'Active Committee Members', desc: 'Across 8 engineering & operational departments' },
      { id: 'enrollments', value: '90+', label: 'Bootcamp Enrollments', desc: 'In Cybersecurity & ECPC Competitive Programming' },
      { id: 'teams', value: '15+', label: 'Competition Teams', desc: 'Formed & mentored across continuous seasonal challenges' }
    ],
    milestones: [
      {
        year: 'Late 2025',
        title: 'Chapter Founding & Launch',
        body: 'Established at Misr International University under the Microsoft Learn Student Ambassadors program. Kicked off Season 25/26 with our Opening Session and packed web engineering series with 180+ session attendees.'
      },
      {
        year: 'Early 2026',
        title: 'Security Masterclasses & CTF Debut',
        body: 'Expanded hands-on training with Encryption, Deception & Decryption, and launched our 1st Capture The Flag (CTF) tournament and multi-team Software Development Competitions.'
      },
      {
        year: 'Mid 2026',
        title: 'Custom Digital Platform Launch',
        body: 'Our Software Development team designed and engineered our full-stack in-house digital ecosystem—powering attendance verification, quizzes, competitions, and mobile apps.'
      },
      {
        year: '2026 - 2027',
        title: 'Agentic AI & Continuous Challenges',
        body: 'Entering Season 26/27 with cutting-edge Agentic AI workshops, advanced Cloud labs, and continuous evolving seasonal competitions across all departments.'
      }
    ],
    realHighlights: [
      {
        category: 'Recent Workshops & Sessions',
        items: [
          'CSS – The Art of Styling (64 Attendees)',
          'Git & GitHub in Practice (51 Attendees)',
          'JavaScript Fundamentals (46 Attendees)',
          'Encryption, Deception & Decryption (16 Attendees)',
          'Intro to Agentic AI (Emerging Tech)'
        ]
      },
      {
        category: 'Continuous Competitions',
        items: [
          'Software Development Competition (11 Teams, 25 Participants)',
          'Capture The Flag (CTF) 1st Edition (Security Exploitation)',
          'Front-End Web Development Task & Quiz Sprint',
          'Microsoft Imagine Cup Mentorship & Project Incubation'
        ]
      },
      {
        category: 'Bootcamps & Courses',
        items: [
          'Cybersecurity Bootcamp (58 Enrollments)',
          'ECPC Level 1 Competitive Programming (33 Enrollments)',
          'Web Engineering Practical Sprints'
        ]
      }
    ]
  }
};

// Department detailed metadata matching departments.js
const DEPARTMENT_DETAILS = [
  {
    id: 1,
    name: 'Software Development',
    icon: <FaCode />,
    shortDesc: 'Engineering production-grade web & mobile platforms for the campus community.',
    skills: ['React', 'Node.js', 'Express', 'MySQL / Sequelize', 'Capacitor Mobile', 'Git & CI/CD'],
    whatWeDo:
      'The Software Development committee designs, builds, and maintains the official club ecosystem (web portal, REST API, mobile app, and competition workspace), giving members hands-on production engineering experience.'
  },
  {
    id: 11,
    name: 'Artificial Intelligence',
    icon: <FaBrain />,
    shortDesc: 'Exploring Generative AI, Machine Learning, Computer Vision, and Agentic Systems.',
    skills: ['Python', 'PyTorch / TensorFlow', 'LangChain', 'Computer Vision', 'Agentic Workflows', 'LLM Prompting'],
    whatWeDo:
      'Focuses on cutting-edge AI technologies through hands-on labs, model building, generative AI workshops, and exploring how autonomous AI agents solve complex university and real-world challenges.'
  },
  {
    id: 12,
    name: 'Cyber Security',
    icon: <FaShieldAlt />,
    shortDesc: 'Mastering ethical hacking, defensive protocols, and Capture The Flag (CTF) challenges.',
    skills: ['Network Security', 'CTF Challenges', 'Cryptography', 'Web Exploitation', 'Wireshark', 'Burp Suite'],
    whatWeDo:
      'Hosts the annual Capture The Flag (CTF) tournaments, trains students in practical penetration testing, malware analysis, cryptography, and builds a defensive security mindset.'
  },
  {
    id: 2,
    name: 'Technical Training',
    icon: <MdSchool />,
    shortDesc: 'Empowering students through structured learning tracks, bootcamps, and problem solving.',
    skills: ['Data Structures & Algorithms', 'C++ / Java', 'ECPC Coaching', 'Technical Curriculum', 'Mentorship'],
    whatWeDo:
      'Designs and conducts deep-dive workshops, competitive programming tracks (ECPC), and technical study sessions that transform beginners into confident problem-solvers.'
  },
  {
    id: 3,
    name: 'Media & Content',
    icon: <FaPaintBrush />,
    shortDesc: 'Crafting stunning visual branding, motion graphics, and tech storytelling.',
    skills: ['UI/UX Design', 'Figma', 'Adobe Photoshop & Illustrator', 'Video Production', 'Motion Graphics'],
    whatWeDo:
      'Brings the club to life visually. Responsible for brand design, event promotion graphics, UI prototypes, promotional videos, and showcasing the club’s vibrant community.'
  },
  {
    id: 4,
    name: 'Public Relations',
    icon: <FaBullhorn />,
    shortDesc: 'Building strategic industry alliances, sponsor partnerships, and campus outreach.',
    skills: ['Corporate Sponsorships', 'Partnership Pitching', 'Event Hosting', 'Public Speaking', 'Outreach'],
    whatWeDo:
      'Connects the club with sponsors, industry guest speakers, Microsoft ambassadors, and the broader tech ecosystem in Egypt, ensuring high-impact collaborations.'
  },
  {
    id: 5,
    name: 'Human Resources',
    icon: <FaUsersCog />,
    shortDesc: 'Recruiting talent, fostering club culture, and driving leadership development.',
    skills: ['Recruitment Lifecycle', 'Member Engagement', 'Conflict Resolution', 'Performance Tracking', 'Team Building'],
    whatWeDo:
      'Manages recruitment cycles, team alignment, performance reviews, and organizes team-building initiatives to ensure an inclusive, high-morale environment for all members.'
  },
  {
    id: 6,
    name: 'Event Planning',
    icon: <FaCalendarAlt />,
    shortDesc: 'Orchestrating memorable conferences, hackathons, and seamless tech day logistics.',
    skills: ['Event Logistics', 'Stage Management', 'Schedule Coordination', 'Venue Management', 'Budgeting'],
    whatWeDo:
      'Plans and executes tech days, opening ceremonies, hackathons, and bootcamp sessions with meticulous organization and dynamic stage management.'
  }
];

// Core Pillars (What We Do)
const CORE_PILLARS = [
  {
    id: 'p1',
    icon: <FaLaptopCodeIcon />,
    title: 'Hands-On Tech Workshops',
    description:
      'Practical, project-centric sessions covering everything from web development fundamentals to Agentic AI and Cloud Architecture.'
  },
  {
    id: 'p2',
    icon: <FaTrophy />,
    title: 'Continuous Competitions & Hackathons',
    description:
      'Rather than static events, we continuously run evolving seasonal challenges—ranging from full-stack project hackathons and Capture The Flag (CTF) security tournaments to rapid quiz sprints and Microsoft Imagine Cup mentoring.'
  },
  {
    id: 'p3',
    icon: <FiLayers />,
    title: 'Real-World Software Incubation',
    description:
      'Our Software Development team actively engineers in-house platforms, web apps, and digital tooling used by hundreds of students across campus.'
  },
  {
    id: 'p4',
    icon: <FiAward />,
    title: 'Leadership & Career Acceleration',
    description:
      'Mentorship from senior students, alumni, and Microsoft ambassadors helping members secure top internships and build impressive technical portfolios.'
  }
];

// Custom icon wrapper for FaLaptopCode to keep JSX clean
function FaLaptopCodeIcon() {
  return <FaCode />;
}

const AboutUs = memo(() => {
  const { data } = useSiteContent(['about'], FALLBACK_ABOUT);
  const about = data.about || FALLBACK_ABOUT.about;

  const [activeDeptId, setActiveDeptId] = useState(DEPARTMENT_DETAILS[0].id);
  const activeDepartment = useMemo(() => {
    return DEPARTMENT_DETAILS.find((d) => d.id === activeDeptId) || DEPARTMENT_DETAILS[0];
  }, [activeDeptId]);

  const stats = Array.isArray(about.stats) && about.stats.length ? about.stats : FALLBACK_ABOUT.about.stats;
  const milestones = Array.isArray(about.milestones) && about.milestones.length ? about.milestones : FALLBACK_ABOUT.about.milestones;
  const realHighlights = Array.isArray(about.realHighlights) && about.realHighlights.length ? about.realHighlights : FALLBACK_ABOUT.about.realHighlights;

  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About MSP Tech Club - MIU',
    description:
      about.subtitle ||
      'MSP Tech Club is a student-led innovation community at Misr International University powered by the Microsoft Learn Student Ambassadors program.',
    mainEntity: {
      '@type': 'EducationalOrganization',
      name: 'MSP Tech Club - MIU',
      alternateName: 'Microsoft Student Partners - Misr International University',
      url: 'https://msp-miu.tech',
      foundingLocation: {
        '@type': 'Place',
        name: 'Misr International University'
      },
      parentOrganization: {
        '@type': 'Organization',
        name: 'Microsoft Learn Student Ambassadors'
      },
      department: DEPARTMENT_DETAILS.map((dept) => ({
        '@type': 'Organization',
        name: dept.name,
        description: dept.shortDesc
      }))
    }
  }), [about.subtitle]);

  return (
    <main className="About">
      <SEO
        title="About Us"
        description="Learn about MSP Tech Club at MIU - a student-led innovation community powered by Microsoft Learn Student Ambassadors. Discover our mission, 8 departments, verified impact, and technical milestones."
        keywords="MSP, Microsoft Student Partners, MIU tech club, student organization, Microsoft Learn Student Ambassadors, software development, artificial intelligence, cybersecurity, imagine cup, MIU"
        url="https://msp-miu.tech/about"
        structuredData={structuredData}
      />

      <BackButton to="/" label="Back to Home" />

      {/* Hero Section */}
      <section className="AboutHero" aria-labelledby="about-hero-heading">
        <div className="AboutHero__bg" aria-hidden="true" />
        <div className="AboutHero__inner">
          <div className="AboutHero__badge AboutHero__badge--animate">
            <FaMicrosoft className="AboutHero__badgeIcon" />
            <span>{about.badge || FALLBACK_ABOUT.about.badge}</span>
          </div>
          <h1 id="about-hero-heading" className="AboutHero__title AboutHero__title--animate">
            {about.pageTitle || FALLBACK_ABOUT.about.pageTitle}
          </h1>
          <p className="AboutHero__subtitle AboutHero__subtitle--animate">
            {about.subtitle || FALLBACK_ABOUT.about.subtitle}
          </p>
          <div className="AboutHero__actions AboutHero__actions--animate">
            <a href="#about-departments" className="Btn Btn--primary">
              Explore Our 8 Tracks <FiArrowRight className="Btn__icon Btn__icon--trail" />
            </a>
            <a href="#about-initiatives" className="Btn Btn--outline">
              Our Impact in Action
            </a>
          </div>
        </div>
      </section>

      {/* Impact Stats Counter Bar */}
      <section className="AboutStats" aria-label="Club Impact Statistics">
        <div className="AboutStats__grid">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.id || idx}
              className="AboutStatCard"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ scale: 1.03, y: -4 }}
            >
              <div className="AboutStatCard__top">
                <span className="AboutStatCard__value">{stat.value}</span>
                <span className="AboutStatCard__icon">
                  {idx === 0 && <FiUsers />}
                  {idx === 1 && <FaUsersCog />}
                  {idx === 2 && <MdSchool />}
                  {idx === 3 && <FaTrophy />}
                </span>
              </div>
              <h3 className="AboutStatCard__label">{stat.label}</h3>
              <p className="AboutStatCard__desc">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission Vision Values Triad */}
      <section className="AboutTriad" aria-label="Mission Vision Values">
        <div className="AboutTriad__grid">
          <motion.article
            className="TriadCard TriadCard--animate"
            whileHover={{ scale: 1.03, y: -4 }}
          >
            <div className="TriadCard__icon">
              <FiTarget />
            </div>
            <h3 className="TriadCard__title">Mission</h3>
            <p className="TriadCard__body">{about.mission || FALLBACK_ABOUT.about.mission}</p>
          </motion.article>

          <motion.article
            className="TriadCard TriadCard--animate"
            whileHover={{ scale: 1.03, y: -4 }}
            style={{ animationDelay: '0.2s' }}
          >
            <div className="TriadCard__icon">
              <FiEye />
            </div>
            <h3 className="TriadCard__title">Vision</h3>
            <p className="TriadCard__body">{about.vision || FALLBACK_ABOUT.about.vision}</p>
          </motion.article>

          <motion.article
            className="TriadCard TriadCard--animate"
            whileHover={{ scale: 1.03, y: -4 }}
            style={{ animationDelay: '0.3s' }}
          >
            <div className="TriadCard__icon">
              <FiHeart />
            </div>
            <h3 className="TriadCard__title">Core Values</h3>
            <p className="TriadCard__body">{about.values || FALLBACK_ABOUT.about.values}</p>
          </motion.article>
        </div>
      </section>

      {/* Core Pillars (What We Do) */}
      <section className="AboutPillars" aria-labelledby="about-pillars-heading">
        <header className="AboutSectionHeader">
          <span className="AboutSectionHeader__eyebrow">How We Operate</span>
          <h2 id="about-pillars-heading" className="AboutSectionHeader__title">
            The 4 Pillars of MSP MIU
          </h2>
          <p className="AboutSectionHeader__subtitle">
            We provide a continuous runway for students to transform theoretical academic coursework into production engineering and industry leadership.
          </p>
        </header>

        <div className="AboutPillars__grid">
          {CORE_PILLARS.map((pillar, index) => (
            <motion.div
              key={pillar.id}
              className="PillarCard"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -3 }}
            >
              <div className="PillarCard__iconWrap">{pillar.icon}</div>
              <h3 className="PillarCard__title">{pillar.title}</h3>
              <p className="PillarCard__body">{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Interactive Track & Department Explorer */}
      <section id="about-departments" className="AboutDepartments" aria-labelledby="about-depts-heading">
        <header className="AboutSectionHeader">
          <span className="AboutSectionHeader__eyebrow">Our Structure</span>
          <h2 id="about-depts-heading" className="AboutSectionHeader__title">
            Explore Our 8 Departments
          </h2>
          <p className="AboutSectionHeader__subtitle">
            From technical engineering tracks to media and operational leadership, discover where your skills and passions fit inside MSP.
          </p>
        </header>

        <div className="AboutDepartments__container">
          {/* Department Tabs */}
          <div className="AboutDepartments__nav" role="tablist" aria-label="Club Departments">
            {DEPARTMENT_DETAILS.map((dept) => (
              <button
                key={dept.id}
                role="tab"
                aria-selected={activeDeptId === dept.id}
                aria-controls={`dept-panel-${dept.id}`}
                id={`dept-tab-${dept.id}`}
                className={`DeptTabBtn ${activeDeptId === dept.id ? 'DeptTabBtn--active' : ''}`}
                onClick={() => setActiveDeptId(dept.id)}
              >
                <span className="DeptTabBtn__icon">{dept.icon}</span>
                <span className="DeptTabBtn__label">{dept.name}</span>
              </button>
            ))}
          </div>

          {/* Department Detail Active Panel */}
          <div className="AboutDepartments__panelWrapper">
            <AnimatePresence mode="wait">
              <motion.article
                key={activeDepartment.id}
                id={`dept-panel-${activeDepartment.id}`}
                role="tabpanel"
                aria-labelledby={`dept-tab-${activeDepartment.id}`}
                className="DeptDetailPanel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="DeptDetailPanel__head">
                  <div className="DeptDetailPanel__badge">
                    <span className="DeptDetailPanel__icon">{activeDepartment.icon}</span>
                    <h3 className="DeptDetailPanel__title">{activeDepartment.name}</h3>
                  </div>
                  <p className="DeptDetailPanel__shortDesc">{activeDepartment.shortDesc}</p>
                </div>

                <div className="DeptDetailPanel__body">
                  <h4 className="DeptDetailPanel__subheading">What Members Do & Learn:</h4>
                  <p className="DeptDetailPanel__text">{activeDepartment.whatWeDo}</p>

                  <h4 className="DeptDetailPanel__subheading">Core Technologies & Tools:</h4>
                  <div className="DeptDetailPanel__skills">
                    {activeDepartment.skills.map((skill) => (
                      <span key={skill} className="SkillBadge">
                        <FiCheckCircle className="SkillBadge__icon" /> {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="DeptDetailPanel__footer">
                  <Link to="/Meet-the-board" className="DeptDetailPanel__cta">
                    Meet the {activeDepartment.name} Board Team <FiArrowRight />
                  </Link>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Verified Initiatives Showcase (Real Events, Competitions, Bootcamps) */}
      <section id="about-initiatives" className="AboutInitiatives" aria-labelledby="about-initiatives-heading">
        <header className="AboutSectionHeader">
          <span className="AboutSectionHeader__eyebrow">Proven Track Record</span>
          <h2 id="about-initiatives-heading" className="AboutSectionHeader__title">
            Our Initiatives in Action
          </h2>
          <p className="AboutSectionHeader__subtitle">
            A glimpse into actual workshops, competitions, and bootcamps organized and delivered by MSP Tech Club MIU.
          </p>
        </header>

        <div className="AboutInitiatives__grid">
          {realHighlights.map((highlight, index) => (
            <motion.div
              key={highlight.category || index}
              className="InitiativeCard"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="InitiativeCard__header">
                <span className="InitiativeCard__icon">
                  {index === 0 && <FiCpu />}
                  {index === 1 && <FaTrophy />}
                  {index === 2 && <MdSchool />}
                </span>
                <h3 className="InitiativeCard__title">{highlight.category}</h3>
              </div>
              <ul className="InitiativeCard__list">
                {highlight.items.map((item, i) => (
                  <li key={i} className="InitiativeCard__item">
                    <FiCheckCircle className="InitiativeCard__check" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The Microsoft Advantage Section */}
      <section className="AboutMicrosoft" aria-labelledby="about-ms-heading">
        <div className="AboutMicrosoft__glow" aria-hidden="true" />
        <div className="AboutMicrosoft__inner">
          <header className="AboutSectionHeader">
            <span className="AboutSectionHeader__eyebrow">Strategic Affiliation</span>
            <h2 id="about-ms-heading" className="AboutSectionHeader__title">
              The Microsoft & MLSA Advantage
            </h2>
            <p className="AboutSectionHeader__subtitle">
              Being powered by the Microsoft Learn Student Ambassadors program gives our members access to global resources, tools, and direct industry recognition.
            </p>
          </header>

          <div className="AboutMicrosoft__grid">
            <div className="MsAdvantageCard">
              <div className="MsAdvantageCard__iconWrap">
                <FaMicrosoft />
              </div>
              <h3 className="MsAdvantageCard__title">Global Ambassador Network</h3>
              <p className="MsAdvantageCard__body">
                Connect directly with student ambassadors and regional Microsoft community leaders across more than 100 countries.
              </p>
            </div>

            <div className="MsAdvantageCard">
              <div className="MsAdvantageCard__iconWrap">
                <FaTrophy />
              </div>
              <h3 className="MsAdvantageCard__title">Microsoft Imagine Cup Mentorship</h3>
              <p className="MsAdvantageCard__body">
                Receive hands-on project coaching, pitch preparation, and technical advisory to compete in Microsoft’s global student competition.
              </p>
            </div>

            <div className="MsAdvantageCard">
              <div className="MsAdvantageCard__iconWrap">
                <FiCpu />
              </div>
              <h3 className="MsAdvantageCard__title">Azure Cloud & Developer Tools</h3>
              <p className="MsAdvantageCard__body">
                Hands-on exposure to Azure Cognitive Services, Cloud Computing, GitHub Student Pack tools, and modern DevOps practices.
              </p>
            </div>

            <div className="MsAdvantageCard">
              <div className="MsAdvantageCard__iconWrap">
                <MdStar />
              </div>
              <h3 className="MsAdvantageCard__title">Certification & Career Pathways</h3>
              <p className="MsAdvantageCard__body">
                Structured learning paths aligning with official Microsoft role-based certifications (AI-900, AZ-900, and GitHub accreditations).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What MSP Stands For & Identity */}
      <section className="AboutMeaning" aria-labelledby="about-meaning-heading">
        <div className="AboutMeaning__accent" aria-hidden="true" />
        <header className="AboutMeaning__head">
          <h2 id="about-meaning-heading" className="AboutMeaning__title">
            {about.meaningTitle || FALLBACK_ABOUT.about.meaningTitle}
          </h2>
        </header>
        <div className="AboutMeaning__content">
          <p className="AboutMeaning__text">
            {about.meaningBody || FALLBACK_ABOUT.about.meaningBody}
          </p>
          <ul className="AboutMeaning__iconList" aria-label="Key Focus Areas">
            {(about.focusChips || FALLBACK_ABOUT.about.focusChips).map((chip, idx) => (
              <motion.li
                key={chip}
                className="li--animate"
                whileHover={{ scale: 1.05 }}
                style={{ animationDelay: `${1.0 + idx * 0.1}s` }}
              >
                <MdStar /> {chip}
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Milestones Timeline */}
      <section className="AboutTimeline" aria-labelledby="about-timeline-heading">
        <header className="AboutTimeline__head">
          <span className="AboutSectionHeader__eyebrow">Our Evolution</span>
          <h2 id="about-timeline-heading" className="AboutTimeline__title">
            MSP-MIU Milestones
          </h2>
          <p className="AboutTimeline__subtitle">
            From our founding to launching our custom digital platform and competitive cybersecurity tracks.
          </p>
        </header>

        <div className="Timeline" role="list">
          {milestones.map((m, idx) => (
            <motion.div
              role="listitem"
              key={m.year || idx}
              className={`TimelineItem ${idx % 2 ? 'TimelineItem--right' : 'TimelineItem--left'}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              <div className="TimelineItem__dot" />
              <motion.div className="TimelineItem__iconWrap" whileHover={{ scale: 1.15, rotate: 6 }}>
                {idx === 0 && <FaRocket />}
                {idx === 1 && <FaShieldAlt />}
                {idx === 2 && <FaCode />}
                {idx === 3 && <FiCpu />}
              </motion.div>
              <div className="TimelineItem__card">
                <div className="TimelineItem__year">{m.year}</div>
                <h3 className="TimelineItem__heading">{m.title}</h3>
                <p className="TimelineItem__body">{m.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call To Action (CTA) */}
      <section className="AboutCTA" aria-labelledby="about-cta-heading">
        <div className="AboutCTA__glow" aria-hidden="true" />
        <header className="AboutCTA__head">
          <h2 id="about-cta-heading" className="AboutCTA__title">
            Ready to Build Your Tech Future?
          </h2>
          <p className="AboutCTA__subtitle">
            Whether you want to write code, train AI models, master cybersecurity, or lead events—there is a place for you at MSP Tech Club MIU.
          </p>
        </header>
        <div className="AboutCTA__actions">
          <Link to="/become-member" className="Btn Btn--primary">
            <FaUserPlus className="Btn__icon" /> Join Our Community
          </Link>
          <Link to="/events" className="Btn Btn--outline">
            <FiCalendar className="Btn__icon" /> Explore Events
          </Link>
          <Link to="/Meet-the-board" className="Btn Btn--outline">
            Meet the Board <FiArrowRight className="Btn__icon Btn__icon--trail" />
          </Link>
        </div>
      </section>
    </main>
  );
});

AboutUs.displayName = 'AboutUs';

export default AboutUs;
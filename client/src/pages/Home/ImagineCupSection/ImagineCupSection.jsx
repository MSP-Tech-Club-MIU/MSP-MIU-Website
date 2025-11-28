import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiAward, FiCode, FiDollarSign, FiUsers, FiCheckCircle } from 'react-icons/fi';
import './ImagineCupSection.css';
const imagineCupLogo = `${import.meta.env.VITE_CLOUD_STORAGE_URL}/Assets/imagine_cup.jpg`;

const ImagineCupSection = memo(() => {
  const initialAnimation = useMemo(() => ({ opacity: 0, y: 30 }), []);
  const whileInViewAnimation = useMemo(() => ({ opacity: 1, y: 0 }), []);
  const viewportProps = useMemo(() => ({ once: true, amount: 0.2 }), []);

  const benefits = useMemo(() => [
    {
      icon: <FiCode />,
      title: 'Solve Real-World Problems',
      description: 'Create solutions in categories like AI, Health, Education, and Sustainability'
    },
    {
      icon: <FiAward />,
      title: 'Build with Pro Tools',
      description: 'Use powerful Microsoft technologies like Azure and GitHub'
    },
    {
      icon: <FiDollarSign />,
      title: 'Win Big',
      description: 'Compete for a $100,000 prize, mentorship from Microsoft, and a meeting with CEO Satya Nadella'
    }
  ], []);

  const requirements = useMemo(() => [
    'Students aged 18 and older',
    'Enrolled in an accredited academic institution',
    'Compete individually or in teams of up to four'
  ], []);

  return (
    <section className="ImagineCup" aria-labelledby="imagine-cup-heading">
      <div className="ImagineCup__container">
        <motion.div
          className="ImagineCup__header"
          initial={initialAnimation}
          whileInView={whileInViewAnimation}
          viewport={viewportProps}
        >
          <div className="ImagineCup__logoWrapper">
            <img 
              src={imagineCupLogo} 
              alt="Microsoft Imagine Cup 2026 Logo" 
              className="ImagineCup__logo"
            />
          </div>
          <div className="ImagineCup__headerContent">
            <h2 id="imagine-cup-heading" className="ImagineCup__title">
              Microsoft Imagine Cup 2026
            </h2>
            <p className="ImagineCup__subtitle">
              Registration is now open for the premier global student technology competition. 
              If you're a student with a passion for tech and want to tackle big problems, 
              this is your chance to shine.
            </p>
          </div>
        </motion.div>

        <div className="ImagineCup__content">
          <motion.div
            className="ImagineCup__benefits"
            initial={initialAnimation}
            whileInView={whileInViewAnimation}
            viewport={viewportProps}
            transition={{ delay: 0.1 }}
          >
            <h3 className="ImagineCup__sectionTitle">Why Join?</h3>
            <div className="ImagineCup__benefitsGrid">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  className="ImagineCup__benefitCard"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportProps}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <div className="ImagineCup__benefitIcon">
                    {benefit.icon}
                  </div>
                  <h4 className="ImagineCup__benefitTitle">{benefit.title}</h4>
                  <p className="ImagineCup__benefitDescription">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="ImagineCup__requirements"
            initial={initialAnimation}
            whileInView={whileInViewAnimation}
            viewport={viewportProps}
            transition={{ delay: 0.3 }}
          >
            <h3 className="ImagineCup__sectionTitle">
              <FiUsers />
              Who Can Participate?
            </h3>
            <ul className="ImagineCup__requirementsList">
              {requirements.map((requirement, index) => (
                <motion.li
                  key={index}
                  className="ImagineCup__requirementItem"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportProps}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <FiCheckCircle />
                  <span>{requirement}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="ImagineCup__cta"
            initial={initialAnimation}
            whileInView={whileInViewAnimation}
            viewport={viewportProps}
            transition={{ delay: 0.5 }}
          >
            <div className="ImagineCup__ctaContent">
              <h3 className="ImagineCup__ctaTitle">Ready to Start?</h3>
              <p className="ImagineCup__ctaDescription">
                To get resources, guidance, and support from us, fill out this form 
                with your university email address.
              </p>
              <motion.a
                href="https://forms.gle/ECUdaZbVKtYcR5rk9"
                target="_blank"
                rel="noopener noreferrer"
                className="ImagineCup__ctaButton"
                whileHover={{ scale: 1.05, boxShadow: '0 8px 24px -8px rgba(3, 169, 244, 0.6)' }}
                whileTap={{ scale: 0.95 }}
              >
                Register Now
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

ImagineCupSection.displayName = 'ImagineCupSection';

export default ImagineCupSection;


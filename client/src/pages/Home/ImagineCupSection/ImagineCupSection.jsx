import React, { memo, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAward, FiCode, FiDollarSign, FiUsers, FiCheckCircle } from 'react-icons/fi';
import './ImagineCupSection.css';
import ApiService from '../../../services/api';
import useSiteContent from '../../../hooks/useSiteContent';

const BENEFIT_ICONS = [<FiCode key="c" />, <FiAward key="a" />, <FiDollarSign key="d" />];

const FALLBACK = {
  imagine_cup: {
    enabled: true,
    title: 'Microsoft Imagine Cup 2026',
    subtitle:
      "Registration is now open for the premier global student technology competition. If you're a student with a passion for tech and want to tackle big problems, this is your chance to shine.",
    benefits: [
      {
        title: 'Solve Real-World Problems',
        description: 'Create solutions in categories like AI, Health, Education, and Sustainability'
      },
      {
        title: 'Build with Pro Tools',
        description: 'Use powerful Microsoft technologies like Azure and GitHub'
      },
      {
        title: 'Win Big',
        description:
          'Compete for a $100,000 prize, mentorship from Microsoft, and a meeting with CEO Satya Nadella'
      }
    ],
    requirements: [
      'Students aged 18 and older',
      'Enrolled in an accredited academic institution',
      'Compete individually or in teams of up to four'
    ],
    formUrl: 'https://forms.gle/ECUdaZbVKtYcR5rk9',
    ctaTitle: 'Ready to Start?',
    ctaDescription: 'Register your interest and start building your Imagine Cup project.',
    ctaButtonLabel: 'Apply via Google Form',
    logoAssetName: 'imagine_cup.jpg'
  }
};

const ImagineCupSection = memo(() => {
  const { data } = useSiteContent(['imagine_cup'], FALLBACK);
  const cfg = data.imagine_cup || FALLBACK.imagine_cup;
  const [imagineCupLogo, setImagineCupLogo] = useState(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const result = await ApiService.getAssets('assets', { limit: 100, page: 1 });
        const assets = Array.isArray(result) ? result : (result.assets || result.data || []);
        const name = cfg.logoAssetName || 'imagine_cup.jpg';
        const logoAsset = assets.find(
          (asset) =>
            asset.name === name ||
            asset.key?.includes(name) ||
            asset.key?.includes(`Assets/${name}`)
        );
        if (logoAsset?.url) setImagineCupLogo(logoAsset.url);
      } catch (error) {
        console.error('Error fetching Imagine Cup logo:', error);
      }
    };
    fetchLogo();
  }, [cfg.logoAssetName]);

  const initialAnimation = useMemo(() => ({ opacity: 0, y: 30 }), []);
  const whileInViewAnimation = useMemo(() => ({ opacity: 1, y: 0 }), []);
  const viewportProps = useMemo(() => ({ once: true, amount: 0.2 }), []);

  const benefits = Array.isArray(cfg.benefits) ? cfg.benefits : FALLBACK.imagine_cup.benefits;
  const requirements = Array.isArray(cfg.requirements)
    ? cfg.requirements
    : FALLBACK.imagine_cup.requirements;

  if (cfg.enabled === false) return null;

  return (
    <section className="ImagineCup" aria-labelledby="imagine-cup-heading">
      <div className="ImagineCup__container">
        <motion.div
          className="ImagineCup__header"
          initial={initialAnimation}
          whileInView={whileInViewAnimation}
          viewport={viewportProps}
        >
          {imagineCupLogo && (
            <div className="ImagineCup__logoWrapper">
              <img
                src={imagineCupLogo}
                alt={`${cfg.title || 'Imagine Cup'} Logo`}
                className="ImagineCup__logo"
                loading="lazy"
              />
            </div>
          )}
          <div className="ImagineCup__headerContent">
            <h2 id="imagine-cup-heading" className="ImagineCup__title">
              {cfg.title || FALLBACK.imagine_cup.title}
            </h2>
            <p className="ImagineCup__subtitle">{cfg.subtitle}</p>
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
                  key={benefit.title || index}
                  className="ImagineCup__benefitCard"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportProps}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <div className="ImagineCup__benefitIcon">
                    {BENEFIT_ICONS[index % BENEFIT_ICONS.length]}
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
                  key={requirement}
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
              <h3 className="ImagineCup__ctaTitle">{cfg.ctaTitle || 'Ready to Start?'}</h3>
              <p className="ImagineCup__ctaDescription">
                {cfg.ctaDescription}
              </p>
              <a
                href={cfg.formUrl || FALLBACK.imagine_cup.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ImagineCup__ctaButton"
              >
                {cfg.ctaButtonLabel || 'Apply via Google Form'}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

ImagineCupSection.displayName = 'ImagineCupSection';

export default ImagineCupSection;

import { memo } from 'react';
import TextType from '../../../components/TextType/TextType';
import mspLogo from '../../../assets/Images/msp-logo.png';
import useSiteContent from '../../../hooks/useSiteContent';
import './HeroSection.css';

const FALLBACK = {
  hero: {
    texts: [
      'Empowering Future Tech Leaders',
      'Driving Innovation Through Technology',
      'Building a Connected Community'
    ],
    subtitle:
      'MSP Tech Club is a community-driven hub fostering innovation, collaboration, and growth through technology, events, sessions, and real-world impact.',
    primaryCtaLabel: 'Meet the Board',
    primaryCtaHref: '/meet-the-board',
    secondaryCtaLabel: 'Explore Events',
    secondaryCtaHref: '/events'
  }
};

export const HeroSection = memo(() => {
  const { data } = useSiteContent(['hero'], FALLBACK);
  const hero = data.hero || FALLBACK.hero;
  const texts = Array.isArray(hero.texts) && hero.texts.length ? hero.texts : FALLBACK.hero.texts;

  return (
    <section className="Hero" aria-labelledby="hero-heading">
      <div className="Hero__inner">
        <div className="Hero__col Hero__col--text">
          <TextType
            text={texts}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
            className="Hero__title"
          />
          <p className="Hero__subtitle">{hero.subtitle || FALLBACK.hero.subtitle}</p>
          <div className="Hero__ctas">
            <a href={hero.primaryCtaHref || '/meet-the-board'} className="HeroCTA HeroCTA--primary">
              {hero.primaryCtaLabel || 'Meet the Board'}
            </a>
            <a href={hero.secondaryCtaHref || '/events'} className="HeroCTA HeroCTA--ghost">
              {hero.secondaryCtaLabel || 'Explore Events'}
            </a>
          </div>
        </div>
        <div className="Hero__col Hero__col--logo">
          <div className="Hero__logoWrap">
            <div className="Hero__logoContainer">
              <img
                src={mspLogo}
                alt="MSP Tech Club Logo"
                className="Hero__logo"
              />
            </div>
            <div className="Hero__float Hero__float--1" />
            <div className="Hero__float Hero__float--2" />
            <div className="Hero__float Hero__float--3" />
            <div className="Hero__glow Hero__glow--logo" />
          </div>
        </div>
      </div>
      <div className="Hero__bg" aria-hidden="true" />
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;

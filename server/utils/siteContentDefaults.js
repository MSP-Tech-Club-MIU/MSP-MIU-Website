/** Default CMS payloads used when a key is missing in the DB. */

const DEFAULTS = {
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
  },
  about: {
    pageTitle: 'About MSP Tech Club',
    subtitle:
      'MSP Tech Club is a student-led innovation community powered by the Microsoft Learn Student Ambassadors program. We explore cutting-edge technologies, build real projects, and develop technical & leadership excellence together.',
    mission:
      'To inspire and equip students with the knowledge, tools, and opportunities to innovate and make an impact through technology.',
    vision:
      'A thriving community of future tech leaders driving digital transformation through creativity, collaboration, and continuous learning.',
    values: 'Innovation · Growth · Collaboration · Inclusion · Excellence',
    meaningTitle: 'What MSP Stands For',
    meaningBody:
      'MSP stands for Microsoft Student Partners — now known as Microsoft Learn Student Ambassadors. We bring Microsoft technologies and a global community to campus while building local impact at MIU.',
    focusChips: [
      'Program Alignment',
      'Emerging Tech Labs',
      'Community & Mentorship',
      'Excellence & Impact'
    ]
  },
  footer: {
    brandName: 'MSP Tech Club',
    visionLabel: 'Our Vision:',
    visionText: 'Empowering students through innovation, collaboration, and continuous learning.',
    socials: [
      { label: 'TikTok', href: 'https://www.tiktok.com/@mspmiu' },
      { label: 'Instagram', href: 'https://www.instagram.com/mspmiu' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/mspmiu' }
    ],
    developerName: 'Ahmed Mostafa',
    developerUrl: 'https://ahmedmostafa-swe.tech',
    developerTitleBefore2027: 'Lead Developer',
    developerTitleFrom2027: 'Original Lead Developer'
  },
  seo: {
    siteUrl: 'https://msp-miu.tech',
    twitterHandle: '@mspmiu',
    defaultOgImage: ''
  },
  imagine_cup: {
    enabled: true,
    title: 'Imagine Cup 2026',
    subtitle: 'Microsoft\'s global student technology competition',
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
  },
  gallery: {
    title: 'Gallery',
    subtitle: 'Moments from our journey together'
  },
  lookups: {
    faculties: [
      'Computer Science',
      'Electronics & Communication Engineering',
      'Mass Communication',
      'Dentistry',
      'Architecture',
      'Pharmacy',
      'Business Administration',
      'Alsun'
    ],
    years: ['Freshman', 'Sophomore', 'Junior', 'Senior 1', 'Senior 2'],
    departments: [
      { id: 1, name: 'Software Development' },
      { id: 2, name: 'Technical Training' },
      { id: 3, name: 'Media & Content Creation' },
      { id: 4, name: 'Public Relations' },
      { id: 5, name: 'Human Resources' },
      { id: 6, name: 'Event Planning' },
      { id: 7, name: 'Vice President' },
      { id: 8, name: 'President' },
      { id: 9, name: 'Founder' }
    ]
  }
};

const ALLOWED_KEYS = Object.keys(DEFAULTS);

function getDefault(key) {
  if (!DEFAULTS[key]) return null;
  return JSON.parse(JSON.stringify(DEFAULTS[key]));
}

module.exports = {
  DEFAULTS,
  ALLOWED_KEYS,
  getDefault
};

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
    defaultOgImage: 'https://msp-miu.tech/og-image.png'
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
  android_app: {
    versionName: '1.0.0',
    versionCode: 1,
    fileSizeBytes: 0,
    releaseNotes: '',
    apkKey: 'Mobile Application/MSP-MIU.apk',
    updatedAt: null
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
      { id: 9, name: 'Founder' },
      { id: 11, name: 'Artificial Intelligence' },
      { id: 12, name: 'Cyber Security' }
    ]
  },
  privacy_policy: {
    pageTitle: 'Privacy Policy',
    subtitle:
      'How MSP Tech Club at Misr International University collects, uses, and protects your information.',
    lastUpdated: '2026-08-14',
    intro:
      'This Privacy Policy explains how MSP Tech Club — MIU ("we", "us", or "the Club") handles personal information when you use our website, Android app, and related services (collectively, the "Services"). By using the Services, you agree to the practices described here.',
    sections: [
      {
        heading: 'Who we are',
        body:
          'MSP Tech Club is a student-led community at Misr International University, connected with the Microsoft Learn Student Ambassadors program. We organize events, courses, competitions, and community activities for students. For privacy questions, contact us through the channels listed on our website or via club leadership.'
      },
      {
        heading: 'Information we collect',
        body:
          'Depending on how you use the Services, we may collect: account details (name, email, faculty, academic year, and similar profile fields you submit); membership and registration data; competition team and submission information; attendance and participation records; suggestions or feedback you send us; device and usage data needed to run the site or app (such as basic logs, session tokens, and app version); and technical identifiers stored locally (for example login tokens) so you stay signed in.'
      },
      {
        heading: 'How we use your information',
        body:
          'We use your information to operate and improve the Services; manage memberships, events, courses, and competitions; communicate about club activities, account status, and important updates; support learning and judging workflows; keep the platform secure and prevent abuse; and meet operational or legal obligations that apply to a student organization running digital services.'
      },
      {
        heading: 'Legal basis and consent',
        body:
          'We process information you provide when you create an account, apply for membership, register for activities, or otherwise interact with the Services. Where consent is required, you can withdraw it by closing your account or contacting club leadership, subject to data we must retain for security, academic integrity, or operational records.'
      },
      {
        heading: 'Sharing of information',
        body:
          'We do not sell your personal information. We may share limited data with: board members and authorized staff who need it to run club activities; service providers that host our infrastructure (for example database, file storage, and email delivery); Microsoft or competition partners when you choose to participate in linked programs; and authorities if required by law or to protect the safety of our community. Public-facing content you choose to publish (such as leaderboard names in competitions) may be visible to other users.'
      },
      {
        heading: 'Cookies, local storage, and similar technologies',
        body:
          'We use essential storage (such as authentication tokens and preferences) so the website and app can function. These are not used for third-party advertising. You can clear local storage or app data in your browser or device settings; doing so may sign you out.'
      },
      {
        heading: 'Data retention',
        body:
          'We keep account and activity records for as long as needed to provide the Services, support ongoing seasons and competitions, resolve disputes, and maintain community integrity. When information is no longer needed, we delete or anonymize it where reasonably possible.'
      },
      {
        heading: 'Security',
        body:
          'We apply reasonable technical and organizational measures to protect personal data, including access controls and encrypted transport (HTTPS). No online service is completely secure; please use a strong password and keep your login details private.'
      },
      {
        heading: 'Your choices and rights',
        body:
          'Subject to applicable law and club operations, you may request access to or correction of your profile information, ask questions about how we use your data, or request deletion of your account where feasible. Some records (for example competition results or attendance used for club integrity) may need to be retained. Use your profile settings where available, or contact club leadership.'
      },
      {
        heading: 'Children and students',
        body:
          'Our Services are intended for university students and community members who can form a membership relationship with the Club. If you believe we have collected information from someone who should not use the Services, contact us so we can review and take appropriate action.'
      },
      {
        heading: 'Third-party links and services',
        body:
          'The Services may link to third-party sites or forms (for example external registration forms or social media). Their privacy practices are governed by their own policies. We encourage you to review those policies before sharing information with them.'
      },
      {
        heading: 'Android application',
        body:
          'Our official Android app uses the same account and club data as the website. It may also store app version metadata and local session data needed for offline-friendly navigation. App updates may request permissions required for core features; we do not request unnecessary access to personal device content.'
      },
      {
        heading: 'Changes to this policy',
        body:
          'We may update this Privacy Policy from time to time. The "Last updated" date at the top of the page will change when we do. Continued use of the Services after an update means you acknowledge the revised policy.'
      },
      {
        heading: 'Contact',
        body:
          'For privacy-related requests or questions about MSP Tech Club — MIU, reach out through our official social channels listed on the website, or contact current club leadership (President / Vice President / relevant department heads).'
      }
    ]
  },
  faqs: {
    pageTitle: 'Frequently Asked Questions',
    subtitle: 'Quick answers about MSP Tech Club at MIU — membership, events, courses, and competitions.',
    items: [
      {
        id: 'what-is-msp',
        question: 'What is MSP Tech Club?',
        answer:
          'MSP Tech Club at Misr International University is a student-led innovation community connected with Microsoft Learn Student Ambassadors. We run workshops, courses, competitions, and community events to help students grow technical and leadership skills.'
      },
      {
        id: 'who-can-join',
        question: 'Who can join the club?',
        answer:
          'Membership is open to MIU students who want to learn, build, and contribute. Apply through the Become a Member page when applications are open. Acceptance may depend on the current season and capacity.'
      },
      {
        id: 'how-to-apply',
        question: 'How do I apply to become a member?',
        answer:
          'Go to Become a Member, fill in your details, and submit the form. You will receive updates by email about your application status. Make sure you use an email you check regularly.'
      },
      {
        id: 'events',
        question: 'How can I attend events and sessions?',
        answer:
          'Browse upcoming events on the Events page. Some sessions may require registration or membership. Follow our social channels and announcements for last-minute updates and seating limits.'
      },
      {
        id: 'courses',
        question: 'Are courses free?',
        answer:
          'Club courses and learning materials are generally provided for members and participants as part of our community programs. Specific courses may have enrollment rules — check each course page for details.'
      },
      {
        id: 'competitions',
        question: 'How do competitions work?',
        answer:
          'Open a competition from the Competitions page to see rules, timelines, and team requirements. You may need to create or join a team, submit deliverables, and follow judging guidelines published for that competition.'
      },
      {
        id: 'android-app',
        question: 'Is there an official Android app?',
        answer:
          'Yes. You can download the official MSP Tech Club Android app from the Download App page on the website. The app helps you stay connected to events, courses, and community updates.'
      },
      {
        id: 'account-issues',
        question: 'I cannot log in or activate my account. What should I do?',
        answer:
          'Use the login page links to resend activation or reset your password if available. Check your spam folder for club emails. If the problem continues, contact club leadership or submit a note on the Suggestions page with the email tied to your account.'
      },
      {
        id: 'suggestions',
        question: 'How can I share feedback or ideas?',
        answer:
          'Use the Suggestions page to send feedback anonymously or with your name. We review suggestions to improve events, courses, and the platform.'
      },
      {
        id: 'privacy',
        question: 'How is my personal data handled?',
        answer:
          'We only collect information needed to run membership, events, courses, and competitions. See our Privacy Policy for details on collection, use, retention, and your choices.'
      }
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

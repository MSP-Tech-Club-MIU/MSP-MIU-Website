const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DEFAULT_SITE_URL = 'https://msp-miu.tech';
const DEFAULT_TITLE = 'MSP Tech Club — MIU';
const DEFAULT_DESCRIPTION =
  'MSP Tech Club at Misr International University. A student-led innovation community powered by Microsoft Learn Student Ambassadors — workshops, courses, competitions, and leadership.';
const DEFAULT_KEYWORDS =
  'MSP, MSP Tech Club, Microsoft Student Partners, Microsoft Learn Student Ambassadors, MIU, Misr International University, tech club, Egypt, programming, workshops, competitions';

const STATIC_PAGES = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS
  },
  '/about': {
    title: 'About Us | MSP Tech Club — MIU',
    description:
      'Learn about MSP Tech Club at MIU — a student-led innovation community powered by Microsoft Learn Student Ambassadors. Mission, vision, and how we grow through technology.',
    keywords: 'about MSP, MSP Tech Club, MIU tech club, Microsoft Learn Student Ambassadors'
  },
  '/meet-the-board': {
    title: 'Meet the Board | MSP Tech Club — MIU',
    description: 'Meet the MSP Tech Club board at Misr International University — the students leading our community.',
    keywords: 'MSP board, MIU student board, tech club leadership'
  },
  '/events': {
    title: 'Events & Sessions | MSP Tech Club — MIU',
    description:
      'Upcoming MSP Tech Club events, workshops, sessions, and hackathons at MIU. Join tech talks, hands-on workshops, and community gatherings.',
    keywords: 'MSP events, MIU workshops, hackathons, tech sessions'
  },
  '/courses': {
    title: 'Courses | MSP Tech Club — MIU',
    description: 'Browse MSP Tech Club courses — structured lessons, videos, and materials for students at MIU.',
    keywords: 'MSP courses, MIU tech courses, student workshops'
  },
  '/competitions': {
    title: 'Competitions | MSP Tech Club — MIU',
    description:
      'MSP Tech Club competitions and challenges. Showcase your skills, compete with peers, and win prizes.',
    keywords: 'MSP competitions, coding challenges, hackathons, MIU'
  },
  '/sponsors': {
    title: 'Sponsors | MSP Tech Club — MIU',
    description: 'Partners and sponsors supporting MSP Tech Club at Misr International University.',
    keywords: 'MSP sponsors, MIU partners'
  },
  '/become-member': {
    title: 'Become a Member | MSP Tech Club — MIU',
    description: 'Apply to join MSP Tech Club at MIU and grow your technical and leadership skills.',
    keywords: 'join MSP, MIU tech club membership'
  },
  '/download-android': {
    title: 'Download the Android App | MSP Tech Club — MIU',
    description: 'Get the official MSP Tech Club Android app for events, courses, and community updates.',
    keywords: 'MSP Android app, MIU tech club app'
  },
  '/suggestions': {
    title: 'Suggestions | MSP Tech Club — MIU',
    description: 'Share ideas and feedback with MSP Tech Club at MIU.',
    keywords: 'MSP suggestions, feedback'
  },
  '/privacy': {
    title: 'Privacy Policy | MSP Tech Club — MIU',
    description:
      'Privacy Policy for MSP Tech Club at Misr International University — how we collect, use, and protect your information on our website and Android app.',
    keywords: 'MSP privacy policy, MIU tech club privacy, data protection'
  },
  '/faqs': {
    title: 'FAQs | MSP Tech Club — MIU',
    description:
      'Frequently asked questions about MSP Tech Club at MIU — membership, events, courses, competitions, and the Android app.',
    keywords: 'MSP FAQ, MIU tech club questions, MSP membership'
  },
  '/leaderboard': {
    title: 'Leaderboard | MSP Tech Club — MIU',
    description: 'See how members rank across MSP Tech Club activities at MIU.',
    keywords: 'MSP leaderboard'
  },
  '/exercises': {
    title: 'Exercises | MSP Tech Club — MIU',
    description: 'Practice exercises from MSP Tech Club at Misr International University.',
    keywords: 'MSP exercises'
  }
};

const NOINDEX_PREFIXES = [
  '/admin',
  '/profile',
  '/login',
  '/quizpage',
  '/attendance-request',
  '/attendance-review',
  '/reset-password',
  '/account-activation',
  '/accept-team-invitation',
  '/api'
];

function getSiteUrl() {
  const raw = process.env.WEBSITE_URL || process.env.FRONTEND_URL || DEFAULT_SITE_URL;
  return String(raw).replace(/\/+$/, '');
}

function getDefaultOgImage() {
  const siteUrl = getSiteUrl();
  if (process.env.OG_IMAGE_URL) return process.env.OG_IMAGE_URL;
  return `${siteUrl}/og-image.png`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text, max = 200) {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function normalizePath(pathname) {
  if (!pathname) return '/';
  const noQuery = String(pathname).split('?')[0];
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1);
  return noQuery || '/';
}

function isNoindexPath(pathname) {
  const p = normalizePath(pathname).toLowerCase();
  return NOINDEX_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function toAbsoluteUrl(value, siteUrl) {
  if (!value) return getDefaultOgImage();
  if (isHttpUrl(value)) return value;
  const pathPart = value.startsWith('/') ? value : `/${value}`;
  return `${siteUrl}${pathPart}`;
}

function upsertMeta(html, attr, key, content) {
  if (content == null || content === '') return html;
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertTitle(html, title) {
  if (!title) return html;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  }
  return html.replace(/<\/head>/i, `    <title>${escapeHtml(title)}</title>\n  </head>`);
}

function upsertCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  if (/<link[^>]+rel=["']canonical["'][^>]*>/i.test(html)) {
    return html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, tag);
  }
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertJsonLd(html, data) {
  if (!data) return html;
  const tag = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  if (/<script type="application\/ld\+json">[\s\S]*?<\/script>/i.test(html)) {
    return html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, tag);
  }
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function organizationJsonLd(siteUrl, image) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'MSP Tech Club — MIU',
    alternateName: [
      'MSP - MIU',
      'Microsoft Student Partners - Misr International University',
      'MSP Tech Club at MIU'
    ],
    url: siteUrl,
    logo: image,
    image,
    description: DEFAULT_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'EG',
      addressLocality: 'Cairo'
    },
    sameAs: [
      'https://www.instagram.com/mspmiu',
      'https://www.tiktok.com/@mspmiu',
      'https://www.linkedin.com/company/mspmiu'
    ],
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: 'Misr International University'
    },
    memberOf: {
      '@type': 'Organization',
      name: 'Microsoft Learn Student Ambassadors'
    }
  };
}

function applyMetaToHtml(html, seo) {
  const {
    title,
    description,
    keywords,
    url,
    image,
    type = 'website',
    noindex = false,
    structuredData
  } = seo;

  let next = html;
  next = upsertTitle(next, title);
  next = upsertMeta(next, 'name', 'title', title);
  next = upsertMeta(next, 'name', 'description', description);
  next = upsertMeta(next, 'name', 'keywords', keywords);
  next = upsertMeta(
    next,
    'name',
    'robots',
    noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  );
  next = upsertCanonical(next, url);

  next = upsertMeta(next, 'property', 'og:type', type);
  next = upsertMeta(next, 'property', 'og:url', url);
  next = upsertMeta(next, 'property', 'og:title', title);
  next = upsertMeta(next, 'property', 'og:description', description);
  next = upsertMeta(next, 'property', 'og:image', image);
  next = upsertMeta(next, 'property', 'og:image:secure_url', image);
  next = upsertMeta(next, 'property', 'og:image:type', String(image || '').toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg');
  next = upsertMeta(next, 'property', 'og:image:alt', 'MSP Tech Club — MIU');
  next = upsertMeta(next, 'property', 'og:image:width', '1080');
  next = upsertMeta(next, 'property', 'og:image:height', '1080');
  next = upsertMeta(next, 'property', 'og:site_name', 'MSP Tech Club — MIU');
  next = upsertMeta(next, 'property', 'og:locale', 'en_US');

  next = upsertMeta(next, 'name', 'twitter:card', 'summary_large_image');
  next = upsertMeta(next, 'name', 'twitter:url', url);
  next = upsertMeta(next, 'name', 'twitter:title', title);
  next = upsertMeta(next, 'name', 'twitter:description', description);
  next = upsertMeta(next, 'name', 'twitter:image', image);
  next = upsertMeta(next, 'name', 'twitter:image:alt', 'MSP Tech Club — MIU');
  next = upsertMeta(next, 'name', 'twitter:site', '@mspmiu');

  next = upsertJsonLd(next, structuredData);
  return next;
}

async function resolveDynamicSeo(pathname) {
  const siteUrl = getSiteUrl();
  const defaultImage = getDefaultOgImage();
  const matchEvent = pathname.match(/^\/events\/(\d+)$/i);
  const matchCourse = pathname.match(/^\/courses\/(\d+)$/i);
  const matchCompetition = pathname.match(/^\/competitions\/(\d+)$/i);

  if (!matchEvent && !matchCourse && !matchCompetition) return null;

  try {
    const { Event, Course, Competition } = require('../models');

    if (matchEvent) {
      const event = await Event.findByPk(matchEvent[1]);
      if (!event) return null;
      const title = `${event.name} | MSP Events`;
      const description = truncate(event.description || `Join ${event.name} with MSP Tech Club at MIU.`);
      const image = toAbsoluteUrl(event.main_image, siteUrl);
      return {
        title,
        description,
        keywords: `MSP event, ${event.name}, ${event.category || 'event'}, MIU`,
        url: `${siteUrl}/events/${event.event_id}`,
        image,
        type: 'article',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.name,
          description,
          startDate: event.event_date,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled',
          image: [image],
          location: {
            '@type': 'Place',
            name: event.location || 'Misr International University',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Cairo',
              addressCountry: 'EG'
            }
          },
          organizer: {
            '@type': 'Organization',
            name: 'MSP Tech Club — MIU',
            url: siteUrl
          }
        }
      };
    }

    if (matchCourse) {
      const course = await Course.findByPk(matchCourse[1]);
      if (!course || course.status === 'draft') return null;
      const title = `${course.title} | MSP Courses`;
      const description = truncate(course.description || `Learn ${course.title} with MSP Tech Club at MIU.`);
      const image = toAbsoluteUrl(course.thumbnail_url, siteUrl);
      return {
        title,
        description,
        keywords: `MSP course, ${course.title}, MIU`,
        url: `${siteUrl}/courses/${course.course_id}`,
        image,
        type: 'article',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: course.title,
          description,
          image,
          provider: {
            '@type': 'Organization',
            name: 'MSP Tech Club — MIU',
            url: siteUrl
          }
        }
      };
    }

    if (matchCompetition) {
      const competition = await Competition.findByPk(matchCompetition[1]);
      if (!competition) return null;
      const title = `${competition.title} | MSP Competitions`;
      const description = truncate(
        competition.description || `Compete in ${competition.title} with MSP Tech Club at MIU.`
      );
      return {
        title,
        description,
        keywords: `MSP competition, ${competition.title}, MIU`,
        url: `${siteUrl}/competitions/${competition.competition_id}`,
        image: defaultImage,
        type: 'website',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: competition.title,
          description,
          startDate: competition.start_at,
          endDate: competition.end_at,
          image: [defaultImage],
          organizer: {
            '@type': 'Organization',
            name: 'MSP Tech Club — MIU',
            url: siteUrl
          }
        }
      };
    }
  } catch (err) {
    logger.error('[seo] Failed to resolve dynamic preview:', { message: err.message });
  }

  return null;
}

async function resolveSeoForPath(reqPath) {
  const siteUrl = getSiteUrl();
  const pathname = normalizePath(reqPath);
  const defaultImage = getDefaultOgImage();
  const lookupKey = pathname.toLowerCase() === '/meet-the-board' ? '/meet-the-board' : pathname;
  const staticPage = STATIC_PAGES[lookupKey] || STATIC_PAGES[pathname];

  const base = {
    title: staticPage ? staticPage.title : DEFAULT_TITLE,
    description: staticPage ? staticPage.description : DEFAULT_DESCRIPTION,
    keywords: staticPage ? staticPage.keywords : DEFAULT_KEYWORDS,
    url: `${siteUrl}${pathname === '/' ? '/' : pathname}`,
    image: defaultImage,
    type: 'website',
    noindex: isNoindexPath(pathname),
    structuredData: organizationJsonLd(siteUrl, defaultImage)
  };

  if (base.noindex) {
    base.title = base.title.includes('MSP') ? base.title : `${base.title} | MSP Tech Club — MIU`;
    return base;
  }

  const dynamic = await resolveDynamicSeo(pathname);
  if (dynamic) {
    return {
      ...base,
      ...dynamic,
      image: dynamic.image || defaultImage
    };
  }

  return base;
}

function buildRobotsTxt() {
  const siteUrl = getSiteUrl();
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /profile',
    'Disallow: /login',
    'Disallow: /quizpage',
    'Disallow: /reset-password',
    'Disallow: /account-activation',
    'Disallow: /attendance-request',
    'Disallow: /attendance-review',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n');
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildSitemapXml() {
  const siteUrl = getSiteUrl();
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${siteUrl}/about`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${siteUrl}/Meet-the-board`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${siteUrl}/events`, changefreq: 'daily', priority: '0.9' },
    { loc: `${siteUrl}/courses`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${siteUrl}/competitions`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${siteUrl}/sponsors`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${siteUrl}/become-member`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${siteUrl}/download-android`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${siteUrl}/privacy`, changefreq: 'yearly', priority: '0.4' },
    { loc: `${siteUrl}/faqs`, changefreq: 'monthly', priority: '0.6' }
  ];

  try {
    const { Event, Course, Competition } = require('../models');
    const { Op } = require('sequelize');

    const [events, courses, competitions] = await Promise.all([
      Event.findAll({ attributes: ['event_id', 'created_at'], order: [['event_id', 'DESC']], limit: 500 }),
      Course.findAll({
        attributes: ['course_id', 'created_at'],
        where: { status: { [Op.in]: ['coming_soon', 'published'] } },
        order: [['course_id', 'DESC']],
        limit: 500
      }),
      Competition.findAll({
        attributes: ['competition_id', 'created_at'],
        order: [['competition_id', 'DESC']],
        limit: 500
      })
    ]);

    events.forEach((event) => {
      urls.push({
        loc: `${siteUrl}/events/${event.event_id}`,
        lastmod: event.created_at ? new Date(event.created_at).toISOString().slice(0, 10) : today,
        changefreq: 'weekly',
        priority: '0.7'
      });
    });
    courses.forEach((course) => {
      urls.push({
        loc: `${siteUrl}/courses/${course.course_id}`,
        lastmod: course.created_at ? new Date(course.created_at).toISOString().slice(0, 10) : today,
        changefreq: 'weekly',
        priority: '0.7'
      });
    });
    competitions.forEach((competition) => {
      urls.push({
        loc: `${siteUrl}/competitions/${competition.competition_id}`,
        lastmod: competition.created_at ? new Date(competition.created_at).toISOString().slice(0, 10) : today,
        changefreq: 'weekly',
        priority: '0.6'
      });
    });
  } catch (err) {
    logger.error('[seo] Sitemap dynamic URLs skipped:', { message: err.message });
  }

  const body = urls
    .map((entry) => {
      const lastmod = entry.lastmod || today;
      return [
        '  <url>',
        `    <loc>${xmlEscape(entry.loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>'
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

const OG_IMAGE_PATH = path.join(__dirname, '..', 'seo', 'msp-miu-logo.png');

function sendOgImage(req, res) {
  if (!fs.existsSync(OG_IMAGE_PATH)) {
    return res.status(404).type('text/plain').send('Not found');
  }
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Type', 'image/png');
  return res.sendFile(OG_IMAGE_PATH);
}

module.exports = {
  DEFAULT_SITE_URL,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  getDefaultOgImage,
  resolveSeoForPath,
  applyMetaToHtml,
  buildRobotsTxt,
  buildSitemapXml,
  sendOgImage,
  OG_IMAGE_PATH
};

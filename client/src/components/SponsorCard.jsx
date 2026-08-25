import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiExternalLink } from 'react-icons/fi';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
  FaYoutube,
  FaTiktok,
  FaGithub,
  FaDiscord,
  FaTelegram,
  FaWhatsapp,
  FaGlobe
} from 'react-icons/fa6';

const SOCIAL_ICON_MAP = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  linkedin: FaLinkedinIn,
  x: FaXTwitter,
  twitter: FaXTwitter,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  github: FaGithub,
  discord: FaDiscord,
  telegram: FaTelegram,
  whatsapp: FaWhatsapp,
  website: FaGlobe
};

function tierToModifier(tier) {
  if (!tier || typeof tier !== 'string') return 'default';
  const s = tier
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (!s) return 'default';
  const known = ['platinum', 'gold', 'silver', 'bronze', 'partner', 'supporter'];
  if (known.includes(s)) return s;
  return 'custom';
}

function formatTierLabel(tier) {
  if (!tier || typeof tier !== 'string') return '';
  return tier.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toTitle(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeSocialLinks(rawValue) {
  if (!rawValue) return [];

  let parsed = rawValue;
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      try {
        const maybeJson = trimmed
          .replace(/:\s*([a-zA-Z_][\w-]*)\s*(?=[,}\]])/g, ': "$1"')
          .replace(/:\s*(https?:\/\/[^,\]\}"]+)\s*(?=[,}\]])/g, ': "$1"');
        parsed = JSON.parse(maybeJson);
      } catch {
        return [];
      }
    }
  }

  const items = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const platform = String(item.platform || item.name || '').trim().toLowerCase();
      const url = String(item.url || item.link || '').trim();
      if (!platform || !url) continue;
      items.push({ platform, url, label: item.label ? String(item.label).trim() : '' });
    }
  } else if (parsed && typeof parsed === 'object') {
    for (const [platformKey, urlValue] of Object.entries(parsed)) {
      const platform = String(platformKey || '').trim().toLowerCase();
      const url = String(urlValue || '').trim();
      if (!platform || !url) continue;
      items.push({ platform, url, label: '' });
    }
  } else {
    return [];
  }

  const unique = new Map();
  for (const item of items) {
    let safeUrl;
    try {
      safeUrl = new URL(item.url);
    } catch {
      continue;
    }
    if (safeUrl.protocol !== 'http:' && safeUrl.protocol !== 'https:') continue;
    if (!unique.has(item.platform)) {
      unique.set(item.platform, {
        platform: item.platform,
        url: safeUrl.toString(),
        label: item.label || toTitle(item.platform)
      });
    }
  }

  return Array.from(unique.values());
}

export default function SponsorCard({ sponsor, seasonBadge = null }) {
  const {
    sponsor_id: id,
    name,
    logo_url: logoUrl,
    website_url: websiteUrl,
    social_links: socialLinksRaw,
    tagline,
    description,
    tier
  } = sponsor;

  const mod = tierToModifier(tier);
  const tierLabel = formatTierLabel(tier);
  const socialLinks = useMemo(() => normalizeSocialLinks(socialLinksRaw), [socialLinksRaw]);

  const [open, setOpen] = useState(false);
  const detailsId = `sponsor-details-${id}`;

  return (
    <li className={`SponsorsPage__card SponsorsPage__card--${mod}`}>
      <article className="SponsorsPage__article" aria-labelledby={`sponsor-title-${id}`}>
        <button
          type="button"
          className="SponsorsPage__summaryBtn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailsId}
        >
          <div className="SponsorsPage__summaryLeft">
            {tierLabel ? (
              <span className="SponsorsPage__tierBadge">{tierLabel}</span>
            ) : (
              <span className="SponsorsPage__tierBadge SponsorsPage__tierBadge--ghost">Sponsor</span>
            )}
          </div>
          <div className="SponsorsPage__summaryMain">
            <div className="SponsorsPage__logoZone SponsorsPage__logoZone--compact">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="SponsorsPage__logo" loading="lazy" />
              ) : (
                <span className="SponsorsPage__logoPlaceholder" aria-hidden>
                  {name?.charAt(0) || '?'}
                </span>
              )}
            </div>
            <div className="SponsorsPage__headline">
              <h2 id={`sponsor-title-${id}`} className="SponsorsPage__name">
                {name}
                {seasonBadge ? <> {' '}{seasonBadge}</> : null}
              </h2>
              {tagline ? <p className="SponsorsPage__tagline">{tagline}</p> : null}
            </div>
          </div>
          <span className={`SponsorsPage__chev ${open ? 'is-open' : ''}`} aria-hidden>
            <FiChevronDown />
          </span>
        </button>

        <div id={detailsId} className={`SponsorsPage__details ${open ? 'is-open' : ''}`}>
          {description ? <p className="SponsorsPage__description">{description}</p> : null}

          <div className="SponsorsPage__detailsRow">
            {socialLinks.length > 0 ? (
              <div className="SponsorsPage__socials" aria-label={`${name} social links`}>
                {socialLinks.map((item) => {
                  const Icon = SOCIAL_ICON_MAP[item.platform] || FaGlobe;
                  return (
                    <a
                      key={`${id}-${item.platform}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="SponsorsPage__socialLink"
                      aria-label={`${name} on ${item.label} (opens in new tab)`}
                      title={item.label}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon aria-hidden />
                    </a>
                  );
                })}
              </div>
            ) : null}

            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="SponsorsPage__cta"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Visit website</span>
                <FiExternalLink className="SponsorsPage__ctaIcon" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}


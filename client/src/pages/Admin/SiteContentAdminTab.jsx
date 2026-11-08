import React, { useCallback, useEffect, useState } from 'react';
import { MdArticle, MdRefresh, MdAdd, MdDelete, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import {
  FaFire,
  FaCalendarAlt,
  FaUserPlus,
  FaTrophy,
  FaStar,
  FaRocket,
  FaComments,
  FaBullhorn,
  FaExternalLinkAlt,
  FaArrowRight
} from 'react-icons/fa';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';

const SECTIONS = [
  { key: 'hero', label: 'Home hero' },
  { key: 'about', label: 'About page' },
  { key: 'footer', label: 'Footer & socials' },
  { key: 'seo', label: 'SEO defaults' },
  { key: 'imagine_cup', label: 'Imagine Cup section' },
  { key: 'gallery', label: 'Gallery titles' },
  { key: 'recruitment', label: 'Membership recruitment' },
  { key: 'lookups', label: 'Faculties / years / depts display' },
  { key: 'privacy_policy', label: 'Privacy Policy' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'linktree', label: 'Linktree & Promotional Links' },
];

function newFaqId() {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function FaqsEditor({ value, onChange }) {
  const items = Array.isArray(value?.items) ? value.items : [];

  const patch = (next) => onChange({ ...value, ...next });

  const updateItem = (index, field, fieldValue) => {
    const nextItems = items.map((item, i) =>
      i === index ? { ...item, [field]: fieldValue } : item
    );
    patch({ items: nextItems });
  };

  const addItem = () => {
    patch({
      items: [
        ...items,
        { id: newFaqId(), question: '', answer: '' }
      ]
    });
  };

  const removeItem = (index) => {
    patch({ items: items.filter((_, i) => i !== index) });
  };

  const moveItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const [removed] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, removed);
    patch({ items: nextItems });
  };

  return (
    <div className="SiteContentStructured">
      <div className="AdminPanel__formGroup">
        <label htmlFor="faqs-page-title">Page title</label>
        <input
          id="faqs-page-title"
          type="text"
          value={value?.pageTitle || ''}
          onChange={(e) => patch({ pageTitle: e.target.value })}
        />
      </div>
      <div className="AdminPanel__formGroup">
        <label htmlFor="faqs-subtitle">Subtitle</label>
        <textarea
          id="faqs-subtitle"
          rows={2}
          value={value?.subtitle || ''}
          onChange={(e) => patch({ subtitle: e.target.value })}
        />
      </div>

      <div className="SiteContentStructured__listHeader">
        <h3 className="SiteContentStructured__listTitle">Questions ({items.length})</h3>
        <button type="button" className="AdminPanel__addBtn" onClick={addItem}>
          <MdAdd /> Add FAQ
        </button>
      </div>

      {items.length === 0 ? (
        <p className="AdminPanel__empty">No FAQs yet. Add one to get started.</p>
      ) : (
        <div className="SiteContentStructured__cards">
          {items.map((item, index) => (
            <div key={item.id || index} className="SiteContentStructured__card">
              <div className="SiteContentStructured__cardToolbar">
                <span className="SiteContentStructured__cardIndex">#{index + 1}</span>
                <div className="SiteContentStructured__cardActions">
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    title="Move up"
                    aria-label="Move FAQ up"
                  >
                    <MdArrowUpward />
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    title="Move down"
                    aria-label="Move FAQ down"
                  >
                    <MdArrowDownward />
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--danger"
                    onClick={() => removeItem(index)}
                    title="Delete"
                    aria-label="Delete FAQ"
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>
              <div className="AdminPanel__formGroup">
                <label htmlFor={`faq-q-${index}`}>Question</label>
                <input
                  id={`faq-q-${index}`}
                  type="text"
                  value={item.question || ''}
                  onChange={(e) => updateItem(index, 'question', e.target.value)}
                />
              </div>
              <div className="AdminPanel__formGroup">
                <label htmlFor={`faq-a-${index}`}>Answer</label>
                <textarea
                  id={`faq-a-${index}`}
                  rows={4}
                  value={item.answer || ''}
                  onChange={(e) => updateItem(index, 'answer', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrivacyPolicyEditor({ value, onChange }) {
  const sections = Array.isArray(value?.sections) ? value.sections : [];

  const patch = (next) => onChange({ ...value, ...next });

  const updateSection = (index, field, fieldValue) => {
    const nextSections = sections.map((section, i) =>
      i === index ? { ...section, [field]: fieldValue } : section
    );
    patch({ sections: nextSections });
  };

  const addSection = () => {
    patch({ sections: [...sections, { heading: '', body: '' }] });
  };

  const removeSection = (index) => {
    patch({ sections: sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const nextSections = [...sections];
    const [removed] = nextSections.splice(index, 1);
    nextSections.splice(target, 0, removed);
    patch({ sections: nextSections });
  };

  return (
    <div className="SiteContentStructured">
      <div className="AdminPanel__formGroup">
        <label htmlFor="privacy-title">Page title</label>
        <input
          id="privacy-title"
          type="text"
          value={value?.pageTitle || ''}
          onChange={(e) => patch({ pageTitle: e.target.value })}
        />
      </div>
      <div className="AdminPanel__formGroup">
        <label htmlFor="privacy-subtitle">Subtitle</label>
        <textarea
          id="privacy-subtitle"
          rows={2}
          value={value?.subtitle || ''}
          onChange={(e) => patch({ subtitle: e.target.value })}
        />
      </div>
      <div className="AdminPanel__formGroup">
        <label htmlFor="privacy-updated">Last updated (YYYY-MM-DD)</label>
        <input
          id="privacy-updated"
          type="text"
          value={value?.lastUpdated || ''}
          onChange={(e) => patch({ lastUpdated: e.target.value })}
        />
      </div>
      <div className="AdminPanel__formGroup">
        <label htmlFor="privacy-intro">Introduction</label>
        <textarea
          id="privacy-intro"
          rows={4}
          value={value?.intro || ''}
          onChange={(e) => patch({ intro: e.target.value })}
        />
      </div>

      <div className="SiteContentStructured__listHeader">
        <h3 className="SiteContentStructured__listTitle">Sections ({sections.length})</h3>
        <button type="button" className="AdminPanel__addBtn" onClick={addSection}>
          <MdAdd /> Add section
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="AdminPanel__empty">No sections yet.</p>
      ) : (
        <div className="SiteContentStructured__cards">
          {sections.map((section, index) => (
            <div key={`privacy-section-${index}`} className="SiteContentStructured__card">
              <div className="SiteContentStructured__cardToolbar">
                <span className="SiteContentStructured__cardIndex">#{index + 1}</span>
                <div className="SiteContentStructured__cardActions">
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    aria-label="Move section up"
                  >
                    <MdArrowUpward />
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    aria-label="Move section down"
                  >
                    <MdArrowDownward />
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--danger"
                    onClick={() => removeSection(index)}
                    aria-label="Delete section"
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>
              <div className="AdminPanel__formGroup">
                <label htmlFor={`privacy-h-${index}`}>Heading</label>
                <input
                  id={`privacy-h-${index}`}
                  type="text"
                  value={section.heading || ''}
                  onChange={(e) => updateSection(index, 'heading', e.target.value)}
                />
              </div>
              <div className="AdminPanel__formGroup">
                <label htmlFor={`privacy-b-${index}`}>Body</label>
                <textarea
                  id={`privacy-b-${index}`}
                  rows={5}
                  value={section.body || ''}
                  onChange={(e) => updateSection(index, 'body', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecruitmentEditor({ value, onChange }) {
  const patch = (next) => onChange({ ...value, ...next });

  return (
    <div className="SiteContentStructured">
      <div className="AdminPanel__formGroup">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={value?.enabled !== false}
            onChange={(e) => patch({ enabled: e.target.checked })}
            style={{ width: 18, height: 18 }}
          />
          <span>Recruitment is Open (Accept applications on Become a Member page)</span>
        </label>
        <small style={{ display: 'block', marginTop: 4, color: 'rgba(197, 218, 233, 0.7)' }}>
          When unchecked, visitors will see the closed notice and will be directed to follow the Instagram page.
        </small>
      </div>

      <div className="AdminPanel__formGroup">
        <label htmlFor="recruitment-closed-title">Closed Screen Title</label>
        <input
          id="recruitment-closed-title"
          type="text"
          value={value?.title || ''}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Recruitment is Currently Closed"
        />
      </div>

      <div className="AdminPanel__formGroup">
        <label htmlFor="recruitment-closed-subtitle">Closed Screen Subtitle</label>
        <input
          id="recruitment-closed-subtitle"
          type="text"
          value={value?.subtitle || ''}
          onChange={(e) => patch({ subtitle: e.target.value })}
          placeholder="Thank you for your interest in joining MSP Tech Club at MIU."
        />
      </div>

      <div className="AdminPanel__formGroup">
        <label htmlFor="recruitment-closed-message">Closed Notice / Instructions</label>
        <textarea
          id="recruitment-closed-message"
          rows={4}
          value={value?.closedMessage || ''}
          onChange={(e) => patch({ closedMessage: e.target.value })}
          placeholder="Registrations are currently closed. Please wait until recruitment is available! Follow our Instagram page to know when recruitment opens."
        />
      </div>

      <div className="AdminPanel__formGroup">
        <label htmlFor="recruitment-instagram-url">Instagram Page URL</label>
        <input
          id="recruitment-instagram-url"
          type="url"
          value={value?.instagramUrl || ''}
          onChange={(e) => patch({ instagramUrl: e.target.value })}
          placeholder="https://www.instagram.com/mspmiu"
        />
      </div>
    </div>
  );
}

const ICON_OPTIONS = [
  { value: 'fire', label: '🔥 Fire / Trending' },
  { value: 'calendar', label: '📅 Calendar / Event' },
  { value: 'user-plus', label: '👤 Member / Registration' },
  { value: 'trophy', label: '🏆 Trophy / Competition' },
  { value: 'star', label: '⭐ Star / Featured' },
  { value: 'rocket', label: '🚀 Rocket / Launch' },
  { value: 'comments', label: '💬 Discussion / Form' },
  { value: 'bullhorn', label: '📢 Announcement' },
  { value: 'link', label: '🔗 General Link' }
];

function renderAdminIcon(key) {
  switch (key) {
    case 'fire':
      return <FaFire />;
    case 'calendar':
      return <FaCalendarAlt />;
    case 'trophy':
      return <FaTrophy />;
    case 'star':
      return <FaStar />;
    case 'rocket':
      return <FaRocket />;
    case 'comments':
      return <FaComments />;
    case 'bullhorn':
      return <FaBullhorn />;
    case 'link':
      return <FaExternalLinkAlt />;
    case 'user-plus':
    default:
      return <FaUserPlus />;
  }
}

function LinktreeEditor({ value, onChange }) {
  const highlight = value?.highlight || {};
  const promotionalLinks = Array.isArray(value?.promotionalLinks) ? value.promotionalLinks : [];

  const patch = (next) => onChange({ ...value, ...next });
  const patchHighlight = (patchObj) => {
    patch({ highlight: { ...highlight, ...patchObj } });
  };

  const isCustom = highlight.mode === 'custom';

  const resetToBecomeMember = () => {
    patchHighlight({
      enabled: true,
      mode: 'default',
      sectionBadge: 'Member Applications',
      sectionTitle: 'Join MSP Tech Club',
      badge: 'Official Registration',
      highlightBadge: 'Open to All MIU Students',
      title: 'Become a Member — Apply Now',
      description: 'Join our Software Dev, AI, Cyber Security, Technical Training, Media, PR & Event Planning teams.',
      buttonText: 'Start Application',
      url: '/become-member',
      icon: 'user-plus',
      isExternal: false
    });
  };

  const loadEventExample = () => {
    patchHighlight({
      enabled: true,
      mode: 'custom',
      sectionBadge: 'Featured Event',
      sectionTitle: 'Special Workshop & Hackathon',
      badge: 'Featured Event',
      highlightBadge: 'Limited Seats',
      title: 'MSP AI & Cloud Hackathon 2026',
      description: 'Join our hands-on 48-hour challenge at MIU Campus. Team up with fellow engineers, build innovative solutions, and win prizes!',
      buttonText: 'Register for Hackathon',
      url: 'https://forms.gle/sample-event-registration',
      icon: 'fire',
      isExternal: true
    });
  };

  const addPromoLink = () => {
    patch({
      promotionalLinks: [
        ...promotionalLinks,
        {
          id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: '',
          description: '',
          url: '',
          buttonText: 'Visit Link',
          badge: 'Announcement',
          icon: 'star',
          isExternal: true
        }
      ]
    });
  };

  const updatePromoLink = (index, field, fieldValue) => {
    const nextLinks = promotionalLinks.map((item, i) =>
      i === index ? { ...item, [field]: fieldValue } : item
    );
    patch({ promotionalLinks: nextLinks });
  };

  const removePromoLink = (index) => {
    patch({ promotionalLinks: promotionalLinks.filter((_, i) => i !== index) });
  };

  const movePromoLink = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= promotionalLinks.length) return;
    const nextLinks = [...promotionalLinks];
    const [removed] = nextLinks.splice(index, 1);
    nextLinks.splice(target, 0, removed);
    patch({ promotionalLinks: nextLinks });
  };

  const promoteToHighlight = (item) => {
    patchHighlight({
      enabled: true,
      mode: 'custom',
      sectionBadge: 'Featured Event',
      sectionTitle: 'Special Announcement',
      badge: item.badge || 'Featured',
      highlightBadge: 'Hot',
      title: item.title,
      description: item.description,
      buttonText: item.buttonText || 'Learn More',
      url: item.url,
      icon: item.icon || 'star',
      isExternal: item.isExternal ?? true
    });
  };

  const previewIcon = renderAdminIcon(highlight.icon || (isCustom ? 'fire' : 'user-plus'));

  return (
    <div className="SiteContentStructured">
      <div className="LinktreeAdmin__presets">
        <span className="LinktreeAdmin__presetsLabel">Quick Presets:</span>
        <button
          type="button"
          className="AdminPanel__actionBtn"
          onClick={resetToBecomeMember}
          title="Restore standard Become a Member recruitment button"
        >
          <FaUserPlus /> Become a Member Default
        </button>
        <button
          type="button"
          className="AdminPanel__actionBtn"
          onClick={loadEventExample}
          title="Load sample Hackathon / Workshop event promotion"
        >
          <FaFire /> Sample Event Promotion
        </button>
      </div>

      <div className="AdminPanel__formGroup">
        <label style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
          Highlighted Spotlight Card Mode
        </label>
        <div className="LinktreeAdmin__modeSelector">
          <button
            type="button"
            className={`LinktreeAdmin__modeBtn ${!isCustom ? 'LinktreeAdmin__modeBtn--active' : ''}`}
            onClick={() => patchHighlight({ mode: 'default' })}
          >
            <FaUserPlus /> Become a Member (Default)
          </button>
          <button
            type="button"
            className={`LinktreeAdmin__modeBtn ${isCustom ? 'LinktreeAdmin__modeBtn--active' : ''}`}
            onClick={() => patchHighlight({ mode: 'custom' })}
          >
            <FaStar /> Custom Event / Promotional Link
          </button>
        </div>
      </div>

      <div className="AdminPanel__formGroup">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={highlight.enabled !== false}
            onChange={(e) => patchHighlight({ enabled: e.target.checked })}
            style={{ width: 18, height: 18 }}
          />
          <span>Show Highlighted Spotlight Card on Linktree (/links)</span>
        </label>
        <small style={{ display: 'block', marginTop: 4, color: 'rgba(197, 218, 233, 0.7)' }}>
          When active, this spotlight card appears at the very top of the Linktree above social channels.
        </small>
      </div>

      <div className="LinktreeAdmin__previewWrap">
        <div className="LinktreeAdmin__previewTitle">
          <FaBullhorn /> Live Preview on /links:
        </div>
        <div className="LinktreeAdmin__previewCard">
          <div className="LinktreeAdmin__previewContent">
            <div className="LinktreeAdmin__previewIconBox">
              {previewIcon}
            </div>
            <div className="LinktreeAdmin__previewText">
              {(highlight.badge || highlight.highlightBadge) && (
                <div className="LinktreeAdmin__previewBadgeRow">
                  {highlight.badge && (
                    <span className="LinktreeAdmin__previewPill">{highlight.badge}</span>
                  )}
                  {highlight.highlightBadge && (
                    <span className="LinktreeAdmin__previewPill LinktreeAdmin__previewPill--highlight">
                      {highlight.highlightBadge}
                    </span>
                  )}
                </div>
              )}
              <h4 className="LinktreeAdmin__previewCardTitle">
                {highlight.title || (isCustom ? 'Your Promotional Title Here' : 'Become a Member — Apply Now')}
              </h4>
              <p className="LinktreeAdmin__previewCardDesc">
                {highlight.description || (isCustom ? 'Your promotional description goes here...' : 'Join our Software Dev, AI, Cyber Security...')}
              </p>
            </div>
          </div>
          <div className="LinktreeAdmin__previewCtaRow">
            <span className="LinktreeAdmin__previewCtaBtn">
              <span>{highlight.buttonText || (isCustom ? 'Explore Event' : 'Start Application')}</span>
              {highlight.isExternal ? <FaExternalLinkAlt /> : <FaArrowRight />}
            </span>
          </div>
        </div>
        <div className="LinktreeAdmin__previewDest">
          Destination: <strong>{highlight.url || (isCustom ? '#' : '/become-member')}</strong> {highlight.isExternal ? '(Opens in new tab)' : '(Internal route)'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-title">Highlighted Title *</label>
          <input
            id="hl-title"
            type="text"
            value={highlight.title || ''}
            onChange={(e) => patchHighlight({ title: e.target.value })}
            placeholder="e.g. AI & Cloud Hackathon 2026"
            required
          />
        </div>

        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-url">Button Target Link (URL) *</label>
          <input
            id="hl-url"
            type="text"
            value={highlight.url || ''}
            onChange={(e) => {
              const val = e.target.value;
              const isExt = /^https?:\/\//i.test(val);
              patchHighlight({
                url: val,
                isExternal: isExt ? true : highlight.isExternal
              });
            }}
            placeholder="e.g. https://forms.gle/... or /events"
            required
          />
        </div>
      </div>

      <div className="AdminPanel__formGroup">
        <label htmlFor="hl-desc">Description (below title)</label>
        <textarea
          id="hl-desc"
          rows={3}
          value={highlight.description || ''}
          onChange={(e) => patchHighlight({ description: e.target.value })}
          placeholder="Brief summary or invitation for students to click and participate..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-btn-text">Button CTA Label</label>
          <input
            id="hl-btn-text"
            type="text"
            value={highlight.buttonText || ''}
            onChange={(e) => patchHighlight({ buttonText: e.target.value })}
            placeholder="e.g. Register Now"
          />
        </div>

        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-icon">Card Icon</label>
          <select
            id="hl-icon"
            className="AdminPanel__filterSelect"
            style={{ width: '100%', height: 42 }}
            value={highlight.icon || (isCustom ? 'fire' : 'user-plus')}
            onChange={(e) => patchHighlight({ icon: e.target.value })}
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-badge">Left Badge Pill</label>
          <input
            id="hl-badge"
            type="text"
            value={highlight.badge || ''}
            onChange={(e) => patchHighlight({ badge: e.target.value })}
            placeholder="e.g. Featured Event"
          />
        </div>

        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-highlight-badge">Right Highlight Pill</label>
          <input
            id="hl-highlight-badge"
            type="text"
            value={highlight.highlightBadge || ''}
            onChange={(e) => patchHighlight({ highlightBadge: e.target.value })}
            placeholder="e.g. Open to All MIU Students"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-section-badge">Section Badge</label>
          <input
            id="hl-section-badge"
            type="text"
            value={highlight.sectionBadge || ''}
            onChange={(e) => patchHighlight({ sectionBadge: e.target.value })}
            placeholder="e.g. Member Applications or Featured Event"
          />
        </div>

        <div className="AdminPanel__formGroup">
          <label htmlFor="hl-section-title">Section Header Title</label>
          <input
            id="hl-section-title"
            type="text"
            value={highlight.sectionTitle || ''}
            onChange={(e) => patchHighlight({ sectionTitle: e.target.value })}
            placeholder="e.g. Join MSP Tech Club or Featured Spotlight"
          />
        </div>
      </div>

      <div className="AdminPanel__formGroup">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!highlight.isExternal}
            onChange={(e) => patchHighlight({ isExternal: e.target.checked })}
            style={{ width: 16, height: 16 }}
          />
          <span>Open link in new browser tab (target="_blank")</span>
        </label>
      </div>

      <div className="SiteContentStructured__listHeader" style={{ marginTop: 24, borderTop: '1px solid rgba(74, 166, 255, 0.15)', paddingTop: 18 }}>
        <div>
          <h3 className="SiteContentStructured__listTitle">
            Additional Promotional Links ({promotionalLinks.length})
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'rgba(197, 218, 233, 0.7)' }}>
            Add more promotional links or active events. You can promote any link to the top highlight with 1 click.
          </p>
        </div>
        <button type="button" className="AdminPanel__addBtn" onClick={addPromoLink}>
          <MdAdd /> Add Promotional Link
        </button>
      </div>

      {promotionalLinks.length === 0 ? (
        <p className="AdminPanel__empty">No additional promotional links added. Click &ldquo;Add Promotional Link&rdquo; to create one.</p>
      ) : (
        <div className="SiteContentStructured__cards">
          {promotionalLinks.map((item, index) => (
            <div key={item.id || index} className="SiteContentStructured__card">
              <div className="SiteContentStructured__cardToolbar">
                <span className="SiteContentStructured__cardIndex">
                  #{index + 1} &middot; {item.title || 'Untitled Promotional Link'}
                </span>
                <div className="SiteContentStructured__cardActions">
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--highlight"
                    onClick={() => promoteToHighlight(item)}
                    title="Set this link as the top highlighted card"
                  >
                    <FaStar /> Set as Highlighted
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    onClick={() => movePromoLink(index, -1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <MdArrowUpward />
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    onClick={() => movePromoLink(index, 1)}
                    disabled={index === promotionalLinks.length - 1}
                    title="Move down"
                  >
                    <MdArrowDownward />
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--danger"
                    onClick={() => removePromoLink(index)}
                    title="Delete promotional link"
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div className="AdminPanel__formGroup">
                  <label htmlFor={`promo-t-${index}`}>Title</label>
                  <input
                    id={`promo-t-${index}`}
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => updatePromoLink(index, 'title', e.target.value)}
                    placeholder="e.g. Cybersecurity CTF 2026"
                  />
                </div>

                <div className="AdminPanel__formGroup">
                  <label htmlFor={`promo-u-${index}`}>Target Link (URL)</label>
                  <input
                    id={`promo-u-${index}`}
                    type="text"
                    value={item.url || ''}
                    onChange={(e) => {
                      const u = e.target.value;
                      updatePromoLink(index, 'url', u);
                      if (/^https?:\/\//i.test(u)) updatePromoLink(index, 'isExternal', true);
                    }}
                    placeholder="https://... or /events"
                  />
                </div>
              </div>

              <div className="AdminPanel__formGroup">
                <label htmlFor={`promo-d-${index}`}>Description</label>
                <textarea
                  id={`promo-d-${index}`}
                  rows={2}
                  value={item.description || ''}
                  onChange={(e) => updatePromoLink(index, 'description', e.target.value)}
                  placeholder="Short description..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div className="AdminPanel__formGroup">
                  <label htmlFor={`promo-btn-${index}`}>Button Label</label>
                  <input
                    id={`promo-btn-${index}`}
                    type="text"
                    value={item.buttonText || ''}
                    onChange={(e) => updatePromoLink(index, 'buttonText', e.target.value)}
                    placeholder="Visit Link"
                  />
                </div>

                <div className="AdminPanel__formGroup">
                  <label htmlFor={`promo-b-${index}`}>Badge</label>
                  <input
                    id={`promo-b-${index}`}
                    type="text"
                    value={item.badge || ''}
                    onChange={(e) => updatePromoLink(index, 'badge', e.target.value)}
                    placeholder="e.g. Workshop"
                  />
                </div>

                <div className="AdminPanel__formGroup">
                  <label htmlFor={`promo-ic-${index}`}>Icon</label>
                  <select
                    id={`promo-ic-${index}`}
                    className="AdminPanel__filterSelect"
                    style={{ width: '100%', height: 42 }}
                    value={item.icon || 'star'}
                    onChange={(e) => updatePromoLink(index, 'icon', e.target.value)}
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="AdminPanel__formGroup">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={item.isExternal !== false}
                    onChange={(e) => updatePromoLink(index, 'isExternal', e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Open in new tab (external link)</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SiteContentAdminTab({ onAlert }) {
  const [section, setSection] = useState('hero');
  const [value, setValue] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [useJson, setUseJson] = useState(false);

  const isStructured = section === 'faqs' || section === 'privacy_policy' || section === 'recruitment' || section === 'linktree';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setParseError(null);
      const result = await ApiService.getSiteContentKey(section);
      const v = result?.data?.value ?? result?.data ?? {};
      setValue(v);
      setJsonText(JSON.stringify(v, null, 2));
      setUseJson(false);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load content' });
    } finally {
      setLoading(false);
    }
  }, [section, onAlert]);

  useEffect(() => {
    load();
  }, [load]);

  const onJsonChange = (text) => {
    setJsonText(text);
    try {
      setValue(JSON.parse(text));
      setParseError(null);
    } catch (e) {
      setParseError(e.message);
    }
  };

  const onStructuredChange = (next) => {
    setValue(next);
    setJsonText(JSON.stringify(next, null, 2));
    setParseError(null);
  };

  const save = async () => {
    if (parseError) {
      onAlert?.({ type: 'error', message: 'Fix JSON errors before saving' });
      return;
    }
    try {
      setSaving(true);
      await ApiService.updateSiteContent(section, value);
      onAlert?.({ type: 'success', message: `${section} saved.` });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await confirmModal({
      title: 'Reset Section Defaults?',
      message: `Reset "${section}" to default configuration? This cannot be undone.`,
      confirmText: 'Reset Section',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;
    try {
      setSaving(true);
      await ApiService.resetSiteContent(section);
      onAlert?.({ type: 'success', message: 'Reset to defaults.' });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Reset failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="AdminPanel__section">
      <div className="AdminPanel__sectionHeader">
        <h2 className="AdminPanel__sectionTitle">
          <MdArticle /> Site content
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="AdminPanel__actionBtn" onClick={reset} disabled={saving}>
            <MdRefresh /> Reset section
          </button>
          <button type="button" className="AdminPanel__addBtn" onClick={save} disabled={saving || !!parseError}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="AdminPanel__filters">
        <select
          className="AdminPanel__filterSelect"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          {SECTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        {isStructured && (
          <button
            type="button"
            className="AdminPanel__actionBtn"
            onClick={() => {
              if (!useJson) {
                setJsonText(JSON.stringify(value ?? {}, null, 2));
              }
              setUseJson((prev) => !prev);
            }}
          >
            {useJson ? 'Form editor' : 'Raw JSON'}
          </button>
        )}
      </div>

      <p style={{ opacity: 0.75, marginBottom: 12 }}>
        Edit marketing copy, footer socials, Imagine Cup form URL, About mission/vision, hero taglines,
        membership form lookups, Privacy Policy, and FAQs.
      </p>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : (
        <>
          {parseError && (
            <p className="AdminPanel__empty" role="alert" style={{ color: '#e74c3c' }}>
              JSON error: {parseError}
            </p>
          )}
          {isStructured && !useJson ? (
            section === 'faqs' ? (
              <FaqsEditor value={value || { pageTitle: '', subtitle: '', items: [] }} onChange={onStructuredChange} />
            ) : section === 'privacy_policy' ? (
              <PrivacyPolicyEditor
                value={value || { pageTitle: '', subtitle: '', lastUpdated: '', intro: '', sections: [] }}
                onChange={onStructuredChange}
              />
            ) : (
              <RecruitmentEditor
                value={value || { enabled: true, title: '', subtitle: '', closedMessage: '', instagramUrl: '' }}
                onChange={onStructuredChange}
              />
            )
          ) : (
            <textarea
              className="AdminPanel__jsonEditor"
              rows={22}
              value={jsonText}
              onChange={(e) => onJsonChange(e.target.value)}
              spellCheck={false}
            />
          )}
        </>
      )}
    </div>
  );
}

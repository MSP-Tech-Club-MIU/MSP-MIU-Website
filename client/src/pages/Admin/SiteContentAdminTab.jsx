import React, { useCallback, useEffect, useState } from 'react';
import { MdArticle, MdRefresh, MdAdd, MdDelete, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import ApiService from '../../services/api';

const SECTIONS = [
  { key: 'hero', label: 'Home hero' },
  { key: 'about', label: 'About page' },
  { key: 'footer', label: 'Footer & socials' },
  { key: 'seo', label: 'SEO defaults' },
  { key: 'imagine_cup', label: 'Imagine Cup section' },
  { key: 'gallery', label: 'Gallery titles' },
  { key: 'lookups', label: 'Faculties / years / depts display' },
  { key: 'privacy_policy', label: 'Privacy Policy' },
  { key: 'faqs', label: 'FAQs' },
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

export default function SiteContentAdminTab({ onAlert }) {
  const [section, setSection] = useState('hero');
  const [value, setValue] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [useJson, setUseJson] = useState(false);

  const isStructured = section === 'faqs' || section === 'privacy_policy';

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
    if (!window.confirm(`Reset "${section}" to defaults?`)) return;
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
            ) : (
              <PrivacyPolicyEditor
                value={value || { pageTitle: '', subtitle: '', lastUpdated: '', intro: '', sections: [] }}
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

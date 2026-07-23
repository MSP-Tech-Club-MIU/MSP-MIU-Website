import React, { useCallback, useEffect, useState } from 'react';
import { MdArticle, MdRefresh } from 'react-icons/md';
import ApiService from '../../services/api';

const SECTIONS = [
  { key: 'hero', label: 'Home hero' },
  { key: 'about', label: 'About page' },
  { key: 'footer', label: 'Footer & socials' },
  { key: 'seo', label: 'SEO defaults' },
  { key: 'imagine_cup', label: 'Imagine Cup section' },
  { key: 'gallery', label: 'Gallery titles' },
  { key: 'lookups', label: 'Faculties / years / depts display' },
];

export default function SiteContentAdminTab({ onAlert }) {
  const [section, setSection] = useState('hero');
  const [value, setValue] = useState(null);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setParseError(null);
      const result = await ApiService.getSiteContentKey(section);
      const v = result?.data?.value ?? result?.data ?? {};
      setValue(v);
      setJsonText(JSON.stringify(v, null, 2));
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
        <div style={{ display: 'flex', gap: 8 }}>
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
      </div>

      <p style={{ opacity: 0.75, marginBottom: 12 }}>
        Edit marketing copy, footer socials, Imagine Cup form URL, About mission/vision, hero taglines, and membership form lookups.
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
          <textarea
            className="AdminPanel__jsonEditor"
            rows={22}
            value={jsonText}
            onChange={(e) => onJsonChange(e.target.value)}
            spellCheck={false}
          />
        </>
      )}
    </div>
  );
}

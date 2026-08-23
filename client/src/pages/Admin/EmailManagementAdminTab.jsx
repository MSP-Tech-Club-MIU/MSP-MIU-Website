import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdEmail,
  MdRefresh,
  MdSave,
  MdSend,
  MdPeople,
  MdGroups,
  MdChat,
  MdScience,
  MdArrowBack,
  MdChevronRight,
  MdCampaign,
  MdEmojiEvents,
  MdLock,
  MdLink,
  MdPhoneAndroid,
  MdMenuBook
} from 'react-icons/md';
import ApiService from '../../services/api';
import { useSeason } from '../../context/SeasonContext';
import './EmailManagementAdminTab.css';

const CATEGORY_LABELS = {
  account: 'Account creation',
  announcement: 'Announcements',
  competition: 'Competition',
  system: 'System'
};

const CATEGORY_ORDER = ['account', 'system', 'announcement', 'competition'];

const DEFAULT_TEST_EMAIL = 'mspmiu.club1@gmail.com';

const TEMPLATE_ICONS = {
  member_activation: MdPeople,
  board_activation: MdGroups,
  member_acceptance: MdChat,
  password_reset: MdLock,
  site_announcement: MdCampaign,
  android_app_update: MdPhoneAndroid,
  competition_announcement: MdCampaign,
  team_invite_new: MdEmojiEvents,
  team_invite_existing: MdEmojiEvents,
  team_created_guest: MdEmojiEvents,
  timeslot_selection: MdEmojiEvents,
  timeslot_assigned: MdEmojiEvents,
  course_certificate: MdEmail,
  course_announcement: MdCampaign,
  course_available: MdMenuBook
};

const WHATSAPP_TEMPLATE_KEYS = new Set(['member_acceptance']);

function getEmailSubPath(pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  // ['admin', 'emails'] or ['admin', 'emails', 'member_activation']
  if (parts[0] !== 'admin' || parts[1] !== 'emails') return null;
  return parts[2] || null;
}

function TemplateEditor({
  template,
  form,
  setForm,
  saving,
  onSave,
  onReset,
  onTest,
  testEmail,
  setTestEmail,
  bulkAction,
  bulkLabel,
  bulkBusy,
  onOpenCourseCommunications
}) {
  if (!template) {
    return <div className="EmailMgmt__empty">Template not found.</div>;
  }

  const placeholders = Array.isArray(template.placeholders) ? template.placeholders : [];

  return (
    <div className="EmailMgmt__editor">
      <div className="EmailMgmt__editorHeader">
        <label className="EmailMgmt__testTo">
          <span>Send test to</span>
          <input
            type="email"
            className="EmailMgmt__input EmailMgmt__testToInput"
            value={testEmail ?? ''}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="mspmiu.club1@gmail.com"
            disabled={saving || bulkBusy}
            autoComplete="email"
          />
        </label>
        <div className="EmailMgmt__actions">
          {bulkAction && (
            <button
              type="button"
              className="AdminPanel__addBtn"
              disabled={bulkBusy || saving}
              onClick={bulkAction}
            >
              <MdSend /> {bulkLabel || 'Send'}
            </button>
          )}
          <button
            type="button"
            className="AdminPanel__actionBtn"
            disabled={saving || bulkBusy || !String(testEmail || '').trim()}
            onClick={onTest}
          >
            <MdScience /> Send test
          </button>
          <button
            type="button"
            className="AdminPanel__actionBtn"
            disabled={saving || bulkBusy}
            onClick={onReset}
          >
            <MdRefresh /> Reset default
          </button>
          <button
            type="button"
            className="AdminPanel__addBtn"
            disabled={saving || bulkBusy}
            onClick={onSave}
          >
            <MdSave /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {placeholders.length > 0 && (
        <div className="EmailMgmt__placeholders">
          <span>Placeholders:</span>
          {placeholders.map((p) => (
            <code key={p}>{`{{${p}}}`}</code>
          ))}
        </div>
      )}

      {(template.template_key === 'site_announcement' ||
        template.template_key === 'competition_announcement') && (
        <p className="EmailMgmt__hint">
          Announcement title/body still come from the announcement record. This editor changes the
          email chrome and wrapper copy around those fields.
        </p>
      )}

      {template.template_key === 'course_announcement' && (
        <div className="EmailMgmt__hint" style={{ marginBottom: '1.25rem' }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            This template formats broadcast and individual emails sent to enrolled course students. Title and message come dynamically from each announcement.
          </p>
          {onOpenCourseCommunications && (
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={onOpenCourseCommunications}
            >
              <MdCampaign style={{ marginRight: 4 }} /> Open Course Communications Console
            </button>
          )}
        </div>
      )}

      {template.template_key === 'course_certificate' && (
        <>
          <p className="EmailMgmt__hint">
            Set the course name below. Use <code>{'{{courseName}}'}</code> in the subject and body
            — it is filled automatically when certificates are sent (or overridden with the{' '}
            <code>COURSE_NAME</code> env var on CLI scripts).
          </p>
          <label className="EmailMgmt__label">
            Course name
            <input
              className="EmailMgmt__input"
              value={form.courseName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, courseName: e.target.value }))}
              placeholder="e.g. Front-End Course"
            />
          </label>
        </>
      )}

      <label className="EmailMgmt__label">
        Subject
        <input
          className="EmailMgmt__input"
          value={form.subject ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
      </label>

      <label className="EmailMgmt__label">
        Plain text
        <textarea
          className="EmailMgmt__textarea EmailMgmt__textarea--text"
          value={form.text_body ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, text_body: e.target.value }))}
          rows={12}
        />
      </label>

      <label className="EmailMgmt__label">
        HTML
        <textarea
          className="EmailMgmt__textarea EmailMgmt__textarea--html"
          value={form.html_body ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, html_body: e.target.value }))}
          rows={18}
          spellCheck={false}
        />
      </label>
    </div>
  );
}

function WhatsAppLinksPanel({
  departments,
  waDrafts,
  setWaDrafts,
  waSaving,
  onSave
}) {
  return (
    <div className="EmailMgmt__whatsapp">
      <h3>
        <MdChat /> Department WhatsApp group links
      </h3>
      <p className="EmailMgmt__hint">
        Acceptance emails insert the link for the department the member was accepted into.
      </p>
      <div className="EmailMgmt__waTable">
        {departments.map((d) => (
          <label key={d.department_id} className="EmailMgmt__waRow">
            <span>{d.name}</span>
            <input
              className="EmailMgmt__input"
              value={waDrafts[d.department_id] || ''}
              onChange={(e) =>
                setWaDrafts((prev) => ({
                  ...prev,
                  [d.department_id]: e.target.value
                }))
              }
              placeholder="https://chat.whatsapp.com/…"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className="AdminPanel__addBtn"
        disabled={waSaving}
        onClick={onSave}
      >
        <MdSave /> {waSaving ? 'Saving…' : 'Save WhatsApp links'}
      </button>
    </div>
  );
}

function applyWhatsAppPayload(payload, setters) {
  const deps = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.departments)
      ? payload.departments
      : [];
  setters.setDepartments(deps);
  setters.setWaDrafts(
    Object.fromEntries(deps.map((d) => [d.department_id, d.whatsapp_group_url || '']))
  );
}

export default function EmailManagementAdminTab({ onAlert }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { seasonFilters } = useSeason();

  const page = getEmailSubPath(location.pathname);
  const isWhatsAppPage = page === 'whatsapp';
  const selectedKey = isWhatsAppPage ? null : page;

  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    subject: '',
    html_body: '',
    text_body: '',
    courseName: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [waDrafts, setWaDrafts] = useState({});
  const [waSaving, setWaSaving] = useState(false);
  const [testEmail, setTestEmail] = useState(DEFAULT_TEST_EMAIL);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [tplRes, waRes] = await Promise.all([
        ApiService.getEmailTemplates(),
        ApiService.getDepartmentWhatsAppLinks()
      ]);
      const list = Array.isArray(tplRes?.data) ? tplRes.data : [];
      setTemplates(list);
      applyWhatsAppPayload(waRes?.data, {
        setDepartments,
        setWaDrafts
      });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load email templates' });
    } finally {
      setLoading(false);
    }
  }, [onAlert]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => (selectedKey ? templates.find((t) => t.template_key === selectedKey) || null : null),
    [templates, selectedKey]
  );

  const knownKeys = useMemo(
    () => new Set(templates.map((t) => t.template_key)),
    [templates]
  );

  useEffect(() => {
    if (!selected) return;
    const meta =
      selected.meta && typeof selected.meta === 'object' ? selected.meta : {};
    setForm({
      subject: selected.subject || '',
      html_body: selected.html_body || '',
      text_body: selected.text_body || '',
      courseName: meta.courseName || ''
    });
  }, [selected]);

  // Invalid template key → back to hub
  useEffect(() => {
    if (loading || !page || isWhatsAppPage) return;
    if (templates.length > 0 && !knownKeys.has(page)) {
      navigate('/admin/emails', { replace: true });
    }
  }, [loading, page, isWhatsAppPage, templates.length, knownKeys, navigate]);

  const groupedTemplates = useMemo(() => {
    const groups = {};
    templates.forEach((t) => {
      const cat = t.category || 'system';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return CATEGORY_ORDER.filter((c) => groups[c]?.length).map((c) => ({
      category: c,
      label: CATEGORY_LABELS[c] || c,
      items: groups[c]
    }));
  }, [templates]);

  const goHub = () => navigate('/admin/emails');
  const goTemplate = (key) => navigate(`/admin/emails/${key}`);
  const goWhatsApp = () => navigate('/admin/emails/whatsapp');

  const handleSave = async () => {
    if (!selectedKey) return;
    try {
      setSaving(true);
      const payload = {
        subject: form.subject,
        html_body: form.html_body,
        text_body: form.text_body,
        name: selected?.name
      };
      if (selectedKey === 'course_certificate') {
        payload.meta = {
          ...(selected?.meta && typeof selected.meta === 'object' ? selected.meta : {}),
          courseName: (form.courseName || '').trim() || 'Front-End Course'
        };
      }
      const result = await ApiService.updateEmailTemplate(selectedKey, payload);
      setTemplates((prev) =>
        prev.map((t) => (t.template_key === selectedKey ? result.data : t))
      );
      onAlert?.({ type: 'success', message: 'Template saved' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedKey) return;
    if (!window.confirm('Reset this template to the code default?')) return;
    try {
      setSaving(true);
      const result = await ApiService.resetEmailTemplate(selectedKey);
      setTemplates((prev) =>
        prev.map((t) => (t.template_key === selectedKey ? result.data : t))
      );
      onAlert?.({ type: 'success', message: 'Template reset to default' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Reset failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedKey) return;
    const to = String(testEmail || '').trim();
    if (!to) {
      onAlert?.({ type: 'error', message: 'Enter a test recipient email' });
      return;
    }
    try {
      setBulkBusy(true);
      const result = await ApiService.sendEmailTemplateTest(selectedKey, { to });
      onAlert?.({ type: 'success', message: result.message || `Test email sent to ${to}` });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Test send failed' });
    } finally {
      setBulkBusy(false);
    }
  };

  const summarizeSend = (summary) => {
    if (!summary) return 'Done';
    return `Sent ${summary.sent || 0}, skipped ${summary.skipped || 0}, failed ${summary.failed || 0}`;
  };

  const handleBulkMemberActivation = async () => {
    if (!window.confirm('Send activation emails to members without an active account (current season filter)?')) {
      return;
    }
    try {
      setBulkBusy(true);
      const result = await ApiService.sendEmailMemberActivation(seasonFilters);
      onAlert?.({ type: 'success', message: summarizeSend(result.data) });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Send failed' });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkBoardActivation = async () => {
    if (!window.confirm('Send board activation emails to board members without an active account (current season filter)?')) {
      return;
    }
    try {
      setBulkBusy(true);
      const result = await ApiService.sendEmailBoardActivation(seasonFilters);
      onAlert?.({ type: 'success', message: summarizeSend(result.data) });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Send failed' });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkAcceptance = async () => {
    if (!window.confirm('Send acceptance emails to members (uses department WhatsApp links, current season filter)?')) {
      return;
    }
    try {
      setBulkBusy(true);
      const result = await ApiService.sendEmailMemberAcceptance(seasonFilters);
      onAlert?.({ type: 'success', message: summarizeSend(result.data) });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Send failed' });
    } finally {
      setBulkBusy(false);
    }
  };

  const saveWhatsAppLinks = async () => {
    try {
      setWaSaving(true);
      await Promise.all(
        departments.map((d) =>
          ApiService.updateDepartmentWhatsApp(d.department_id, waDrafts[d.department_id] || null)
        )
      );
      const waRes = await ApiService.getDepartmentWhatsAppLinks();
      applyWhatsAppPayload(waRes?.data, {
        setDepartments,
        setWaDrafts
      });
      onAlert?.({ type: 'success', message: 'WhatsApp group links saved' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to save WhatsApp links' });
    } finally {
      setWaSaving(false);
    }
  };

  const bulkForKey = (key) => {
    if (key === 'member_activation') {
      return { action: handleBulkMemberActivation, label: 'Send to pending members' };
    }
    if (key === 'board_activation') {
      return { action: handleBulkBoardActivation, label: 'Send to pending board' };
    }
    if (key === 'member_acceptance') {
      return { action: handleBulkAcceptance, label: 'Send acceptance emails' };
    }
    return { action: null, label: null };
  };

  if (loading) {
    return (
      <div className="AdminPanel__section">
        <p>Loading email templates…</p>
      </div>
    );
  }

  /* ── Hub: one card per template ── */
  if (!page) {
    return (
      <div className="EmailMgmt">
        <div className="AdminPanel__section">
          <div className="AdminPanel__sectionHeader">
            <h2 className="AdminPanel__sectionTitle">
              <MdEmail /> Email management
            </h2>
          </div>
          <p className="EmailMgmt__intro">
            Choose a template to edit on its own page. Account creation emails can also send bulk
            activation or acceptance messages. WhatsApp group links are managed separately.
          </p>

          <button type="button" className="EmailMgmt__hubCard EmailMgmt__hubCard--whatsapp" onClick={goWhatsApp}>
            <span className="EmailMgmt__hubIcon">
              <MdLink />
            </span>
            <span className="EmailMgmt__hubBody">
              <strong>Department WhatsApp links</strong>
              <span>Group links used in member acceptance emails</span>
            </span>
            <MdChevronRight className="EmailMgmt__hubChevron" />
          </button>

          <button
            type="button"
            className="EmailMgmt__hubCard EmailMgmt__hubCard--whatsapp"
            style={{ marginBottom: '1.25rem' }}
            onClick={() => navigate('/admin/courses?view=announcements')}
          >
            <span className="EmailMgmt__hubIcon">
              <MdCampaign />
            </span>
            <span className="EmailMgmt__hubBody">
              <strong>Course announcements & communications</strong>
              <span>Broadcast emails or message individual students for any course</span>
            </span>
            <MdChevronRight className="EmailMgmt__hubChevron" />
          </button>
        </div>

        {groupedTemplates.map((group) => (
          <div key={group.category} className="AdminPanel__section">
            <div className="AdminPanel__sectionHeader">
              <h2 className="AdminPanel__sectionTitle">{group.label}</h2>
            </div>
            <div className="EmailMgmt__hubGrid">
              {group.items.map((t) => {
                const Icon = TEMPLATE_ICONS[t.template_key] || MdEmail;
                return (
                  <button
                    key={t.template_key}
                    type="button"
                    className="EmailMgmt__hubCard"
                    onClick={() => goTemplate(t.template_key)}
                  >
                    <span className="EmailMgmt__hubIcon">
                      <Icon />
                    </span>
                    <span className="EmailMgmt__hubBody">
                      <strong>{t.name}</strong>
                      <span>
                        <code>{t.template_key}</code>
                        {t.isDefault ? ' · default' : ''}
                      </span>
                    </span>
                    <MdChevronRight className="EmailMgmt__hubChevron" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── WhatsApp links page ── */
  if (isWhatsAppPage) {
    return (
      <div className="EmailMgmt">
        <div className="AdminPanel__section">
          <button type="button" className="EmailMgmt__back" onClick={goHub}>
            <MdArrowBack /> All email templates
          </button>
          <div className="AdminPanel__sectionHeader">
            <h2 className="AdminPanel__sectionTitle">
              <MdLink /> Department WhatsApp links
            </h2>
          </div>
          <WhatsAppLinksPanel
            departments={departments}
            waDrafts={waDrafts}
            setWaDrafts={setWaDrafts}
            waSaving={waSaving}
            onSave={saveWhatsAppLinks}
          />
        </div>
      </div>
    );
  }

  /* ── Single template page ── */
  const bulk = bulkForKey(selectedKey);
  const showWhatsAppOnPage = WHATSAPP_TEMPLATE_KEYS.has(selectedKey);
  const TemplateIcon = TEMPLATE_ICONS[selectedKey] || MdEmail;

  return (
    <div className="EmailMgmt">
      <div className="AdminPanel__section">
        <button type="button" className="EmailMgmt__back" onClick={goHub}>
          <MdArrowBack /> All email templates
        </button>
        <div className="AdminPanel__sectionHeader">
          <h2 className="AdminPanel__sectionTitle">
            <TemplateIcon /> {selected?.name || selectedKey}
          </h2>
        </div>
        <p className="EmailMgmt__meta">
          Key: <code>{selectedKey}</code>
          {selected?.isDefault ? ' · using code default' : ''}
          {showWhatsAppOnPage && (
            <>
              {' · '}
              <button type="button" className="EmailMgmt__inlineLink" onClick={goWhatsApp}>
                Edit WhatsApp links
              </button>
            </>
          )}
        </p>

        <TemplateEditor
          template={selected}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSave}
          onReset={handleReset}
          onTest={handleTest}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          bulkAction={bulk.action}
          bulkLabel={bulk.label}
          bulkBusy={bulkBusy}
          onOpenCourseCommunications={() => navigate('/admin/courses?view=announcements')}
        />

        {showWhatsAppOnPage && (
          <WhatsAppLinksPanel
            departments={departments}
            waDrafts={waDrafts}
            setWaDrafts={setWaDrafts}
            waSaving={waSaving}
            onSave={saveWhatsAppLinks}
          />
        )}
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MdEmail,
  MdSend,
  MdCampaign,
  MdPerson,
  MdGroups,
  MdRefresh,
  MdEdit,
  MdDelete,
  MdMenuBook,
  MdSearch,
  MdCheckCircle,
  MdFactCheck,
  MdArrowBack,
  MdOpenInNew,
  MdTrackChanges
} from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import EmailSendProgress from '../../components/EmailSendProgress';
import { useSeason } from '../../context/SeasonContext';
import { FormattedText, EmailComposerToolbar } from '../../utils/formatMarkdown';
import mspLogo from '../../assets/Images/msp-logo.png';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Registered Members', desc: 'Enrolled + waitlist + attended' },
  { value: 'enrolled', label: 'Enrolled Students Only', desc: 'Active approved enrollments' },
  { value: 'preordered', label: 'Waitlist / Preordered Only', desc: 'Users waiting for course release' },
  { value: 'attended', label: 'Attended Students Only', desc: 'Completed at least one session' }
];

export default function CourseEmailsAdminTab({ onAlert, onOpenJob }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { seasonFilters } = useSeason();
  const [emailSendJob, setEmailSendJob] = useState(null);

  const queryCourseId = searchParams.get('course_id')
    ? parseInt(searchParams.get('course_id'), 10)
    : null;
  const queryTargetEnrollmentId = searchParams.get('target_enrollment_id')
    ? parseInt(searchParams.get('target_enrollment_id'), 10)
    : null;
  const queryTargetType = searchParams.get('target_type') || (queryTargetEnrollmentId ? 'individual' : 'all');

  // Courses list
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(queryCourseId || null);

  // Send Mode: 'broadcast' | 'individual'
  const [sendMode, setSendMode] = useState(queryTargetType === 'individual' ? 'individual' : 'broadcast');

  // Form State
  const [form, setForm] = useState({
    title: '',
    message: '',
    target_type: queryTargetType === 'individual' ? 'individual' : (queryTargetType || 'all'),
    target_enrollment_id: queryTargetEnrollmentId ? String(queryTargetEnrollmentId) : '',
    target_email: '',
    cta_label: '',
    cta_url: '',
    send_email: true
  });

  // Students list for picker
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Recipient preview
  const [recipientPreview, setRecipientPreview] = useState({ total: 0, unsubscribedEstimate: 0, activeEstimate: 0 });
  const [previewLoading, setPreviewLoading] = useState(false);

  // Submitting & resending state
  const [submitting, setSubmitting] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const handleInsertMarkdown = (snippet) => {
    setForm((prev) => ({
      ...prev,
      message: (prev.message ? `${prev.message}\n` : '') + snippet
    }));
  };

  // Sent History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState(null);

  // Load all courses
  const loadCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const res = await ApiService.getAdminCourses({ limit: 100, ...seasonFilters });
      const list = Array.isArray(res?.data) ? res.data : [];
      setCourses(list);
      if (!selectedCourseId && list.length > 0) {
        setSelectedCourseId(list[0].course_id);
      }
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load courses' });
    } finally {
      setCoursesLoading(false);
    }
  }, [seasonFilters, selectedCourseId, onAlert]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Sync with query param course_id
  useEffect(() => {
    if (queryCourseId && queryCourseId !== selectedCourseId) {
      setSelectedCourseId(queryCourseId);
    }
  }, [queryCourseId]);

  // Load students for the selected course
  const loadStudents = useCallback(async () => {
    if (!selectedCourseId) {
      setStudents([]);
      return;
    }
    try {
      setStudentsLoading(true);
      const res = await ApiService.getCourseEnrollments({
        course_id: selectedCourseId,
        limit: 1000
      });
      setStudents(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [selectedCourseId]);

  // Load sent history for selected course
  const loadHistory = useCallback(async () => {
    if (!selectedCourseId) {
      setHistory([]);
      setHistoryPagination(null);
      return;
    }
    try {
      setHistoryLoading(true);
      const res = await ApiService.getCourseAnnouncements(selectedCourseId, {
        page: historyPage,
        limit: 10,
        includeInactive: 'true'
      });
      setHistory(Array.isArray(res?.data) ? res.data : []);
      setHistoryPagination(res?.pagination || null);
    } catch (err) {
      setHistory([]);
      setHistoryPagination(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedCourseId, historyPage]);

  useEffect(() => {
    loadStudents();
    loadHistory();
  }, [selectedCourseId, loadStudents, loadHistory]);

  // Handle sendMode changes
  const handleModeChange = (mode) => {
    setSendMode(mode);
    setForm((prev) => ({
      ...prev,
      target_type: mode === 'individual' ? 'individual' : 'all',
      target_enrollment_id: mode === 'individual' ? prev.target_enrollment_id : '',
      target_email: mode === 'individual' ? prev.target_email : ''
    }));
  };

  // Live Recipient Estimate preview
  useEffect(() => {
    if (!selectedCourseId) return;
    let cancelled = false;
    (async () => {
      try {
        setPreviewLoading(true);
        const preview = await ApiService.getCourseRecipientsPreview(selectedCourseId, {
          target_type: form.target_type,
          target_enrollment_id: form.target_enrollment_id ? parseInt(form.target_enrollment_id, 10) : undefined,
          target_email: form.target_email || undefined
        });
        if (!cancelled && preview) {
          setRecipientPreview(preview);
        }
      } catch {
        // ignore preview failure
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, form.target_type, form.target_enrollment_id, form.target_email]);

  const selectedCourse = useMemo(() => {
    return courses.find((c) => String(c.course_id) === String(selectedCourseId)) || null;
  }, [courses, selectedCourseId]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.university_id || '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const selectedStudentObj = useMemo(() => {
    if (!form.target_enrollment_id) return null;
    return students.find((s) => String(s.enrollment_id) === String(form.target_enrollment_id)) || null;
  }, [students, form.target_enrollment_id]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!selectedCourseId) {
      onAlert?.({ type: 'error', message: 'Please select a course first.' });
      return;
    }
    if (!form.title.trim()) {
      onAlert?.({ type: 'error', message: 'Email Subject / Title is required.' });
      return;
    }
    if (!form.message.trim()) {
      onAlert?.({ type: 'error', message: 'Email message content is required.' });
      return;
    }
    if (form.target_type === 'individual' && !form.target_enrollment_id && !form.target_email.trim()) {
      onAlert?.({ type: 'error', message: 'Please select an enrolled student or enter an email address.' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        target_type: form.target_type,
        target_enrollment_id: form.target_enrollment_id ? parseInt(form.target_enrollment_id, 10) : null,
        target_email: form.target_email ? form.target_email.trim() : null,
        cta_label: form.cta_label ? form.cta_label.trim() : null,
        cta_url: form.cta_url ? form.cta_url.trim() : null,
        send_email: Boolean(form.send_email)
      };

      if (editingAnnouncement) {
        await ApiService.updateCourseAnnouncement(selectedCourseId, editingAnnouncement.announcement_id, payload);
        onAlert?.({ type: 'success', message: 'Email notice updated successfully.' });
        setEditingAnnouncement(null);
      } else {
        const res = await ApiService.createCourseAnnouncement(selectedCourseId, payload);
        const job = res?.emailJob || res?.data?.emailJob || (res?.emailStats?.emailJob);
        if (job?.id) {
          if (onOpenJob) {
            onOpenJob({ id: job.id, title: form.title.trim() });
          } else {
            setEmailSendJob({ id: job.id, title: form.title.trim() });
          }
        }
        const stats = res?.emailStats;
        const msg = stats
          ? `Dispatched! (${stats.sent || 0} sent, ${stats.skipped || 0} skipped, ${stats.failed || 0} failed)`
          : 'Email message dispatched successfully!';
        onAlert?.({ type: 'success', message: msg });
      }

      setForm({
        title: '',
        message: '',
        target_type: sendMode === 'individual' ? 'individual' : 'all',
        target_enrollment_id: '',
        target_email: '',
        cta_label: '',
        cta_url: '',
        send_email: true
      });
      await loadHistory();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to send course email' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (ann) => {
    const ok = await confirmModal({
      title: 'Resend Course Emails?',
      message: `Resend emails for "${ann.title}" to target audience?`,
      confirmText: 'Yes, Resend',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;
    try {
      setResendingId(ann.announcement_id);
      const res = await ApiService.resendCourseAnnouncementEmails(selectedCourseId, ann.announcement_id);
      const job = res?.emailJob || res?.data?.emailJob || (res?.emailStats?.emailJob);
      if (job?.id) {
        if (onOpenJob) {
          onOpenJob({ id: job.id, title: ann.title });
        } else {
          setEmailSendJob({ id: job.id, title: ann.title });
        }
      }
      const stats = res?.data?.emailStats || res?.emailStats;
      const msg = stats
        ? `Emails resent! (${stats.sent || 0} sent, ${stats.skipped || 0} skipped, ${stats.failed || 0} failed)`
        : 'Announcement emails resent successfully';
      onAlert?.({ type: 'success', message: msg });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to resend announcement emails' });
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (ann) => {
    const ok = await confirmModal({
      title: 'Delete Notice?',
      message: `Are you sure you want to delete notice "${ann.title}"?`,
      confirmText: 'Delete Notice',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await ApiService.deleteCourseAnnouncement(selectedCourseId, ann.announcement_id, { hard: true });
      onAlert?.({ type: 'success', message: 'Notice deleted' });
      await loadHistory();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to delete notice' });
    }
  };

  return (
    <div className="AdminPanel__section SponsorsAdmin">
      {/* ── Page Header ── */}
      <div className="AdminPanel__sectionHeader" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="AdminPanel__sectionTitle" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MdEmail style={{ color: '#03a9f4' }} /> Course Email Dispatcher
          </h2>
          <p className="SponsorsAdmin__sectionSub">
            Compose and broadcast emails or send direct communications to students enrolled in specific courses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={() => navigate('/admin/courses')}
          >
            <MdMenuBook style={{ marginRight: 4 }} /> Manage Courses
          </button>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={() => navigate('/admin/email-tracker')}
          >
            <MdTrackChanges style={{ marginRight: 4 }} /> Email Tracker
          </button>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={() => navigate('/admin/emails')}
          >
            <MdEmail style={{ marginRight: 4 }} /> Email Templates
          </button>
        </div>
      </div>

      {/* ── Step 1: Select Course ── */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(14, 39, 68, 0.65)',
          borderRadius: '12px',
          border: '1px solid rgba(142, 194, 240, 0.22)',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#8ec2f0', marginBottom: '0.45rem', fontSize: '0.92rem' }}>
              Select Target Course
            </label>
            {coursesLoading ? (
              <div style={{ color: 'rgba(234,242,255,0.6)' }}>Loading courses…</div>
            ) : courses.length === 0 ? (
              <div style={{ color: '#ffb74d' }}>No courses found. Create a course first.</div>
            ) : (
              <select
                className="AdminPanel__input"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '8px',
                  background: 'rgba(10, 28, 49, 0.95)',
                  color: '#fff',
                  border: '1px solid rgba(142,194,240,0.35)',
                  fontSize: '0.95rem'
                }}
                value={selectedCourseId || ''}
                onChange={(e) => {
                  const cid = parseInt(e.target.value, 10);
                  setSelectedCourseId(cid);
                  setSearchParams({ course_id: String(cid) }, { replace: true });
                }}
              >
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.title} [{c.status.toUpperCase()}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedCourse && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(3, 28, 53, 0.6)', padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid rgba(142,194,240,0.15)' }}>
              <img
                src={selectedCourse.thumbnail_url || mspLogo}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', background: '#0a1d33' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{selectedCourse.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(234,242,255,0.7)', display: 'flex', gap: '0.75rem', marginTop: 2 }}>
                  <span>Status: <strong>{selectedCourse.status}</strong></span>
                  <span>Roster: <strong>{students.length} students</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Choose Sending Mode & Audience ── */}
      <div
        style={{
          padding: '1.5rem',
          background: 'rgba(14, 39, 68, 0.5)',
          borderRadius: '12px',
          border: '1px solid rgba(142, 194, 240, 0.2)',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(142, 194, 240, 0.15)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => handleModeChange('broadcast')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: `1px solid ${sendMode === 'broadcast' ? '#03a9f4' : 'rgba(142,194,240,0.2)'}`,
              background: sendMode === 'broadcast' ? 'rgba(3, 169, 244, 0.2)' : 'rgba(255,255,255,0.04)',
              color: sendMode === 'broadcast' ? '#fff' : 'rgba(234, 242, 255, 0.75)',
              fontWeight: sendMode === 'broadcast' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.92rem'
            }}
          >
            <MdGroups style={{ fontSize: '1.2rem', color: sendMode === 'broadcast' ? '#03a9f4' : 'inherit' }} />
            Broadcast to Course Audience
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('individual')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: `1px solid ${sendMode === 'individual' ? '#03a9f4' : 'rgba(142,194,240,0.2)'}`,
              background: sendMode === 'individual' ? 'rgba(3, 169, 244, 0.2)' : 'rgba(255,255,255,0.04)',
              color: sendMode === 'individual' ? '#fff' : 'rgba(234, 242, 255, 0.75)',
              fontWeight: sendMode === 'individual' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.92rem'
            }}
          >
            <MdPerson style={{ fontSize: '1.2rem', color: sendMode === 'individual' ? '#03a9f4' : 'inherit' }} />
            Direct Message to Student
          </button>
        </div>

        {/* Mode A: Broadcast Audience Selector */}
        {sendMode === 'broadcast' && (
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#eaf2ff', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
              Select Broadcast Group
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {AUDIENCE_OPTIONS.map((opt) => {
                const active = form.target_type === opt.value;
                return (
                  <label
                    key={opt.value}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      background: active ? 'rgba(3, 169, 244, 0.18)' : 'rgba(10, 28, 49, 0.7)',
                      border: `1px solid ${active ? '#03a9f4' : 'rgba(142, 194, 240, 0.2)'}`,
                      color: active ? '#fff' : 'rgba(234, 242, 255, 0.8)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
                      <input
                        type="radio"
                        name="broadcast_scope"
                        value={opt.value}
                        checked={active}
                        onChange={(e) => setForm((s) => ({ ...s, target_type: e.target.value }))}
                        style={{ margin: 0 }}
                      />
                      {opt.label}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(197, 218, 233, 0.7)', marginLeft: '1.4rem' }}>
                      {opt.desc}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode B: Individual Student Picker */}
        {sendMode === 'individual' && (
          <div style={{ padding: '1.15rem', background: 'rgba(10, 28, 49, 0.75)', borderRadius: '10px', border: '1px solid rgba(3, 169, 244, 0.35)', marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, color: '#8ec2f0', display: 'block', marginBottom: '0.5rem', fontSize: '0.92rem' }}>
              Search and Select Enrolled Student
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Filter by name, ID or email…"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem 0.6rem 2.2rem',
                    borderRadius: '6px',
                    background: 'rgba(14,39,68,0.85)',
                    border: '1px solid rgba(142,194,240,0.3)',
                    color: '#fff'
                  }}
                />
                <MdSearch style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: 'rgba(142,194,240,0.7)', fontSize: '1.1rem' }} />
              </div>

              <select
                value={form.target_enrollment_id}
                onChange={(e) => {
                  const selId = e.target.value;
                  const st = students.find((s) => String(s.enrollment_id) === String(selId));
                  setForm((prev) => ({
                    ...prev,
                    target_enrollment_id: selId,
                    target_email: st?.email || ''
                  }));
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  background: 'rgba(14,39,68,0.85)',
                  border: '1px solid rgba(142,194,240,0.3)',
                  color: '#fff'
                }}
              >
                <option value="">-- Choose enrolled student ({filteredStudents.length} matches) --</option>
                {filteredStudents.map((st) => (
                  <option key={st.enrollment_id} value={st.enrollment_id}>
                    {st.full_name} ({st.university_id || 'No ID'}) — {st.email} [{st.status}]
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'rgba(234,242,255,0.75)' }}>
              <span>Or enter recipient email directly:</span>
              <input
                type="email"
                placeholder="student@miuegypt.edu.eg"
                value={form.target_email}
                onChange={(e) => setForm((prev) => ({ ...prev, target_email: e.target.value }))}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '4px',
                  background: 'rgba(14,39,68,0.85)',
                  border: '1px solid rgba(142,194,240,0.3)',
                  color: '#fff',
                  minWidth: '240px'
                }}
              />
            </div>

            {selectedStudentObj && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.85rem', borderRadius: '6px', background: 'rgba(3,169,244,0.12)', border: '1px solid rgba(3,169,244,0.25)', fontSize: '0.82rem', color: '#eaf2ff' }}>
                👤 Selected: <strong>{selectedStudentObj.full_name}</strong> · ID: <strong>{selectedStudentObj.university_id || 'N/A'}</strong> · Phone: <strong>{selectedStudentObj.phone_number || 'N/A'}</strong> · Status: <strong>{selectedStudentObj.status}</strong>
              </div>
            )}
          </div>
        )}

        {/* Live Recipient Count Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="AdminPanel__badge AdminPanel__badge--info" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
            {previewLoading
              ? 'Calculating estimated audience…'
              : `👥 Audience: ${recipientPreview.total || 0} recipient(s) · ${recipientPreview.activeEstimate || 0} active email inboxes (${recipientPreview.unsubscribedEstimate || 0} unsubscribed)`}
          </span>
        </div>
      </div>

      {/* ── Step 3: Message & Email Composer ── */}
      <form onSubmit={handleSubmit} style={{ padding: '1.5rem', background: 'rgba(14, 39, 68, 0.6)', borderRadius: '12px', border: '1px solid rgba(142, 194, 240, 0.22)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#8ec2f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdSend /> {editingAnnouncement ? 'Edit Course Notice & Email' : 'Compose Email Message'}
          </h3>

          <span style={{ fontSize: '0.8rem', color: 'rgba(142, 194, 240, 0.8)' }}>
            Placeholders: <code>{'{{studentName}}'}</code>, <code>{'{{courseTitle}}'}</code>, <code>{'{{learnUrl}}'}</code>
          </span>
        </div>

        {/* Subject */}
        <div className="AdminPanel__formGroup" style={{ marginBottom: '1.15rem' }}>
          <label style={{ fontWeight: 600, color: '#eaf2ff', marginBottom: '0.4rem', display: 'block' }}>
            Email Subject / Announcement Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Important: Project Guidelines and Materials Released"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.7rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(10, 28, 49, 0.9)',
              border: '1px solid rgba(142,194,240,0.3)',
              color: '#fff',
              fontSize: '0.95rem'
            }}
          />
        </div>

        {/* Message Body */}
        <div className="AdminPanel__formGroup" style={{ marginBottom: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontWeight: 600, color: '#eaf2ff', margin: 0 }}>
              Email Body Content * (supports plain text, markdown & highlighted event details)
            </label>
            <span style={{ fontSize: '0.78rem', color: form.message.length >= 4000 ? '#ef5350' : 'rgba(142, 194, 240, 0.7)' }}>
              {form.message.length}/4000
            </span>
          </div>

          <EmailComposerToolbar
            onInsert={handleInsertMarkdown}
            isPreview={previewMode}
            onTogglePreview={() => setPreviewMode((p) => !p)}
          />

          {previewMode ? (
            <div className="FormattedText__livePreviewBox">
              {form.message.trim() ? (
                <FormattedText text={form.message} />
              ) : (
                <div className="FormattedText__livePreviewEmpty">
                  Type your message or use the toolbar to insert formatted event details.
                </div>
              )}
            </div>
          ) : (
            <textarea
              required
              rows={8}
              maxLength={4000}
              placeholder={`Dear {{studentName}},\n\nPlease review the updated syllabus and submission deadline for {{courseTitle}}.\n\n**Date:** 25/08/2026\n**Time:** 1:00–3:00 PM sharp\n**Session:** Introduction to Cybersecurity\n**Presented by:** MSP Cybersecurity Team\n\nBest regards,\nMSP Tech Club Team`}
              value={form.message}
              onChange={(e) => setForm((s) => ({ ...s, message: e.target.value.slice(0, 4000) }))}
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                background: 'rgba(10, 28, 49, 0.9)',
                border: '1px solid rgba(142,194,240,0.3)',
                color: '#fff',
                fontSize: '0.95rem',
                lineHeight: 1.55,
                resize: 'vertical'
              }}
            />
          )}
        </div>

        {/* Call to action button */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="AdminPanel__formGroup">
            <label style={{ fontSize: '0.85rem', color: 'rgba(234,242,255,0.85)', marginBottom: '0.35rem', display: 'block' }}>
              Action Button Label (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. View Course Lessons"
              value={form.cta_label}
              onChange={(e) => setForm((s) => ({ ...s, cta_label: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(10, 28, 49, 0.9)',
                border: '1px solid rgba(142,194,240,0.3)',
                color: '#fff'
              }}
            />
          </div>
          <div className="AdminPanel__formGroup">
            <label style={{ fontSize: '0.85rem', color: 'rgba(234,242,255,0.85)', marginBottom: '0.35rem', display: 'block' }}>
              Action Button URL (Optional — defaults to course auto-login magic link)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.cta_url}
              onChange={(e) => setForm((s) => ({ ...s, cta_url: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(10, 28, 49, 0.9)',
                border: '1px solid rgba(142,194,240,0.3)',
                color: '#fff'
              }}
            />
          </div>
        </div>

        {/* Delivery options and Submit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid rgba(142,194,240,0.15)', paddingTop: '1.25rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#eaf2ff', cursor: 'pointer', fontSize: '0.92rem' }}>
            <input
              type="checkbox"
              checked={form.send_email}
              onChange={(e) => setForm((s) => ({ ...s, send_email: e.target.checked }))}
            />
            <span>Send personalized email notification to inboxes</span>
          </label>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {editingAnnouncement && (
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={() => {
                  setEditingAnnouncement(null);
                  setForm({
                    title: '',
                    message: '',
                    target_type: sendMode === 'individual' ? 'individual' : 'all',
                    target_enrollment_id: '',
                    target_email: '',
                    cta_label: '',
                    cta_url: '',
                    send_email: true
                  });
                }}
              >
                Cancel Edit
              </button>
            )}

            <button
              type="submit"
              className="AdminPanel__addBtn"
              disabled={submitting}
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
            >
              <MdSend /> {submitting ? 'Sending Message…' : editingAnnouncement ? 'Save Changes' : sendMode === 'individual' ? 'Send Message to Student' : 'Broadcast to Course Audience'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Step 4: Sent Course Communications History ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#8ec2f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MdCampaign /> Sent Course Communications Log ({historyPagination?.total ?? history.length})
          </h3>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={loadHistory}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <MdRefresh style={{ marginRight: 4 }} /> Refresh Log
          </button>
        </div>

        {historyLoading ? (
          <div className="AdminPanel__empty"><p>Loading communications log…</p></div>
        ) : history.length === 0 ? (
          <div className="AdminPanel__empty SponsorsAdmin__empty">
            <MdCampaign />
            <p>No emails or announcements sent for this course yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {history.map((ann) => (
              <div
                key={ann.announcement_id}
                style={{
                  padding: '1.25rem 1.5rem',
                  background: 'rgba(14, 39, 68, 0.65)',
                  borderRadius: '12px',
                  border: '1px solid rgba(142, 194, 240, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>{ann.title}</h4>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(234, 242, 255, 0.65)', marginTop: '0.25rem' }}>
                      Sent by <strong>{ann.creator?.full_name || 'Admin'}</strong> · {new Date(ann.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="AdminPanel__badge AdminPanel__badge--info">
                      Target: {ann.target_type === 'individual' ? (ann.targetEnrollment ? `Student: ${ann.targetEnrollment.full_name}` : ann.target_email || 'Individual') : ann.target_type}
                    </span>
                    {ann.send_email && (
                      <span className="AdminPanel__badge AdminPanel__badge--approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MdCheckCircle /> Email Dispatched
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ margin: 0, color: 'rgba(234, 242, 255, 0.9)', whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: '0.93rem' }}>
                  {ann.message}
                </p>

                {ann.cta_url && (
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'rgba(234,242,255,0.7)', marginRight: 6 }}>Action Button:</span>
                    <a
                      href={ann.cta_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#03a9f4', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      {ann.cta_label || ann.cta_url} <MdOpenInNew style={{ verticalAlign: 'middle', fontSize: '0.9rem' }} />
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                    onClick={() => {
                      setEditingAnnouncement(ann);
                      setSendMode(ann.target_type === 'individual' ? 'individual' : 'broadcast');
                      setForm({
                        title: ann.title || '',
                        message: ann.message || '',
                        target_type: ann.target_type || 'all',
                        target_enrollment_id: ann.target_enrollment_id ? String(ann.target_enrollment_id) : '',
                        target_email: ann.target_email || '',
                        cta_label: ann.cta_label || '',
                        cta_url: ann.cta_url || '',
                        send_email: Boolean(ann.send_email)
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <MdEdit /> Edit
                  </button>

                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                    disabled={resendingId === ann.announcement_id}
                    onClick={() => handleResend(ann)}
                  >
                    <MdRefresh /> {resendingId === ann.announcement_id ? 'Resending…' : 'Resend Emails'}
                  </button>

                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                    onClick={() => handleDelete(ann)}
                  >
                    <MdDelete /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {historyPagination && historyPagination.totalPages > 1 && (
          <Pagination
            pagination={historyPagination}
            onPageChange={setHistoryPage}
          />
        )}
      </div>

      {emailSendJob && (
        <EmailSendProgress
          jobId={emailSendJob.id}
          title={emailSendJob.title}
          onClear={() => setEmailSendJob(null)}
        />
      )}
    </div>
  );
}

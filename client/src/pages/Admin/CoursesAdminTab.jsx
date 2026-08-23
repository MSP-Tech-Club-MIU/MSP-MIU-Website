import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MdAdd,
  MdClose,
  MdCloudUpload,
  MdMenuBook,
  MdOpenInNew,
  MdImage,
  MdFactCheck,
  MdArrowBack,
  MdDelete,
  MdEdit,
  MdPublish,
  MdAttachFile,
  MdCampaign,
  MdEmail,
  MdSend,
  MdRefresh
} from 'react-icons/md';
import { FiDownload } from 'react-icons/fi';
import ApiService from '../../services/api';
import Pagination from '../../components/Pagination';
import SeasonBadge from '../../components/SeasonBadge';
import { useSeason } from '../../context/SeasonContext';
import mspLogo from '../../assets/Images/msp-logo.png';
import CourseAttendanceTab from './CourseAttendanceTab';

const PAGE_SIZE = 6;
const ENROLL_PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'coming_soon', label: 'Coming soon' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' }
];

const MATERIAL_TYPES = ['youtube', 'document', 'zip', 'code', 'other'];

const emptyCourseForm = () => ({
  title: '',
  description: '',
  thumbnail_url: '',
  status: 'draft',
  max_attendance: ''
});

export default function CoursesAdminTab({ onAlert }) {
  const { seasonFilters, isAll, selectedSeasonId } = useSeason();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'list';
  const contentId = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;
  const enrollCourseId = searchParams.get('course_id')
    ? parseInt(searchParams.get('course_id'), 10)
    : contentId;

  const setView = useCallback(
    (next, extra = {}) => {
      const params = {};
      if (next && next !== 'list') params.view = next;
      Object.entries(extra).forEach(([k, v]) => {
        if (v != null && v !== '') params[k] = String(v);
      });
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  // ---- List state ----
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCourseForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);

  const loadList = useCallback(async () => {
    const isPageChange = hasLoadedOnceRef.current;
    try {
      if (isPageChange) setPageLoading(true);
      else setInitialLoading(true);
      const result = await ApiService.getAdminCourses({
        page,
        limit: PAGE_SIZE,
        ...seasonFilters
      });
      setItems(Array.isArray(result.data) ? result.data : []);
      setPagination(result.pagination || null);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load courses' });
    } finally {
      setInitialLoading(false);
      setPageLoading(false);
    }
  }, [page, seasonFilters, onAlert]);

  useEffect(() => {
    if (view === 'list') loadList();
  }, [view, loadList]);

  useEffect(() => {
    setPage(1);
  }, [seasonFilters]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCourseForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || '',
      description: row.description || '',
      thumbnail_url: row.thumbnail_url || '',
      status: row.status || 'draft',
      max_attendance: row.max_attendance !== null && row.max_attendance !== undefined ? String(row.max_attendance) : ''
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || uploadingImage) return;
    setModalOpen(false);
  };

  const saveCourse = async () => {
    if (!form.title.trim()) {
      onAlert?.({ type: 'error', message: 'Title is required' });
      return;
    }
    setSaving(true);
    try {
      const parsedMax = form.max_attendance !== '' && form.max_attendance !== null && !isNaN(Number(form.max_attendance))
        ? Math.max(0, parseInt(form.max_attendance, 10))
        : null;

      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        thumbnail_url: form.thumbnail_url || null,
        season_id: selectedSeasonId || undefined,
        max_attendance: parsedMax
      };
      if (editing) {
        await ApiService.updateCourse(editing.course_id, payload);
        if (form.status !== editing.status) {
          await ApiService.updateCourseStatus(editing.course_id, form.status);
        }
        onAlert?.({ type: 'success', message: 'Course updated' });
      } else {
        const created = await ApiService.createCourse({ ...payload, status: form.status });
        if (form.thumbnail_url && created?.course_id && form.thumbnail_url.includes('blob:')) {
          // noop — thumbnail uploaded after create via content view
        }
        onAlert?.({ type: 'success', message: 'Course created' });
      }
      setModalOpen(false);
      await loadList();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const uploadThumbnailFor = async (courseId, file) => {
    setUploadingImage(true);
    try {
      const result = await ApiService.uploadFile(file, 'courses', {
        course_id: courseId,
        kind: 'thumbnail'
      });
      await ApiService.updateCourse(courseId, { thumbnail_url: result.url });
      setForm((f) => ({ ...f, thumbnail_url: result.url }));
      onAlert?.({ type: 'success', message: 'Thumbnail uploaded' });
      return result.url;
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Upload failed' });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const onThumbPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (editing?.course_id) {
      await uploadThumbnailFor(editing.course_id, file);
    } else {
      // Create first, then upload
      if (!form.title.trim()) {
        onAlert?.({ type: 'error', message: 'Set a title before uploading a thumbnail' });
        return;
      }
      setSaving(true);
      try {
        const created = await ApiService.createCourse({
          title: form.title.trim(),
          description: form.description || null,
          status: form.status,
          season_id: selectedSeasonId || undefined
        });
        setEditing(created);
        await uploadThumbnailFor(created.course_id, file);
        onAlert?.({ type: 'success', message: 'Course created with thumbnail' });
        await loadList();
      } catch (err) {
        onAlert?.({ type: 'error', message: err.message || 'Failed' });
      } finally {
        setSaving(false);
      }
    }
  };

  const removeCourse = async (row) => {
    if (!window.confirm(`Delete course "${row.title}"?`)) return;
    try {
      await ApiService.deleteCourse(row.course_id);
      onAlert?.({ type: 'success', message: 'Course deleted' });
      await loadList();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  // ---- Content editor state ----
  const [courseDetail, setCourseDetail] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '' });
  const [materialForm, setMaterialForm] = useState({
    lesson_id: null,
    title: '',
    material_type: 'youtube',
    youtube_url: '',
    file_url: '',
    file_name: ''
  });
  const materialFileRef = useRef(null);

  const loadContent = useCallback(async () => {
    if (!contentId) return;
    setContentLoading(true);
    try {
      const data = await ApiService.getCourseById(contentId, { admin: true });
      setCourseDetail(data);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load course' });
    } finally {
      setContentLoading(false);
    }
  }, [contentId, onAlert]);

  useEffect(() => {
    if (view === 'content') loadContent();
  }, [view, loadContent]);

  const addLesson = async () => {
    if (!lessonForm.title.trim()) return;
    try {
      await ApiService.createCourseLesson(contentId, {
        title: lessonForm.title.trim(),
        description: lessonForm.description || null
      });
      setLessonForm({ title: '', description: '' });
      await loadContent();
      onAlert?.({ type: 'success', message: 'Lesson added' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to add lesson' });
    }
  };

  const removeLesson = async (lesson) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    try {
      await ApiService.deleteCourseLesson(contentId, lesson.lesson_id);
      await loadContent();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed' });
    }
  };

  const publishStatus = async (status) => {
    try {
      const result = await ApiService.updateCourseStatus(contentId, status);
      onAlert?.({
        type: 'success',
        message: result.notify
          ? `Published. Notified ${result.notify.sent || 0} registrant(s).`
          : `Status set to ${status}`
      });
      await loadContent();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Status update failed' });
    }
  };

  const addMaterial = async (lessonIdOverride) => {
    const lessonId = lessonIdOverride || materialForm.lesson_id;
    if (!lessonId || !materialForm.title.trim()) {
      onAlert?.({ type: 'error', message: 'Lesson and title required' });
      return;
    }
    try {
      const payload = {
        title: materialForm.title.trim(),
        material_type: materialForm.material_type,
        youtube_url: materialForm.material_type === 'youtube' ? materialForm.youtube_url : null,
        file_url: materialForm.material_type !== 'youtube' ? materialForm.file_url : null,
        file_name: materialForm.file_name || null
      };
      await ApiService.createCourseMaterial(contentId, lessonId, payload);
      setMaterialForm({
        lesson_id: lessonId,
        title: '',
        material_type: 'youtube',
        youtube_url: '',
        file_url: '',
        file_name: ''
      });
      await loadContent();
      onAlert?.({ type: 'success', message: 'Material added' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to add material' });
    }
  };

  const uploadMaterialFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !materialForm.lesson_id) {
      onAlert?.({ type: 'error', message: 'Select a lesson first' });
      return;
    }
    try {
      const result = await ApiService.uploadFile(file, 'courses', {
        course_id: contentId,
        lesson_id: materialForm.lesson_id,
        kind: 'material'
      });
      setMaterialForm((f) => ({
        ...f,
        file_url: result.url,
        file_name: result.file_name || file.name,
        title: f.title || file.name,
        material_type: file.name.endsWith('.zip')
          ? 'zip'
          : /\.(js|ts|py|sh|sql|md|txt)$/i.test(file.name)
            ? 'code'
            : 'document'
      }));
      onAlert?.({ type: 'success', message: 'File uploaded to R2' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Upload failed' });
    }
  };

  const removeMaterial = async (lessonId, material) => {
    if (!window.confirm(`Delete material "${material.title}"?`)) return;
    try {
      await ApiService.deleteCourseMaterial(contentId, lessonId, material.material_id);
      await loadContent();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed' });
    }
  };

  // ---- Enrollments ----
  const [enrollments, setEnrollments] = useState([]);
  const [enrollPage, setEnrollPage] = useState(1);
  const [enrollPagination, setEnrollPagination] = useState(null);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const loadEnrollments = useCallback(async () => {
    setEnrollLoading(true);
    try {
      const result = await ApiService.getCourseEnrollments({
        page: enrollPage,
        limit: ENROLL_PAGE_SIZE,
        course_id: enrollCourseId || undefined
      });
      setEnrollments(Array.isArray(result.data) ? result.data : []);
      setEnrollPagination(result.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load enrollments' });
    } finally {
      setEnrollLoading(false);
    }
  }, [enrollPage, enrollCourseId, onAlert]);

  useEffect(() => {
    if (view === 'enrollments') loadEnrollments();
  }, [view, loadEnrollments]);

  const exportCsv = async () => {
    try {
      const blob = await ApiService.exportCourseEnrollmentsCsv(enrollCourseId || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course_enrollments_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Export failed' });
    }
  };

  // ---- Announcements state ----
  const targetEnrollmentFromQuery = searchParams.get('target_enrollment_id')
    ? parseInt(searchParams.get('target_enrollment_id'), 10)
    : null;
  const targetTypeFromQuery = searchParams.get('target_type') || 'all';

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [announcementsPagination, setAnnouncementsPagination] = useState(null);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [resendingAnnouncementId, setResendingAnnouncementId] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [activeAnnounceCourseId, setActiveAnnounceCourseId] = useState(enrollCourseId || null);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    target_type: targetTypeFromQuery,
    target_enrollment_id: targetEnrollmentFromQuery ? String(targetEnrollmentFromQuery) : '',
    target_email: '',
    cta_label: '',
    cta_url: '',
    send_email: true
  });

  const [courseStudents, setCourseStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [recipientPreview, setRecipientPreview] = useState({ total: 0, unsubscribedEstimate: 0, activeEstimate: 0 });
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (enrollCourseId && enrollCourseId !== activeAnnounceCourseId) {
      setActiveAnnounceCourseId(enrollCourseId);
    } else if (!activeAnnounceCourseId && items.length > 0) {
      setActiveAnnounceCourseId(items[0].course_id);
    }
  }, [enrollCourseId, items, activeAnnounceCourseId]);

  useEffect(() => {
    if (targetEnrollmentFromQuery) {
      setAnnouncementForm((prev) => ({
        ...prev,
        target_type: 'individual',
        target_enrollment_id: String(targetEnrollmentFromQuery)
      }));
    }
  }, [targetEnrollmentFromQuery]);

  const loadAnnouncements = useCallback(async () => {
    if (!activeAnnounceCourseId) return;
    try {
      setAnnouncementsLoading(true);
      const result = await ApiService.getCourseAnnouncements(activeAnnounceCourseId, {
        page: announcementsPage,
        limit: 10,
        includeInactive: 'true'
      });
      setAnnouncements(Array.isArray(result?.data) ? result.data : []);
      setAnnouncementsPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load course announcements' });
      setAnnouncements([]);
      setAnnouncementsPagination(null);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [activeAnnounceCourseId, announcementsPage, onAlert]);

  const loadCourseStudents = useCallback(async () => {
    if (!activeAnnounceCourseId) return;
    try {
      const result = await ApiService.getCourseEnrollments({
        course_id: activeAnnounceCourseId,
        limit: 500
      });
      setCourseStudents(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      setCourseStudents([]);
    }
  }, [activeAnnounceCourseId]);

  useEffect(() => {
    if (view === 'announcements') {
      loadAnnouncements();
      loadCourseStudents();
    }
  }, [view, loadAnnouncements, loadCourseStudents]);

  useEffect(() => {
    if (view !== 'announcements' || !activeAnnounceCourseId) return;
    let cancel = false;
    (async () => {
      try {
        setPreviewLoading(true);
        const preview = await ApiService.getCourseRecipientsPreview(activeAnnounceCourseId, {
          target_type: announcementForm.target_type,
          target_enrollment_id: announcementForm.target_enrollment_id ? parseInt(announcementForm.target_enrollment_id, 10) : undefined,
          target_email: announcementForm.target_email || undefined
        });
        if (!cancel && preview) {
          setRecipientPreview(preview);
        }
      } catch (err) {
        // ignore preview error
      } finally {
        if (!cancel) setPreviewLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [view, activeAnnounceCourseId, announcementForm.target_type, announcementForm.target_enrollment_id, announcementForm.target_email]);

  const submitAnnouncement = async () => {
    if (!activeAnnounceCourseId) {
      onAlert?.({ type: 'error', message: 'Please select a course first.' });
      return;
    }
    if (!announcementForm.title.trim()) {
      onAlert?.({ type: 'error', message: 'Title / Subject is required' });
      return;
    }
    if (!announcementForm.message.trim()) {
      onAlert?.({ type: 'error', message: 'Message is required' });
      return;
    }
    if (announcementForm.target_type === 'individual' && !announcementForm.target_enrollment_id && !announcementForm.target_email.trim()) {
      onAlert?.({ type: 'error', message: 'Please select or enter an individual student' });
      return;
    }

    try {
      setAnnouncementSubmitting(true);
      const payload = {
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        target_type: announcementForm.target_type,
        target_enrollment_id: announcementForm.target_enrollment_id ? parseInt(announcementForm.target_enrollment_id, 10) : null,
        target_email: announcementForm.target_email ? announcementForm.target_email.trim() : null,
        cta_label: announcementForm.cta_label ? announcementForm.cta_label.trim() : null,
        cta_url: announcementForm.cta_url ? announcementForm.cta_url.trim() : null,
        send_email: announcementForm.send_email
      };

      if (editingAnnouncement) {
        await ApiService.updateCourseAnnouncement(activeAnnounceCourseId, editingAnnouncement.announcement_id, payload);
        onAlert?.({ type: 'success', message: 'Course announcement updated' });
        setEditingAnnouncement(null);
      } else {
        const res = await ApiService.createCourseAnnouncement(activeAnnounceCourseId, payload);
        const stats = res?.emailStats;
        const msg = stats
          ? `Announcement sent! (${stats.sent || 0} delivered, ${stats.skipped || 0} skipped, ${stats.failed || 0} failed)`
          : 'Course announcement created successfully';
        onAlert?.({ type: 'success', message: msg });
      }

      setAnnouncementForm({
        title: '',
        message: '',
        target_type: 'all',
        target_enrollment_id: '',
        target_email: '',
        cta_label: '',
        cta_url: '',
        send_email: true
      });
      await loadAnnouncements();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to save announcement' });
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const handleResendEmails = async (announcement) => {
    if (!window.confirm(`Resend emails for "${announcement.title}" to targeted recipients?`)) return;
    try {
      setResendingAnnouncementId(announcement.announcement_id);
      const res = await ApiService.resendCourseAnnouncementEmails(activeAnnounceCourseId, announcement.announcement_id);
      const stats = res?.data?.emailStats;
      const msg = stats
        ? `Emails resent! (${stats.sent || 0} sent, ${stats.skipped || 0} skipped, ${stats.failed || 0} failed)`
        : 'Announcement emails resent successfully';
      onAlert?.({ type: 'success', message: msg });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to resend announcement emails' });
    } finally {
      setResendingAnnouncementId(null);
    }
  };

  const handleDeleteAnnouncement = async (announcement) => {
    if (!window.confirm(`Are you sure you want to delete "${announcement.title}"?`)) return;
    try {
      await ApiService.deleteCourseAnnouncement(activeAnnounceCourseId, announcement.announcement_id, { hard: true });
      onAlert?.({ type: 'success', message: 'Course announcement deleted' });
      await loadAnnouncements();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to delete announcement' });
    }
  };

  const busy = saving || uploadingImage;
  const previewThumb = form.thumbnail_url?.trim() || mspLogo;

  const modal = modalOpen
    ? createPortal(
        <div
          className="AdminPanel__modalOverlay SponsorsAdmin__overlay"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="AdminPanel__modalContent AdminPanel__modalContent--large SponsorsAdmin__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="courses-modal-title"
          >
            <div className="AdminPanel__modalHeader SponsorsAdmin__modalHeader">
              <div>
                <h3 id="courses-modal-title">{editing ? 'Edit course' : 'New course'}</h3>
                <p className="SponsorsAdmin__modalSub">
                  {editing
                    ? `Updating ${editing.title}`
                    : 'Create a course, then add lessons and materials from the content editor'}
                </p>
              </div>
              <button
                type="button"
                className="AdminPanel__modalClose"
                onClick={closeModal}
                aria-label="Close"
                disabled={busy}
              >
                <MdClose />
              </button>
            </div>

            <div className="SponsorsAdmin__body">
              <div className="SponsorsAdmin__logoPane">
                <div className="SponsorsAdmin__logoPreview">
                  {form.thumbnail_url ? (
                    <img src={previewThumb} alt="" />
                  ) : (
                    <div className="SponsorsAdmin__logoPlaceholder">
                      <MdImage size={32} />
                      <span>No thumbnail</span>
                    </div>
                  )}
                </div>
                <label className="SponsorsAdmin__fileBtn">
                  <MdCloudUpload />
                  {uploadingImage ? 'Uploading…' : 'Upload thumbnail'}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    onChange={onThumbPick}
                  />
                </label>
                {form.thumbnail_url ? (
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={busy}
                    onClick={() => setForm((f) => ({ ...f, thumbnail_url: '' }))}
                  >
                    Remove thumbnail
                  </button>
                ) : (
                  <p className="SponsorsAdmin__hint">
                    Optional. Upload after setting a title (creates the course first if needed).
                  </p>
                )}
              </div>

              <div className="SponsorsAdmin__formPane">
                <div className="AdminPanel__formGrid SponsorsAdmin__formGrid">
                  <label className="AdminPanel__fullWidth">
                    Title *
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Intro to Web Development"
                      autoFocus
                      disabled={busy}
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Description
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What students will learn…"
                      disabled={busy}
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Status
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      disabled={busy}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Max Allowed Missed Attendances (for Certificate)
                    <input
                      type="number"
                      min="0"
                      value={form.max_attendance}
                      onChange={(e) => setForm((f) => ({ ...f, max_attendance: e.target.value }))}
                      placeholder="e.g. 1 (leave blank for 0 / 100% required)"
                      disabled={busy}
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Thumbnail URL
                    <input
                      value={form.thumbnail_url}
                      onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                      placeholder="https://…/thumbnail.jpg"
                      disabled={busy}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="AdminPanel__modalActions SponsorsAdmin__actions">
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={closeModal}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                onClick={saveCourse}
                disabled={busy}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create course'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  if (view === 'announcements') {
    const selectedCourse = items.find((c) => String(c.course_id) === String(activeAnnounceCourseId)) || null;

    const filteredStudents = courseStudents.filter((s) => {
      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase();
      return (
        (s.full_name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.university_id || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="AdminPanel__section SponsorsAdmin">
        <div className="AdminPanel__sectionHeader">
          <div>
            <h2 className="AdminPanel__sectionTitle">
              <MdCampaign /> Course announcements & communication
            </h2>
            <p className="SponsorsAdmin__sectionSub">
              Broadcast emails or message individual students for {selectedCourse?.title || 'selected course'}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {items.length > 1 && (
              <select
                className="AdminPanel__input"
                style={{ padding: '0.45rem 0.75rem', borderRadius: 8, background: 'rgba(14,39,68,0.7)', color: '#fff', border: '1px solid rgba(142,194,240,0.3)' }}
                value={activeAnnounceCourseId || ''}
                onChange={(e) => {
                  const cid = parseInt(e.target.value, 10);
                  setActiveAnnounceCourseId(cid);
                  setView('announcements', { course_id: cid });
                }}
              >
                {items.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.title} ({c.status})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() => setView('list')}
            >
              <MdArrowBack style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
              Back to Courses
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() =>
                setView(
                  'enrollments',
                  activeAnnounceCourseId ? { course_id: activeAnnounceCourseId } : {}
                )
              }
            >
              Enrollments
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() =>
                setView(
                  'attendance',
                  activeAnnounceCourseId ? { course_id: activeAnnounceCourseId } : {}
                )
              }
            >
              Attendance & Progress
            </button>
          </div>
        </div>

        {/* --- Announcement Composer Form --- */}
        <div className="AdminPanel__announcementsSection" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(14, 39, 68, 0.45)', borderRadius: '12px', border: '1px solid rgba(142, 194, 240, 0.18)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#8ec2f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdSend /> {editingAnnouncement ? 'Edit announcement' : 'Compose new announcement / message'}
          </h3>

          <div className="AdminPanel__formGroup" style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, color: '#eaf2ff', marginBottom: '0.4rem', display: 'block' }}>Target Audience</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[
                { value: 'all', label: 'All Registered Members' },
                { value: 'enrolled', label: 'Enrolled Only' },
                { value: 'preordered', label: 'Waitlist / Preordered Only' },
                { value: 'attended', label: 'Attended Only' },
                { value: 'individual', label: 'Specific Student' }
              ].map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    background: announcementForm.target_type === opt.value ? 'rgba(3, 169, 244, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${announcementForm.target_type === opt.value ? '#03a9f4' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: announcementForm.target_type === opt.value ? '#fff' : 'rgba(234, 242, 255, 0.8)',
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  <input
                    type="radio"
                    name="course_target_type"
                    value={opt.value}
                    checked={announcementForm.target_type === opt.value}
                    onChange={(e) => setAnnouncementForm((s) => ({ ...s, target_type: e.target.value }))}
                    style={{ margin: 0 }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* If Individual Selected, show student picker */}
            {announcementForm.target_type === 'individual' && (
              <div style={{ padding: '1rem', background: 'rgba(3, 28, 53, 0.6)', borderRadius: '8px', border: '1px solid rgba(3, 169, 244, 0.3)', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.88rem', color: '#8ec2f0', display: 'block', marginBottom: '0.4rem' }}>
                  Select enrolled student or enter email:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search student by name, ID or email…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(14,39,68,0.7)', border: '1px solid rgba(142,194,240,0.3)', color: '#fff' }}
                  />
                  <select
                    value={announcementForm.target_enrollment_id}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const selStudent = courseStudents.find((s) => String(s.enrollment_id) === String(selId));
                      setAnnouncementForm((prev) => ({
                        ...prev,
                        target_enrollment_id: selId,
                        target_email: selStudent?.email || ''
                      }));
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(14,39,68,0.7)', border: '1px solid rgba(142,194,240,0.3)', color: '#fff' }}
                  >
                    <option value="">-- Choose enrolled student ({filteredStudents.length} available) --</option>
                    {filteredStudents.map((st) => (
                      <option key={st.enrollment_id} value={st.enrollment_id}>
                        {st.full_name} ({st.university_id || 'No ID'}) - {st.email} [{st.status}]
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(234,242,255,0.65)' }}>
                  Or enter direct email address:
                  <input
                    type="email"
                    placeholder="student@miuegypt.edu.eg"
                    value={announcementForm.target_email}
                    onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, target_email: e.target.value }))}
                    style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'rgba(14,39,68,0.7)', border: '1px solid rgba(142,194,240,0.3)', color: '#fff' }}
                  />
                </div>
              </div>
            )}

            {/* Recipient estimate badge */}
            <div style={{ marginTop: '0.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="AdminPanel__badge AdminPanel__badge--info">
                {previewLoading ? 'Calculating recipients…' : `👥 Estimated recipients: ${recipientPreview.total || 0} (${recipientPreview.activeEstimate || 0} active, ${recipientPreview.unsubscribedEstimate || 0} unsubscribed)`}
              </span>
            </div>
          </div>

          <div className="AdminPanel__formGroup" style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, color: '#eaf2ff', marginBottom: '0.4rem', display: 'block' }}>
              Announcement Title / Subject *
            </label>
            <input
              type="text"
              placeholder="e.g. Midterm Project Guidelines Released"
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm((s) => ({ ...s, title: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(14,39,68,0.7)', border: '1px solid rgba(142,194,240,0.3)', color: '#fff' }}
            />
          </div>

          <div className="AdminPanel__formGroup" style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 600, color: '#eaf2ff', marginBottom: '0.4rem', display: 'block' }}>
              Announcement Message *
            </label>
            <textarea
              rows={6}
              placeholder="Write your announcement content here. Plain text and markdown formatted messages are supported..."
              value={announcementForm.message}
              onChange={(e) => setAnnouncementForm((s) => ({ ...s, message: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(14,39,68,0.7)', border: '1px solid rgba(142,194,240,0.3)', color: '#fff', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="AdminPanel__formGroup">
              <label style={{ fontSize: '0.85rem', color: 'rgba(234,242,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>
                CTA Button Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. View Guidelines"
                value={announcementForm.cta_label}
                onChange={(e) => setAnnouncementForm((s) => ({ ...s, cta_label: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(14,39,68,0.7)', border: '1px solid rgba(142,194,240,0.3)', color: '#fff' }}
              />
            </div>
            <div className="AdminPanel__formGroup">
              <label style={{ fontSize: '0.85rem', color: 'rgba(234,242,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>
                CTA Button URL (Optional - defaults to course lessons with auto login token)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={announcementForm.cta_url}
                onChange={(e) => setAnnouncementForm((s) => ({ ...s, cta_url: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(14,39,68,0.7)', border: '1px solid rgba(142,194,240,0.3)', color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#eaf2ff', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={announcementForm.send_email}
                onChange={(e) => setAnnouncementForm((s) => ({ ...s, send_email: e.target.checked }))}
              />
              <span>Send styled email notification to recipients</span>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {editingAnnouncement && (
                <button
                  type="button"
                  className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                  onClick={() => {
                    setEditingAnnouncement(null);
                    setAnnouncementForm({
                      title: '',
                      message: '',
                      target_type: 'all',
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
                type="button"
                className="AdminPanel__addBtn"
                disabled={announcementSubmitting}
                onClick={submitAnnouncement}
              >
                <MdSend /> {announcementSubmitting ? 'Sending…' : editingAnnouncement ? 'Save Changes' : announcementForm.target_type === 'individual' ? 'Send Message to Student' : 'Broadcast Announcement'}
              </button>
            </div>
          </div>
        </div>

        {/* --- Sent Announcements History --- */}
        <div>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#8ec2f0' }}>
            Past Communications & Announcements ({announcementsPagination?.total ?? announcements.length})
          </h3>

          {announcementsLoading ? (
            <div className="AdminPanel__empty"><p>Loading announcements…</p></div>
          ) : announcements.length === 0 ? (
            <div className="AdminPanel__empty"><p>No announcements or messages sent for this course yet.</p></div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {announcements.map((ann) => (
                <div
                  key={ann.announcement_id}
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(14, 39, 68, 0.55)',
                    borderRadius: '12px',
                    border: '1px solid rgba(142, 194, 240, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>{ann.title}</h4>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(234, 242, 255, 0.65)', marginTop: '0.2rem' }}>
                        By {ann.creator?.full_name || 'Admin'} · {new Date(ann.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className="AdminPanel__badge AdminPanel__badge--info">
                        Target: {ann.target_type === 'individual' ? (ann.targetEnrollment ? `Student: ${ann.targetEnrollment.full_name}` : ann.target_email || 'Individual') : ann.target_type}
                      </span>
                      {ann.send_email && (
                        <span className="AdminPanel__badge AdminPanel__badge--approved">
                          ✓ Email dispatched
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ margin: 0, color: 'rgba(234, 242, 255, 0.9)', whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.92rem' }}>
                    {ann.message}
                  </p>

                  {ann.cta_url && (
                    <div style={{ fontSize: '0.82rem', color: '#03a9f4' }}>
                      Link: <a href={ann.cta_url} target="_blank" rel="noreferrer" style={{ color: '#03a9f4', textDecoration: 'underline' }}>{ann.cta_label || ann.cta_url}</a>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                      onClick={() => {
                        setEditingAnnouncement(ann);
                        setAnnouncementForm({
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
                      disabled={resendingAnnouncementId === ann.announcement_id}
                      onClick={() => handleResendEmails(ann)}
                    >
                      <MdRefresh /> {resendingAnnouncementId === ann.announcement_id ? 'Resending…' : 'Resend Emails'}
                    </button>
                    <button
                      type="button"
                      className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                      onClick={() => handleDeleteAnnouncement(ann)}
                    >
                      <MdDelete /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {announcementsPagination && announcementsPagination.totalPages > 1 && (
            <Pagination
              pagination={announcementsPagination}
              onPageChange={setAnnouncementsPage}
            />
          )}
        </div>
      </div>
    );
  }

  if (view === 'attendance') {
    return (
      <div className="AdminPanel__section SponsorsAdmin">
        <div className="AdminPanel__sectionHeader">
          <div>
            <h2 className="AdminPanel__sectionTitle">
              <MdFactCheck /> Attendance & Progress
            </h2>
            <p className="SponsorsAdmin__sectionSub">
              Session attendance and lesson completion for course attendees.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() => setView('list')}
            >
              <MdArrowBack style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
              Back to Courses
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() =>
                setView(
                  'enrollments',
                  enrollCourseId ? { course_id: enrollCourseId } : {}
                )
              }
            >
              Enrollments
            </button>
          </div>
        </div>
        <CourseAttendanceTab
          onAlert={onAlert}
          initialCourseId={enrollCourseId || null}
        />
      </div>
    );
  }

  if (view === 'enrollments') {
    return (
      <div className="AdminPanel__section SponsorsAdmin">
        <div className="AdminPanel__sectionHeader">
          <div>
            <h2 className="AdminPanel__sectionTitle">
              <MdFactCheck /> Course enrollments
            </h2>
            <p className="SponsorsAdmin__sectionSub">
              Registration roster and enrollment status.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() => setView('list')}
            >
              <MdArrowBack style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
              Back to Courses
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() =>
                setView(
                  'announcements',
                  enrollCourseId ? { course_id: enrollCourseId } : {}
                )
              }
            >
              <MdCampaign style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
              Announcements
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() =>
                setView(
                  'attendance',
                  enrollCourseId ? { course_id: enrollCourseId } : {}
                )
              }
            >
              Attendance & Progress
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={exportCsv}
            >
              <FiDownload style={{ marginRight: 4 }} />
              Export CSV
            </button>
          </div>
        </div>

        {enrollLoading ? (
          <div className="AdminPanel__empty"><p>Loading…</p></div>
        ) : enrollments.length === 0 ? (
          <div className="AdminPanel__empty"><p>No enrollments yet.</p></div>
        ) : (
          <div className="AdminPanel__tableWrap">
            <table className="AdminPanel__table SponsorsAdmin__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((row) => (
                  <tr key={row.enrollment_id}>
                    <td>
                      <strong>{row.full_name}</strong>
                      <div style={{ opacity: 0.7, fontSize: '.85rem' }}>{row.university_id}</div>
                    </td>
                    <td>{row.course?.title || row.course_id}</td>
                    <td>
                      <div>{row.email}</div>
                      <div style={{ opacity: 0.7 }}>{row.phone_number}</div>
                    </td>
                    <td>{row.status}</td>
                    <td>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        title={`Send message to ${row.full_name}`}
                        onClick={() => {
                          setActiveAnnounceCourseId(row.course_id);
                          setAnnouncementForm((prev) => ({
                            ...prev,
                            target_type: 'individual',
                            target_enrollment_id: String(row.enrollment_id),
                            target_email: row.email || ''
                          }));
                          setView('announcements', {
                            course_id: row.course_id,
                            target_type: 'individual',
                            target_enrollment_id: row.enrollment_id
                          });
                        }}
                      >
                        <MdEmail style={{ marginRight: 4 }} /> Message
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {enrollPagination && enrollPagination.totalPages > 1 ? (
          <Pagination
            pagination={enrollPagination}
            onPageChange={setEnrollPage}
          />
        ) : null}
      </div>
    );
  }

  if (view === 'content') {
    return (
      <div className="AdminPanel__section SponsorsAdmin">
        <div className="AdminPanel__sectionHeader">
          <div>
            <h2 className="AdminPanel__sectionTitle">
              <MdMenuBook /> {courseDetail?.title || 'Course content'}
            </h2>
            <p className="SponsorsAdmin__sectionSub">
              Manage lessons, YouTube embeds, and files under Courses/{contentId}/…
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() => setView('list')}
            >
              <MdArrowBack style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
              Back
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() => setView('enrollments', { course_id: contentId })}
            >
              <MdFactCheck style={{ marginRight: 4 }} />
              Enrollments
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={() => setView('attendance', { course_id: contentId })}
            >
              Attendance
            </button>
            {courseDetail?.status !== 'published' ? (
              <button
                type="button"
                className="AdminPanel__addBtn"
                onClick={() => publishStatus('published')}
              >
                <MdPublish /> Publish & notify
              </button>
            ) : (
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={() => publishStatus('coming_soon')}
              >
                Set coming soon
              </button>
            )}
            <Link
              to={`/courses/${contentId}`}
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              target="_blank"
              rel="noreferrer"
            >
              <MdOpenInNew style={{ marginRight: 4 }} />
              View public
            </Link>
          </div>
        </div>

        {contentLoading || !courseDetail ? (
          <div className="AdminPanel__empty"><p>Loading…</p></div>
        ) : (
          <>
            <p className="SponsorsAdmin__sectionSub" style={{ marginBottom: 16 }}>
              Status: <strong>{courseDetail.status}</strong>
              {courseDetail.notify_sent_at
                ? ` · Notify sent ${new Date(courseDetail.notify_sent_at).toLocaleString()}`
                : ''}
            </p>

            <div className="AdminPanel__teamForm">
              <h4>Add lesson</h4>
              <div className="AdminPanel__formGrid SponsorsAdmin__formGrid">
                <label className="AdminPanel__fullWidth">
                  Lesson title *
                  <input
                    placeholder="e.g. Welcome & Overview"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </label>
                <label className="AdminPanel__fullWidth">
                  Description
                  <textarea
                    rows={2}
                    placeholder="Optional short description"
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>
              </div>
              <div className="AdminPanel__modalActions" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
                <button type="button" className="AdminPanel__addBtn" onClick={addLesson}>
                  <MdAdd /> Add lesson
                </button>
              </div>
            </div>

            {(courseDetail.lessons || []).map((lesson) => {
              const isActiveLesson = materialForm.lesson_id === lesson.lesson_id;
              const matType = isActiveLesson ? materialForm.material_type : 'youtube';
              return (
                <div key={lesson.lesson_id} className="AdminPanel__teamForm">
                  <div className="AdminPanel__sectionHeader" style={{ marginBottom: 12, paddingBottom: 0 }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{lesson.title}</h4>
                      <p className="SponsorsAdmin__modalSub">
                        lesson-{lesson.lesson_id} · {lesson.is_published ? 'published' : 'hidden'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                      onClick={() => removeLesson(lesson)}
                    >
                      <MdDelete /> Delete lesson
                    </button>
                  </div>

                  {(lesson.materials || []).length > 0 ? (
                    <div className="AdminPanel__tableWrap" style={{ marginBottom: 14 }}>
                      <table className="AdminPanel__table SponsorsAdmin__table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Title</th>
                            <th>Source</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(lesson.materials || []).map((m) => (
                            <tr key={m.material_id}>
                              <td>{m.material_type}</td>
                              <td>{m.title}</td>
                              <td>
                                {m.youtube_url ? (
                                  <span className="SponsorsAdmin__rowTagline">{m.youtube_url}</span>
                                ) : m.file_url ? (
                                  <a href={m.file_url} target="_blank" rel="noreferrer">Open file</a>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                                  onClick={() => removeMaterial(lesson.lesson_id, m)}
                                >
                                  <MdDelete /> Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="SponsorsAdmin__hint" style={{ marginBottom: 12 }}>No materials yet.</p>
                  )}

                  <h4 style={{ marginBottom: 8 }}>Add material</h4>
                  <div className="AdminPanel__formGrid SponsorsAdmin__formGrid">
                    <label>
                      Type
                      <select
                        value={matType}
                        onFocus={() => setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }))}
                        onChange={(e) =>
                          setMaterialForm((f) => ({
                            ...f,
                            lesson_id: lesson.lesson_id,
                            material_type: e.target.value
                          }))
                        }
                      >
                        {MATERIAL_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Title *
                      <input
                        placeholder="Material title"
                        value={isActiveLesson ? materialForm.title : ''}
                        onFocus={() => setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }))}
                        onChange={(e) =>
                          setMaterialForm((f) => ({
                            ...f,
                            lesson_id: lesson.lesson_id,
                            title: e.target.value
                          }))
                        }
                      />
                    </label>
                    {matType === 'youtube' ? (
                      <label className="AdminPanel__fullWidth">
                        YouTube URL
                        <input
                          placeholder="https://www.youtube.com/watch?v=…"
                          value={isActiveLesson ? materialForm.youtube_url : ''}
                          onFocus={() => setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }))}
                          onChange={(e) =>
                            setMaterialForm((f) => ({
                              ...f,
                              lesson_id: lesson.lesson_id,
                              youtube_url: e.target.value,
                              material_type: 'youtube'
                            }))
                          }
                        />
                      </label>
                    ) : (
                      <div className="AdminPanel__fullWidth" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                          onClick={() => {
                            setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }));
                            materialFileRef.current?.click();
                          }}
                        >
                          <MdAttachFile /> Upload file
                        </button>
                        {isActiveLesson && materialForm.file_url ? (
                          <span className="SponsorsAdmin__hint">
                            Ready: {materialForm.file_name || 'file'}
                          </span>
                        ) : (
                          <span className="SponsorsAdmin__hint">PDF, zip, code, docs…</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="AdminPanel__modalActions" style={{ justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      className="AdminPanel__addBtn"
                      onClick={() => addMaterial(lesson.lesson_id)}
                    >
                      <MdAdd /> Add material
                    </button>
                  </div>
                </div>
              );
            })}

            <input
              ref={materialFileRef}
              type="file"
              hidden
              onChange={uploadMaterialFile}
            />
          </>
        )}
      </div>
    );
  }

  // Default list view
  return (
    <div className="AdminPanel__section SponsorsAdmin">
      {modal}
      <div className="AdminPanel__sectionHeader">
        <div>
          <h2 className="AdminPanel__sectionTitle">
            <MdMenuBook /> Courses
          </h2>
          <p className="SponsorsAdmin__sectionSub">
            Create courses, manage lessons and materials, publish with email notify, and review enrollments and attendance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={() => setView('announcements')}
          >
            <MdCampaign style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
            Announcements
          </button>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={() => setView('enrollments')}
          >
            <MdFactCheck style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
            Enrollments
          </button>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={() => setView('attendance')}
          >
            <MdFactCheck style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
            Attendance & Progress
          </button>
          <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
            <MdAdd /> Add Course
          </button>
        </div>
      </div>

      {initialLoading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : items.length === 0 && !pageLoading ? (
        <div className="AdminPanel__empty SponsorsAdmin__empty">
          <MdMenuBook />
          <p>No courses yet.</p>
          <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
            <MdAdd /> Add your first course
          </button>
        </div>
      ) : pageLoading ? (
        <div className="AdminPanel__empty"><p>Loading page {page}…</p></div>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table SponsorsAdmin__table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.course_id}>
                  <td>
                    <div className="SponsorsAdmin__rowIdentity">
                      <div className="SponsorsAdmin__rowLogo">
                        {row.thumbnail_url ? (
                          <img src={row.thumbnail_url} alt="" />
                        ) : (
                          <img src={mspLogo} alt="" />
                        )}
                      </div>
                      <div className="SponsorsAdmin__rowText">
                        <span className="SponsorsAdmin__rowName">
                          {row.title}
                          {isAll && (row.season || row.season_id) ? (
                            <>{' '}<SeasonBadge season={row.season} /></>
                          ) : null}
                        </span>
                        {row.description ? (
                          <span className="SponsorsAdmin__rowTagline">
                            {String(row.description).slice(0, 80)}
                            {String(row.description).length > 80 ? '…' : ''}
                          </span>
                        ) : null}
                        <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 4 }}>
                          Max allowed missed sessions: <strong>{row.max_attendance != null ? row.max_attendance : '0 (100% required)'}</strong>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        onClick={() => openEdit(row)}
                      >
                        <MdEdit /> Edit
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        onClick={() => setView('content', { id: row.course_id })}
                      >
                        Lessons
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        onClick={() => {
                          setActiveAnnounceCourseId(row.course_id);
                          setView('announcements', { course_id: row.course_id });
                        }}
                      >
                        <MdCampaign /> Announcements
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        onClick={() => setView('enrollments', { course_id: row.course_id })}
                      >
                        Enrollments
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        onClick={() => setView('attendance', { course_id: row.course_id })}
                      >
                        Attendance
                      </button>
                      <Link
                        to={`/courses/${row.course_id}`}
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MdOpenInNew />
                      </Link>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        onClick={() => removeCourse(row)}
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <Pagination pagination={pagination} onPageChange={setPage} disabled={pageLoading} />
      ) : null}
    </div>
  );
}

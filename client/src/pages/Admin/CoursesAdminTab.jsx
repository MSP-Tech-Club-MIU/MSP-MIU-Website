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
  MdAttachFile
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
  status: 'draft'
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
      status: row.status || 'draft'
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
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        thumbnail_url: form.thumbnail_url || null,
        season_id: selectedSeasonId || undefined
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

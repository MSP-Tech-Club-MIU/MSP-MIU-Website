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

  const toggleAttended = async (row) => {
    try {
      await ApiService.updateCourseEnrollment(
        row.enrollment_id,
        { attended: !row.attended },
        row.course_id
      );
      await loadEnrollments();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Update failed' });
    }
  };

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

  const modal = modalOpen
    ? createPortal(
        <div className="AdminPanel__modalOverlay" onClick={closeModal}>
          <div className="AdminPanel__modal" onClick={(e) => e.stopPropagation()}>
            <div className="AdminPanel__modalHeader">
              <h3>{editing ? 'Edit course' : 'New course'}</h3>
              <button type="button" className="AdminPanel__modalClose" onClick={closeModal}>
                <MdClose />
              </button>
            </div>
            <div className="AdminPanel__modalBody">
              <label className="AdminPanel__field">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="AdminPanel__field">
                <span>Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label className="AdminPanel__field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <div className="AdminPanel__field">
                <span>Thumbnail</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="SponsorsAdmin__rowLogo" style={{ width: 72, height: 72 }}>
                    {form.thumbnail_url ? (
                      <img src={form.thumbnail_url} alt="" />
                    ) : (
                      <MdImage />
                    )}
                  </div>
                  <button
                    type="button"
                    className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage || saving}
                  >
                    <MdCloudUpload style={{ marginRight: 4 }} />
                    {uploadingImage ? 'Uploading…' : 'Upload'}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onThumbPick}
                  />
                </div>
              </div>
            </div>
            <div className="AdminPanel__modalFooter">
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                onClick={saveCourse}
                disabled={saving}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create course'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  if (view === 'enrollments') {
    return (
      <div className="AdminPanel__section SponsorsAdmin">
        <div className="AdminPanel__sectionHeader">
          <div>
            <h2 className="AdminPanel__sectionTitle">
              <MdFactCheck /> Course enrollments
            </h2>
            <p className="SponsorsAdmin__sectionSub">
              Registration roster, attendance, and lesson completion.
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
                  <th>Progress</th>
                  <th>Attended</th>
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
                    <td>{row.completion_percent ?? 0}% ({row.completed_count}/{row.lesson_count})</td>
                    <td>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        onClick={() => toggleAttended(row)}
                      >
                        {row.attended ? 'Yes' : 'No'}
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
            <p style={{ color: 'rgba(255,255,255,.7)', marginBottom: 16 }}>
              Status: <strong>{courseDetail.status}</strong>
              {courseDetail.notify_sent_at
                ? ` · Notify sent ${new Date(courseDetail.notify_sent_at).toLocaleString()}`
                : ''}
            </p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24, maxWidth: 520 }}>
              <h3 style={{ margin: 0, color: '#E8F4FC' }}>Add lesson</h3>
              <input
                placeholder="Lesson title"
                value={lessonForm.title}
                onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                className="AdminPanel__input"
                style={{ padding: 10, borderRadius: 8 }}
              />
              <textarea
                placeholder="Description (optional)"
                rows={2}
                value={lessonForm.description}
                onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
                style={{ padding: 10, borderRadius: 8 }}
              />
              <button type="button" className="AdminPanel__addBtn" onClick={addLesson} style={{ width: 'fit-content' }}>
                <MdAdd /> Add lesson
              </button>
            </div>

            {(courseDetail.lessons || []).map((lesson) => (
              <div
                key={lesson.lesson_id}
                style={{
                  border: '1px solid rgba(255,255,255,.12)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ color: '#E8F4FC' }}>{lesson.title}</strong>
                    <div style={{ opacity: 0.7, fontSize: '.85rem' }}>
                      lesson-{lesson.lesson_id} · {lesson.is_published ? 'published' : 'hidden'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                    onClick={() => removeLesson(lesson)}
                  >
                    <MdDelete /> Delete lesson
                  </button>
                </div>

                <ul style={{ margin: '12px 0', paddingLeft: 18, color: '#C5DAE9' }}>
                  {(lesson.materials || []).map((m) => (
                    <li key={m.material_id} style={{ marginBottom: 6 }}>
                      [{m.material_type}] {m.title}
                      {m.youtube_url ? ` — ${m.youtube_url}` : ''}
                      {m.file_url ? (
                        <>
                          {' '}
                          <a href={m.file_url} target="_blank" rel="noreferrer">file</a>
                        </>
                      ) : null}
                      {' '}
                      <button
                        type="button"
                        onClick={() => removeMaterial(lesson.lesson_id, m)}
                        style={{ marginLeft: 8, cursor: 'pointer' }}
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
                  <strong style={{ color: '#8EC2F0', fontSize: '.85rem' }}>Add material to this lesson</strong>
                  <select
                    value={materialForm.lesson_id === lesson.lesson_id ? materialForm.material_type : 'youtube'}
                    onFocus={() => setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }))}
                    onChange={(e) =>
                      setMaterialForm((f) => ({
                        ...f,
                        lesson_id: lesson.lesson_id,
                        material_type: e.target.value
                      }))
                    }
                    style={{ padding: 8, borderRadius: 8 }}
                  >
                    {MATERIAL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Title"
                    value={materialForm.lesson_id === lesson.lesson_id ? materialForm.title : ''}
                    onFocus={() => setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }))}
                    onChange={(e) =>
                      setMaterialForm((f) => ({
                        ...f,
                        lesson_id: lesson.lesson_id,
                        title: e.target.value
                      }))
                    }
                    style={{ padding: 8, borderRadius: 8 }}
                  />
                  {(materialForm.lesson_id === lesson.lesson_id
                    ? materialForm.material_type
                    : 'youtube') === 'youtube' ? (
                    <input
                      placeholder="YouTube URL"
                      value={materialForm.lesson_id === lesson.lesson_id ? materialForm.youtube_url : ''}
                      onFocus={() => setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }))}
                      onChange={(e) =>
                        setMaterialForm((f) => ({
                          ...f,
                          lesson_id: lesson.lesson_id,
                          youtube_url: e.target.value,
                          material_type: 'youtube'
                        }))
                      }
                      style={{ padding: 8, borderRadius: 8 }}
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                      {materialForm.lesson_id === lesson.lesson_id && materialForm.file_url ? (
                        <span style={{ fontSize: '.85rem', color: '#8EC2F0' }}>
                          Ready: {materialForm.file_name || 'file'}
                        </span>
                      ) : null}
                    </div>
                  )}
                  <button
                    type="button"
                    className="AdminPanel__addBtn"
                    style={{ width: 'fit-content' }}
                    onClick={() => addMaterial(lesson.lesson_id)}
                  >
                    <MdAdd /> Add material
                  </button>
                </div>
              </div>
            ))}

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
            Create courses, manage lessons and materials, publish with email notify, and review enrollments.
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

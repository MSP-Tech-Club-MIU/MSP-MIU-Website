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
  MdRefresh,
  MdSensors,
  MdVideocam,
  MdCheckCircle,
  MdWarning,
  MdMoreVert,
  MdPeople
} from 'react-icons/md';
import { FiDownload } from 'react-icons/fi';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
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

const MATERIAL_TYPES = ['youtube', 'meeting', 'document', 'zip', 'code', 'other'];

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
  const [openMenuCourseId, setOpenMenuCourseId] = useState(null);
  const [menuCoords, setMenuCoords] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenuCourseId) return;
    const handleClose = () => {
      setOpenMenuCourseId(null);
      setMenuCoords(null);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuCourseId]);

  const handleToggleMenu = (e, row) => {
    e.stopPropagation();
    if (openMenuCourseId === row.course_id) {
      setOpenMenuCourseId(null);
      setMenuCoords(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const estimatedHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let left = rect.right - menuWidth;
    if (left < 12) left = 12;
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    setMenuCoords({
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left,
      openUp
    });
    setOpenMenuCourseId(row.course_id);
  };

  const loadList = useCallback(async () => {
    const isPageChange = hasLoadedOnceRef.current;
    setOpenMenuCourseId(null);
    setMenuCoords(null);
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
    setOpenMenuCourseId(null);
  }, [view, loadList]);

  useEffect(() => {
    setPage(1);
    setOpenMenuCourseId(null);
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
    const ok = await confirmModal({
      title: 'Delete Course?',
      message: `Are you sure you want to delete course "${row.title}"? This cannot be undone.`,
      confirmText: 'Delete Course',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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
    const ok = await confirmModal({
      title: 'Delete Lesson?',
      message: `Are you sure you want to delete lesson "${lesson.title}"?`,
      confirmText: 'Delete Lesson',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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
        youtube_url: (materialForm.material_type === 'youtube' || materialForm.material_type === 'meeting') ? materialForm.youtube_url : null,
        file_url: (materialForm.material_type !== 'youtube' && materialForm.material_type !== 'meeting') ? materialForm.file_url : null,
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
    const ok = await confirmModal({
      title: 'Delete Material?',
      message: `Are you sure you want to delete material "${material.title}"?`,
      confirmText: 'Delete Material',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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
  const [enrollAttendanceType, setEnrollAttendanceType] = useState('');

  const loadEnrollments = useCallback(async () => {
    setEnrollLoading(true);
    try {
      const result = await ApiService.getCourseEnrollments({
        page: enrollPage,
        limit: ENROLL_PAGE_SIZE,
        course_id: enrollCourseId || undefined,
        attendance_type: enrollAttendanceType || undefined
      });
      setEnrollments(Array.isArray(result.data) ? result.data : []);
      setEnrollPagination(result.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load enrollments' });
    } finally {
      setEnrollLoading(false);
    }
  }, [enrollPage, enrollCourseId, enrollAttendanceType, onAlert]);

  useEffect(() => {
    if (view === 'enrollments') loadEnrollments();
  }, [view, loadEnrollments]);

  const exportCsv = async () => {
    try {
      const blob = await ApiService.exportCourseEnrollmentsCsv(
        enrollCourseId || undefined,
        enrollAttendanceType || undefined
      );
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

  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState(null);

  const handleToggleAttendanceType = async (row) => {
    const nextType = row.attendance_type === 'recordings_only' ? 'live_attendance' : 'recordings_only';
    try {
      setUpdatingEnrollmentId(row.enrollment_id);
      await ApiService.updateCourseEnrollment(
        row.enrollment_id,
        { attendance_type: nextType },
        row.course_id
      );
      setEnrollments((prev) =>
        prev.map((item) =>
          item.enrollment_id === row.enrollment_id
            ? { ...item, attendance_type: nextType }
            : item
        )
      );
      onAlert?.({
        type: 'success',
        message: `Switched ${row.full_name} to ${nextType === 'recordings_only' ? 'Recordings Only' : 'Live Attendance'}.`
      });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to update attendance track' });
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  // ---- Course Availability Notification Modal State ----
  const [notifyModalCourseId, setNotifyModalCourseId] = useState(null);
  const [notifyStatusLoading, setNotifyStatusLoading] = useState(false);
  const [notifyStatusData, setNotifyStatusData] = useState(null);
  const [notifyForce, setNotifyForce] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const openNotifyAvailabilityModal = async (courseId) => {
    setNotifyModalCourseId(courseId);
    setNotifyStatusLoading(true);
    setNotifyStatusData(null);
    setNotifyForce(false);
    try {
      const data = await ApiService.getCourseAvailabilityStatus(courseId);
      setNotifyStatusData(data);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load course availability status' });
      setNotifyModalCourseId(null);
    } finally {
      setNotifyStatusLoading(false);
    }
  };

  const closeNotifyAvailabilityModal = () => {
    if (notifying) return;
    setNotifyModalCourseId(null);
    setNotifyStatusData(null);
    setNotifyForce(false);
  };

  const handleSendAvailabilityNotifications = async () => {
    if (!notifyModalCourseId) return;
    try {
      setNotifying(true);
      const res = await ApiService.notifyCourseAvailability(notifyModalCourseId, { force: notifyForce });
      onAlert?.({
        type: 'success',
        message: res.message || 'Availability notifications sent successfully.'
      });
      closeNotifyAvailabilityModal();
      if (view === 'content' && contentId) {
        loadCourseDetail(contentId);
      }
      if (view === 'enrollments') {
        loadEnrollments();
      }
      if (view === 'list') {
        loadCourses();
      }
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to send notifications' });
    } finally {
      setNotifying(false);
    }
  };

  const renderNotifyAvailabilityModal = () => {
    if (!notifyModalCourseId) return null;
    return createPortal(
      <div
        className="AdminPanel__modalOverlay"
        onClick={() => !notifying && closeNotifyAvailabilityModal()}
        role="presentation"
      >
        <div
          className="AdminPanel__modalContent"
          style={{ maxWidth: 580 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="AdminPanel__modalHeader">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(13, 123, 216, 0.2), rgba(3, 169, 244, 0.2))',
                  border: '1px solid rgba(3, 169, 244, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#03A9F4',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}
              >
                <MdSend />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.18rem', color: '#eaf2ff', fontWeight: 700 }}>
                  Notify Enrolled Students
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#8aa2b8' }}>
                  {notifyStatusData?.title ? `${notifyStatusData.title} • Course Availability` : 'Inform students that the course is available'}
                </p>
              </div>
            </div>
            {!notifying && (
              <button
                type="button"
                className="AdminPanel__modalClose"
                onClick={closeNotifyAvailabilityModal}
                aria-label="Close"
              >
                <MdClose />
              </button>
            )}
          </div>

          <div className="AdminPanel__modalBody">
            {notifyStatusLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 12, color: '#03A9F4' }}>⏳</div>
                <p style={{ color: '#A8C2D6', margin: 0 }}>Checking course &amp; video content status...</p>
              </div>
            ) : notifyStatusData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Session 1 Video Status Banner */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: notifyStatusData.has_video
                      ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.12), rgba(39, 174, 96, 0.06))'
                      : 'linear-gradient(135deg, rgba(243, 156, 18, 0.12), rgba(211, 84, 0, 0.06))',
                    border: `1px solid ${notifyStatusData.has_video ? 'rgba(46, 204, 113, 0.35)' : 'rgba(243, 156, 18, 0.35)'}`,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: notifyStatusData.has_video ? 'rgba(46, 204, 113, 0.2)' : 'rgba(243, 156, 18, 0.2)',
                      color: notifyStatusData.has_video ? '#2ecc71' : '#f39c12',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0,
                      marginTop: 2
                    }}
                  >
                    {notifyStatusData.has_video ? <MdCheckCircle /> : <MdWarning />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: notifyStatusData.has_video ? '#2ecc71' : '#f39c12', fontSize: '0.92rem' }}>
                        {notifyStatusData.has_video
                          ? 'Session 1 Video Content Ready'
                          : 'No Video Uploaded to Session 1 Yet'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontWeight: 600,
                          background: notifyStatusData.has_video ? 'rgba(46, 204, 113, 0.2)' : 'rgba(243, 156, 18, 0.2)',
                          color: notifyStatusData.has_video ? '#5ce399' : '#f39c12'
                        }}
                      >
                        {notifyStatusData.has_video ? 'All Tracks Unlocked' : 'Live Only'}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '0.83rem', color: '#c5dae9', lineHeight: 1.5 }}>
                      {notifyStatusData.has_video
                        ? `Session 1 (${notifyStatusData.first_lesson_title || 'Session 1'}) has video content. Both Live Attendance and Recordings students will receive their dedicated notifications.`
                        : `Before Session 1 video content is uploaded, ONLY Live Attendance students are informed of course availability. Recordings-only students will be held back until Session 1 has a video uploaded.`}
                    </p>
                  </div>
                </div>

                {/* Recipient breakdown cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14
                  }}
                >
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: 14,
                      background: 'linear-gradient(145deg, rgba(13, 123, 216, 0.08), rgba(3, 169, 244, 0.04))',
                      border: '1px solid rgba(3, 169, 244, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#03A9F4', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <MdSensors style={{ fontSize: '1rem' }} /> Live Attendance
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(3, 169, 244, 0.15)', color: '#03A9F4', fontWeight: 600 }}>
                        Eligible
                      </span>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginTop: 4 }}>
                      {notifyForce ? notifyStatusData.live_total : notifyStatusData.live_pending}
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#8aa2b8', marginLeft: 6 }}>
                        / {notifyStatusData.live_total} total
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#8aa2b8', lineHeight: 1.4 }}>
                      Confirmed for live interactive sessions and mentorship.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      borderRadius: 14,
                      background: notifyStatusData.has_video
                        ? 'linear-gradient(145deg, rgba(46, 204, 113, 0.08), rgba(39, 174, 96, 0.04))'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${notifyStatusData.has_video ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                      opacity: notifyStatusData.has_video ? 1 : 0.7,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: notifyStatusData.has_video ? '#2ecc71' : '#a0aec0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <MdVideocam style={{ fontSize: '1rem' }} /> Recordings Access
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: notifyStatusData.has_video ? 'rgba(46, 204, 113, 0.15)' : 'rgba(243, 156, 18, 0.15)',
                        color: notifyStatusData.has_video ? '#2ecc71' : '#f39c12',
                        fontWeight: 600
                      }}>
                        {notifyStatusData.has_video ? 'Ready' : 'Held Back'}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginTop: 4 }}>
                      {notifyForce ? notifyStatusData.recordings_total : notifyStatusData.recordings_pending}
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#8aa2b8', marginLeft: 6 }}>
                        / {notifyStatusData.recordings_total} total
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: notifyStatusData.has_video ? '#2ecc71' : '#f39c12', lineHeight: 1.4 }}>
                      {notifyStatusData.has_video
                        ? 'Empowering self-paced email with Session 1 link.'
                        : 'Waiting for Session 1 video upload.'}
                    </div>
                  </div>
                </div>

                {/* Force resend toggle */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    userSelect: 'none',
                    marginTop: 4
                  }}
                >
                  <input
                    type="checkbox"
                    checked={notifyForce}
                    onChange={(e) => setNotifyForce(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#03A9F4', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#eaf2ff' }}>
                      Resend to all enrolled students
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(197, 218, 233, 0.65)', marginTop: 2 }}>
                      By default, only students who have not been notified yet receive the email. Check this to resend to everyone.
                    </span>
                  </div>
                </label>

                {notifyStatusData.notify_sent_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'rgba(197, 218, 233, 0.6)' }}>
                    <MdRefresh style={{ fontSize: '0.9rem' }} />
                    <span>Last notification sent on {new Date(notifyStatusData.notify_sent_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#e74c3c' }}>Unable to load course status.</p>
            )}
          </div>

          <div className="AdminPanel__modalActions">
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={closeNotifyAvailabilityModal}
              disabled={notifying}
            >
              Cancel
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
              style={{
                background: 'linear-gradient(135deg, #0d7bd8 0%, #03A9F4 100%)',
                color: '#ffffff',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(13, 123, 216, 0.35)',
                border: 'none',
                padding: '10px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
              onClick={handleSendAvailabilityNotifications}
              disabled={notifying || notifyStatusLoading || !notifyStatusData}
            >
              <MdSend />
              {notifying ? 'Sending Notifications...' : 'Send Notifications'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderRowActionsMenu = () => {
    if (!openMenuCourseId || !menuCoords) return null;
    const row = items.find((c) => c.course_id === openMenuCourseId);
    if (!row) return null;

    return createPortal(
      <div className="CourseActions__portalWrapper">
        <div
          className="CourseActions__backdrop"
          onClick={() => {
            setOpenMenuCourseId(null);
            setMenuCoords(null);
          }}
        />
        <div
          ref={menuRef}
          className={`CourseActions__menu CourseActions__menu--portal ${
            menuCoords.openUp ? 'CourseActions__menu--up' : ''
          }`}
          style={{
            position: 'fixed',
            top: menuCoords.openUp ? 'auto' : `${menuCoords.top}px`,
            bottom: menuCoords.openUp ? `${menuCoords.bottom}px` : 'auto',
            left: `${menuCoords.left}px`,
            zIndex: 10001
          }}
          role="menu"
        >
          <div className="CourseActions__menuHeader">Students &amp; Progress</div>
          <button
            type="button"
            className="CourseActions__menuItem"
            role="menuitem"
            onClick={() => {
              setOpenMenuCourseId(null);
              setMenuCoords(null);
              setView('enrollments', { course_id: row.course_id });
            }}
          >
            <MdPeople className="CourseActions__itemIcon" />
            <span>Enrollments</span>
          </button>
          <button
            type="button"
            className="CourseActions__menuItem"
            role="menuitem"
            onClick={() => {
              setOpenMenuCourseId(null);
              setMenuCoords(null);
              setView('attendance', { course_id: row.course_id });
            }}
          >
            <MdFactCheck className="CourseActions__itemIcon" />
            <span>Attendance &amp; Progress</span>
          </button>

          <div className="CourseActions__menuDivider" />
          <div className="CourseActions__menuHeader">Communications</div>

          {row.status === 'published' && (
            <button
              type="button"
              className="CourseActions__menuItem CourseActions__menuItem--highlight"
              role="menuitem"
              onClick={() => {
                setOpenMenuCourseId(null);
                setMenuCoords(null);
                openNotifyAvailabilityModal(row.course_id);
              }}
            >
              <MdSend className="CourseActions__itemIcon" />
              <span>Notify Students</span>
            </button>
          )}

          <Link
            to={`/admin/course-emails?course_id=${row.course_id}`}
            className="CourseActions__menuItem"
            role="menuitem"
            onClick={() => {
              setOpenMenuCourseId(null);
              setMenuCoords(null);
            }}
          >
            <MdEmail className="CourseActions__itemIcon" />
            <span>Send Course Email</span>
          </Link>
          <button
            type="button"
            className="CourseActions__menuItem"
            role="menuitem"
            onClick={() => {
              setOpenMenuCourseId(null);
              setMenuCoords(null);
              setActiveAnnounceCourseId(row.course_id);
              setView('announcements', { course_id: row.course_id });
            }}
          >
            <MdCampaign className="CourseActions__itemIcon" />
            <span>Announcements</span>
          </button>

          <div className="CourseActions__menuDivider" />
          <button
            type="button"
            className="CourseActions__menuItem CourseActions__menuItem--danger"
            role="menuitem"
            onClick={() => {
              setOpenMenuCourseId(null);
              setMenuCoords(null);
              removeCourse(row);
            }}
          >
            <MdDelete className="CourseActions__itemIcon" />
            <span>Delete Course</span>
          </button>
        </div>
      </div>,
      document.body
    );
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
    const ok = await confirmModal({
      title: 'Resend Course Emails?',
      message: `Resend emails for "${announcement.title}" to targeted recipients?`,
      confirmText: 'Yes, Resend',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;
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
    const ok = await confirmModal({
      title: 'Delete Announcement?',
      message: `Are you sure you want to delete "${announcement.title}"?`,
      confirmText: 'Delete Announcement',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span>Description (Markdown &amp; Curriculum)</span>
                      <small style={{ color: (form.description?.length || 0) > 2500 ? '#ff9800' : 'rgba(197, 218, 233, 0.7)', fontSize: '0.78rem' }}>
                        {form.description?.length || 0} / 3000 max characters (card preview displays first ~115 chars)
                      </small>
                    </div>
                    <textarea
                      rows={5}
                      maxLength={3000}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Course overview, curriculum topics, prerequisites…"
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
            {enrollCourseId && (
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                style={{ background: 'linear-gradient(135deg, #0d7bd8, #03A9F4)', color: '#fff' }}
                onClick={() => openNotifyAvailabilityModal(enrollCourseId)}
                title="Inform enrolled students of course availability and their status"
              >
                <MdSend style={{ marginRight: 4 }} /> Inform Availability
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#C5DAE9' }}>
            <span>Attendee Type:</span>
            <select
              className="AdminPanel__filterSelect"
              value={enrollAttendanceType}
              onChange={(e) => {
                setEnrollAttendanceType(e.target.value);
                setEnrollPage(1);
              }}
              style={{ minWidth: 160 }}
            >
              <option value="">All Types</option>
              <option value="live_attendance">Live Attendance</option>
              <option value="recordings_only">Recordings Only</option>
            </select>
          </label>
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
                  <th>Track / Type</th>
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
                    <td>
                      <div
                        className="CourseTrackSwitch"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: 'rgba(5, 20, 36, 0.7)',
                          borderRadius: '20px',
                          padding: '2px',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                          userSelect: 'none'
                        }}
                        title="Click to switch attendance track"
                      >
                        <button
                          type="button"
                          disabled={updatingEnrollmentId === row.enrollment_id}
                          onClick={() => row.attendance_type !== 'live_attendance' && handleToggleAttendanceType(row)}
                          style={{
                            border: 'none',
                            cursor: updatingEnrollmentId === row.enrollment_id ? 'wait' : (row.attendance_type === 'live_attendance' ? 'default' : 'pointer'),
                            padding: '3px 8px',
                            borderRadius: '16px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                            background: row.attendance_type === 'live_attendance' ? 'linear-gradient(135deg, #0d7bd8, #03A9F4)' : 'transparent',
                            color: row.attendance_type === 'live_attendance' ? '#ffffff' : 'rgba(197, 218, 233, 0.65)',
                            boxShadow: row.attendance_type === 'live_attendance' ? '0 2px 6px rgba(3, 169, 244, 0.35)' : 'none'
                          }}
                        >
                          <MdSensors style={{ fontSize: '0.82rem' }} /> Live
                        </button>
                        <button
                          type="button"
                          disabled={updatingEnrollmentId === row.enrollment_id}
                          onClick={() => row.attendance_type !== 'recordings_only' && handleToggleAttendanceType(row)}
                          style={{
                            border: 'none',
                            cursor: updatingEnrollmentId === row.enrollment_id ? 'wait' : (row.attendance_type === 'recordings_only' ? 'default' : 'pointer'),
                            padding: '3px 8px',
                            borderRadius: '16px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                            background: row.attendance_type === 'recordings_only' ? 'linear-gradient(135deg, #27ae60, #2ecc71)' : 'transparent',
                            color: row.attendance_type === 'recordings_only' ? '#ffffff' : 'rgba(197, 218, 233, 0.65)',
                            boxShadow: row.attendance_type === 'recordings_only' ? '0 2px 6px rgba(46, 204, 113, 0.35)' : 'none'
                          }}
                        >
                          <MdVideocam style={{ fontSize: '0.82rem' }} /> Recordings
                        </button>
                      </div>
                    </td>
                    <td>{row.status}</td>
                    <td>
                      <Link
                        to={`/admin/course-emails?course_id=${row.course_id}&target_type=individual&target_enrollment_id=${row.enrollment_id}`}
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                        title={`Send message to ${row.full_name}`}
                      >
                        <MdEmail style={{ marginRight: 4 }} /> Message
                      </Link>
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
        {renderNotifyAvailabilityModal()}
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
              <>
                <button
                  type="button"
                  className="AdminPanel__addBtn"
                  style={{ background: 'linear-gradient(135deg, #0d7bd8, #03A9F4)' }}
                  onClick={() => openNotifyAvailabilityModal(contentId)}
                  title="Inform enrolled students of course availability and their status"
                >
                  <MdSend style={{ marginRight: 4 }} /> Notify Students
                </button>
                <button
                  type="button"
                  className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                  onClick={() => publishStatus('coming_soon')}
                >
                  Set coming soon
                </button>
              </>
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
                                {m.material_type === 'youtube' ? (
                                  <span className="SponsorsAdmin__rowTagline">{m.youtube_url}</span>
                                ) : m.material_type === 'meeting' ? (
                                  <a href={m.youtube_url} target="_blank" rel="noreferrer" className="SponsorsAdmin__rowTagline" style={{ textDecoration: 'underline' }}>{m.youtube_url}</a>
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
                    {matType === 'youtube' || matType === 'meeting' ? (
                      <label className="AdminPanel__fullWidth">
                        {matType === 'youtube' ? 'YouTube URL' : 'Meeting URL'}
                        <input
                          placeholder={matType === 'youtube' ? "https://www.youtube.com/watch?v=…" : "https://zoom.us/j/... or Google Meet / Teams link"}
                          value={isActiveLesson ? materialForm.youtube_url : ''}
                          onFocus={() => setMaterialForm((f) => ({ ...f, lesson_id: lesson.lesson_id }))}
                          onChange={(e) =>
                            setMaterialForm((f) => ({
                              ...f,
                              lesson_id: lesson.lesson_id,
                              youtube_url: e.target.value,
                              material_type: matType
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
        {renderNotifyAvailabilityModal()}
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
          <Link
            to="/admin/course-emails"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
          >
            <MdSend style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
            Course Emails
          </Link>
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
              {items.map((row, index) => (
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
                  <td>
                    <span
                      className={`AdminPanel__badge ${
                        row.status === 'published'
                          ? 'AdminPanel__badge--approved'
                          : row.status === 'coming_soon'
                          ? 'AdminPanel__badge--upcoming'
                          : row.status === 'archived'
                          ? 'AdminPanel__badge--rejected'
                          : 'AdminPanel__badge--pending'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <div className="CourseActions__row">
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary CourseActions__btn"
                        onClick={() => {
                          setOpenMenuCourseId(null);
                          openEdit(row);
                        }}
                        title="Edit course details"
                      >
                        <MdEdit /> Edit
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary CourseActions__btn"
                        onClick={() => {
                          setOpenMenuCourseId(null);
                          setView('content', { id: row.course_id });
                        }}
                        title="Manage lessons and curriculum"
                      >
                        <MdMenuBook /> Lessons
                      </button>
                      <Link
                        to={`/courses/${row.course_id}`}
                        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary CourseActions__iconBtn"
                        target="_blank"
                        rel="noreferrer"
                        title="View public course page"
                      >
                        <MdOpenInNew />
                      </Link>

                      <div className="CourseActions__menuWrapper">
                        <button
                          type="button"
                          className={`AdminPanel__modalBtn AdminPanel__modalBtn--secondary CourseActions__iconBtn ${
                            openMenuCourseId === row.course_id ? 'CourseActions__iconBtn--active' : ''
                          }`}
                          onClick={(e) => handleToggleMenu(e, row)}
                          title="More options"
                          aria-label="More options"
                          aria-expanded={openMenuCourseId === row.course_id}
                        >
                          <MdMoreVert />
                        </button>
                      </div>
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
      {renderNotifyAvailabilityModal()}
      {renderRowActionsMenu()}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FiDownload, FiCheckCircle } from 'react-icons/fi';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import mspLogo from '../assets/Images/msp-logo.png';
import { toYouTubeEmbedUrl, courseAccessTokenKey } from '../utils/youtube';
import './Courses.css';

const emptyForm = () => ({
  full_name: '',
  email: '',
  phone_number: '',
  university_id: ''
});

export default function CourseDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = parseInt(id, 10);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  const [formError, setFormError] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [completedIds, setCompletedIds] = useState([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('token');
    const stored = localStorage.getItem(courseAccessTokenKey(courseId));
    const token = fromQuery || stored || '';
    if (fromQuery) {
      localStorage.setItem(courseAccessTokenKey(courseId), fromQuery);
    }
    setAccessToken(token);
  }, [courseId, searchParams]);

  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getCourseById(courseId);
      setCourse(data);
      const lessons = data.lessons || [];
      if (lessons.length) setActiveLessonId(lessons[0].lesson_id);
    } catch (err) {
      setError(err.message || 'Failed to load course');
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (Number.isFinite(courseId)) loadCourse();
  }, [courseId, loadCourse]);

  useEffect(() => {
    if (!accessToken || !Number.isFinite(courseId)) return;
    let cancelled = false;
    (async () => {
      try {
        const progress = await ApiService.getCourseMyProgress(courseId, accessToken);
        if (!cancelled) setCompletedIds(progress.completed_lesson_ids || []);
      } catch {
        /* token may be invalid */
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken, courseId]);

  const lessons = course?.lessons || [];
  const activeLesson = useMemo(
    () => lessons.find((l) => l.lesson_id === activeLessonId) || lessons[0] || null,
    [lessons, activeLessonId]
  );

  const youtubeMaterials = (activeLesson?.materials || []).filter((m) => m.material_type === 'youtube');
  const fileMaterials = (activeLesson?.materials || []).filter((m) => m.material_type !== 'youtube');

  const onEnroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    setFormError(null);
    try {
      const result = await ApiService.enrollInCourse(courseId, form);
      const token = result.data?.access_token;
      if (token) {
        localStorage.setItem(courseAccessTokenKey(courseId), token);
        setAccessToken(token);
      }
      setFormMsg(result.message || 'Registered successfully');
      setForm(emptyForm());
    } catch (err) {
      if (err.status === 409 && err.data?.access_token) {
        localStorage.setItem(courseAccessTokenKey(courseId), err.data.access_token);
        setAccessToken(err.data.access_token);
        setFormMsg('You were already registered — progress tracking restored.');
      } else {
        setFormError(err.message || 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const markComplete = async () => {
    if (!accessToken || !activeLesson) return;
    setMarking(true);
    try {
      await ApiService.markCourseLessonComplete(courseId, {
        token: accessToken,
        lesson_id: activeLesson.lesson_id
      });
      setCompletedIds((prev) =>
        prev.includes(activeLesson.lesson_id) ? prev : [...prev, activeLesson.lesson_id]
      );
    } catch (err) {
      setFormError(err.message || 'Could not mark lesson complete');
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !course) {
    return (
      <div className="CourseDetails">
        <div className="CourseDetails__container">
          <BackButton to="/courses" />
          <div className="CoursesPage__empty">{error || 'Course not found'}</div>
        </div>
      </div>
    );
  }

  const showLessons = course.status === 'published' && lessons.length > 0;
  const showForm = course.status === 'coming_soon' || course.status === 'published';

  return (
    <div className="CourseDetails">
      <SEO title={`${course.title} | MSP Courses`} description={course.description || ''} />
      <div className="CourseDetails__container">
        <BackButton to="/courses" />

        <div className="CourseDetails__hero">
          <div className="CourseDetails__thumb">
            <img
              src={course.thumbnail_url || mspLogo}
              alt=""
              onError={(e) => { e.currentTarget.src = mspLogo; }}
            />
          </div>
          <div className="CourseDetails__meta">
            <span className={`CoursesPage__badge CoursesPage__badge--${course.status}`}>
              {course.status === 'coming_soon' ? 'Coming soon' : course.status === 'published' ? 'Available' : course.status}
            </span>
            <h1>{course.title}</h1>
            {course.description ? <p>{course.description}</p> : null}

            {showForm ? (
              <form className="CourseDetails__form" onSubmit={onEnroll}>
                <h3>
                  {course.status === 'coming_soon'
                    ? 'Notify me when available'
                    : 'Register for this course'}
                </h3>
                <div className="CourseDetails__formGrid">
                  <input
                    required
                    placeholder="Full name"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <input
                    required
                    placeholder="Phone number"
                    value={form.phone_number}
                    onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                  />
                  <input
                    required
                    placeholder="University ID"
                    value={form.university_id}
                    onChange={(e) => setForm((f) => ({ ...f, university_id: e.target.value }))}
                  />
                </div>
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : course.status === 'coming_soon' ? 'Notify me' : 'Register'}
                </button>
                {formMsg ? <p className="CourseDetails__formMsg">{formMsg}</p> : null}
                {formError ? <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{formError}</p> : null}
                {accessToken ? (
                  <p className="CourseDetails__formMsg">
                    Progress tracking is linked on this device.
                  </p>
                ) : null}
              </form>
            ) : null}
          </div>
        </div>

        {course.status === 'coming_soon' ? (
          <div className="CourseDetails__locked">
            Lessons will appear here when the course is published. Register above to get an email first.
          </div>
        ) : null}

        {showLessons ? (
          <div className="CourseDetails__layout">
            <aside className="CourseDetails__sidebar">
              <h3>Lessons</h3>
              {lessons.map((lesson, idx) => {
                const done = completedIds.includes(lesson.lesson_id);
                return (
                  <button
                    key={lesson.lesson_id}
                    type="button"
                    className={`CourseDetails__lessonBtn${activeLesson?.lesson_id === lesson.lesson_id ? ' active' : ''}`}
                    onClick={() => setActiveLessonId(lesson.lesson_id)}
                  >
                    <span className={`CourseDetails__check${done ? ' done' : ''}`} aria-hidden />
                    <span>
                      <strong>{idx + 1}. {lesson.title}</strong>
                    </span>
                  </button>
                );
              })}
            </aside>

            <section className="CourseDetails__main">
              {activeLesson ? (
                <>
                  <h2>{activeLesson.title}</h2>
                  {activeLesson.description ? <p>{activeLesson.description}</p> : null}

                  {youtubeMaterials.map((m) => {
                    const embed = toYouTubeEmbedUrl(m.youtube_url);
                    if (!embed) return null;
                    return (
                      <div key={m.material_id} className="CourseDetails__embed">
                        <iframe
                          src={embed}
                          title={m.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  })}

                  {fileMaterials.length > 0 ? (
                    <div className="CourseDetails__files">
                      {fileMaterials.map((m) => (
                        <a
                          key={m.material_id}
                          className="CourseDetails__file"
                          href={m.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <FiDownload />
                          <span>{m.title || m.file_name || 'Download'}</span>
                          <small style={{ opacity: 0.7 }}>({m.material_type})</small>
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {accessToken ? (
                    completedIds.includes(activeLesson.lesson_id) ? (
                      <p className="CourseDetails__formMsg">
                        <FiCheckCircle style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Lesson completed
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="CourseDetails__completeBtn"
                        onClick={markComplete}
                        disabled={marking}
                      >
                        {marking ? 'Saving…' : 'Mark lesson complete'}
                      </button>
                    )
                  ) : (
                    <p className="CourseDetails__formMsg">
                      Register above to track which lessons you complete.
                    </p>
                  )}
                </>
              ) : (
                <p>Select a lesson.</p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

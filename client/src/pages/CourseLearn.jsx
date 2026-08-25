import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { FiDownload, FiCheckCircle, FiVideo } from 'react-icons/fi';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import CourseYouTubePlayer from '../components/CourseYouTubePlayer';
import { courseAccessTokenKey } from '../utils/youtube';
import './Courses.css';

/**
 * Lesson / video player page. Requires registration access_token.
 * Route: /courses/:id/learn
 */
export default function CourseLearn() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = parseInt(id, 10);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [completedIds, setCompletedIds] = useState([]);
  const [marking, setMarking] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromQuery = searchParams.get('token');
      const stored = Number.isFinite(courseId)
        ? localStorage.getItem(courseAccessTokenKey(courseId))
        : null;
      let token = fromQuery || stored || '';

      if (!token && ApiService.isAuthenticated() && Number.isFinite(courseId)) {
        try {
          const result = await ApiService.enrollInCourseWithAccount(courseId);
          token = result.data?.access_token || '';
        } catch {
          /* fall through — may redirect to landing */
        }
      }

      if (fromQuery && Number.isFinite(courseId)) {
        localStorage.setItem(courseAccessTokenKey(courseId), fromQuery);
      } else if (token && Number.isFinite(courseId)) {
        localStorage.setItem(courseAccessTokenKey(courseId), token);
      }

      if (!cancelled) {
        setAccessToken(token || null);
        setTokenReady(true);
      }
    })();
    return () => { cancelled = true; };
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
    if (Number.isFinite(courseId) && accessToken) loadCourse();
  }, [courseId, accessToken, loadCourse]);

  useEffect(() => {
    if (!accessToken || !Number.isFinite(courseId)) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const progress = await ApiService.getCourseMyProgress(courseId, accessToken);
        if (!cancelled) setCompletedIds(progress.completed_lesson_ids || []);
      } catch {
        /* invalid token handled by gate below if needed */
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
  const meetingMaterials = (activeLesson?.materials || []).filter((m) => m.material_type === 'meeting');
  const fileMaterials = (activeLesson?.materials || []).filter((m) => m.material_type !== 'youtube' && m.material_type !== 'meeting');

  const markComplete = async () => {
    if (!accessToken || !activeLesson) return;
    setMarking(true);
    setActionError(null);
    try {
      await ApiService.markCourseLessonComplete(courseId, {
        token: accessToken,
        lesson_id: activeLesson.lesson_id
      });
      setCompletedIds((prev) =>
        prev.includes(activeLesson.lesson_id) ? prev : [...prev, activeLesson.lesson_id]
      );
    } catch (err) {
      setActionError(err.message || 'Could not mark lesson complete');
    } finally {
      setMarking(false);
    }
  };

  if (!tokenReady) return <PageLoader />;

  if (!accessToken) {
    return <Navigate to={`/courses/${courseId}`} replace state={{ needRegister: true }} />;
  }

  if (loading) return <PageLoader />;

  if (error || !course) {
    return (
      <div className="CourseDetails">
        <div className="CourseDetails__container">
          <BackButton to={`/courses/${courseId}`} />
          <div className="CoursesPage__empty">{error || 'Course not found'}</div>
        </div>
      </div>
    );
  }

  if (course.status !== 'published') {
    return (
      <div className="CourseDetails">
        <div className="CourseDetails__container">
          <BackButton to={`/courses/${courseId}`} />
          <div className="CourseDetails__locked">
            This course is not available to watch yet.
            <div style={{ marginTop: 16 }}>
              <Link to={`/courses/${courseId}`} className="CourseDetails__viewBtn">
                Back to course page
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lessons.length) {
    return (
      <div className="CourseDetails">
        <div className="CourseDetails__container">
          <BackButton to={`/courses/${courseId}`} />
          <div className="CourseDetails__locked">No lessons published yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="CourseDetails CourseLearn">
      <SEO title={`${course.title} — Lessons | MSP Courses`} description={course.description || ''} noindex />
      <div className="CourseDetails__container">
        <BackButton to={`/courses/${courseId}`} label="Course info" />
        <header className="CourseLearn__header">
          <h1>{course.title}</h1>
          <p>Watch lessons and download materials. Mark each lesson complete as you go.</p>
        </header>

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

                 {youtubeMaterials.map((m) => (
                  <CourseYouTubePlayer
                    key={m.material_id}
                    url={m.youtube_url}
                    title={m.title}
                  />
                ))}

                {meetingMaterials.length > 0 ? (
                  <div className="CourseDetails__files" style={{ marginBottom: 20 }}>
                    {meetingMaterials.map((m) => (
                      <a
                        key={m.material_id}
                        className="CourseDetails__file"
                        href={m.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          borderColor: 'rgba(235, 94, 40, 0.4)',
                          background: 'rgba(235, 94, 40, 0.1)',
                          color: '#FFAC81'
                        }}
                      >
                        <FiVideo style={{ fontSize: '1.2rem' }} />
                        <span style={{ fontWeight: 600 }}>{m.title || 'Join Live Meeting'}</span>
                        <small style={{ marginLeft: 'auto', opacity: 0.8 }}>(Live Session)</small>
                      </a>
                    ))}
                  </div>
                ) : null}

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

                {completedIds.includes(activeLesson.lesson_id) ? (
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
                )}
                {actionError ? (
                  <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{actionError}</p>
                ) : null}
              </>
            ) : (
              <p>Select a lesson.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

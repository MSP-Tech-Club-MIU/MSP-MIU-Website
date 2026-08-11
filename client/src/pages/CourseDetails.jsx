import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiPlayCircle } from 'react-icons/fi';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import mspLogo from '../assets/Images/msp-logo.png';
import { courseAccessTokenKey } from '../utils/youtube';
import './Courses.css';

const emptyForm = () => ({
  full_name: '',
  email: '',
  phone_number: '',
  university_id: ''
});

/**
 * Course landing: description + registration. Lessons open via View course after register.
 * Logged-in MSP users skip the form and enroll with their account when starting the course.
 */
export default function CourseDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const courseId = parseInt(id, 10);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  const [formError, setFormError] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('token');
    const stored = Number.isFinite(courseId)
      ? localStorage.getItem(courseAccessTokenKey(courseId))
      : null;
    const token = fromQuery || stored || '';
    if (fromQuery && Number.isFinite(courseId)) {
      localStorage.setItem(courseAccessTokenKey(courseId), fromQuery);
    }
    setAccessToken(token);
  }, [courseId, searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!ApiService.isAuthenticated()) {
          if (!cancelled) {
            setIsLoggedIn(false);
            setAccountName('');
          }
          return;
        }
        const user = await ApiService.getProfile();
        if (!cancelled) {
          setIsLoggedIn(true);
          setAccountName(user?.full_name || user?.university_id || user?.email || '');
        }
      } catch {
        if (!cancelled) {
          setIsLoggedIn(false);
          setAccountName('');
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (location.state?.needRegister) {
      setFormError(
        isLoggedIn
          ? 'Click View course to continue with your MSP account.'
          : 'Please register for this course (or log in with your MSP account) before viewing lessons.'
      );
    }
  }, [location.state, isLoggedIn]);

  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getCourseById(courseId);
      setCourse(data);
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

  const persistToken = (token) => {
    if (!token) return;
    localStorage.setItem(courseAccessTokenKey(courseId), token);
    setAccessToken(token);
  };

  const onEnroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    setFormError(null);
    try {
      const result = await ApiService.enrollInCourse(courseId, form);
      persistToken(result.data?.access_token);
      setFormMsg(result.message || 'Registered successfully');
      setForm(emptyForm());
    } catch (err) {
      if (err.status === 409 && err.data?.access_token) {
        persistToken(err.data.access_token);
        setFormMsg('You were already registered — you can open the course now.');
      } else {
        setFormError(err.message || 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Logged-in: enroll with account info, then open learn (or confirm notify). */
  const startWithAccount = async () => {
    setStarting(true);
    setFormError(null);
    setFormMsg(null);
    try {
      let token = accessToken;
      if (!token) {
        const result = await ApiService.enrollInCourseWithAccount(courseId);
        token = result.data?.access_token;
        persistToken(token);
        setFormMsg(result.message || 'Enrolled with your MSP account');
      }
      if (course?.status === 'published' && token) {
        navigate(`/courses/${courseId}/learn?token=${encodeURIComponent(token)}`);
      }
    } catch (err) {
      setFormError(err.message || 'Could not start with your MSP account');
    } finally {
      setStarting(false);
    }
  };

  if (loading || !authChecked) return <PageLoader />;
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

  const registrationOpen = course.status === 'coming_soon' || course.status === 'published';
  const canViewCourse = course.status === 'published' && !!accessToken;
  const learnPath = `/courses/${courseId}/learn${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`;
  const loginState = { from: { pathname: `/courses/${courseId}` } };

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
              {course.status === 'coming_soon'
                ? 'Coming soon'
                : course.status === 'published'
                  ? 'Available'
                  : course.status}
            </span>
            <h1>{course.title}</h1>
            {course.description ? <p>{course.description}</p> : null}

            {/* Already registered (guest or previous visit) */}
            {canViewCourse ? (
              <div className="CourseDetails__viewWrap">
                <Link to={learnPath} className="CourseDetails__viewBtn">
                  <FiPlayCircle />
                  View course
                </Link>
                <p className="CourseDetails__formMsg">
                  You&apos;re registered on this device. Open the course anytime.
                </p>
              </div>
            ) : null}

            {/* Logged-in MSP member: skip form */}
            {registrationOpen && isLoggedIn && !accessToken ? (
              <div className="CourseDetails__form CourseDetails__accountBox">
                <h3>
                  {course.status === 'coming_soon'
                    ? 'Get notified with your MSP account'
                    : 'Start with your MSP account'}
                </h3>
                <p className="CourseDetails__formLead">
                  Signed in as <strong>{accountName || 'MSP member'}</strong>.
                  {course.status === 'coming_soon'
                    ? ' We’ll use your account details — no form needed.'
                    : ' We’ll use your account details when you start the course — no registration form needed.'}
                </p>
                <button
                  type="button"
                  className="CourseDetails__viewBtn"
                  onClick={startWithAccount}
                  disabled={starting}
                  style={{ border: 'none' }}
                >
                  <FiPlayCircle />
                  {starting
                    ? 'Starting…'
                    : course.status === 'coming_soon'
                      ? 'Notify me'
                      : 'View course'}
                </button>
                {formMsg ? <p className="CourseDetails__formMsg">{formMsg}</p> : null}
                {formError ? (
                  <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{formError}</p>
                ) : null}
              </div>
            ) : null}

            {/* Guest form */}
            {registrationOpen && !isLoggedIn && !accessToken ? (
              <form className="CourseDetails__form" onSubmit={onEnroll}>
                <h3>
                  {course.status === 'coming_soon'
                    ? 'Notify me when available'
                    : 'Register to view this course'}
                </h3>
                <p className="CourseDetails__formLead">
                  {course.status === 'coming_soon'
                    ? 'We will email you as soon as lessons are published.'
                    : 'Complete the form below, then click View course to watch lessons.'}
                </p>
                <p className="CourseDetails__loginHint">
                  You can skip this form if you{' '}
                  <Link to="/login" state={loginState}>
                    log in with your MSP account
                  </Link>
                  {' '}(if you have one).
                </p>
                <div className="CourseDetails__formGrid">
                  <label>
                    Full name
                    <input
                      required
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      required
                      value={form.phone_number}
                      onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                    />
                  </label>
                  <label>
                    University ID
                    <input
                      required
                      value={form.university_id}
                      onChange={(e) => setForm((f) => ({ ...f, university_id: e.target.value }))}
                    />
                  </label>
                </div>
                <button type="submit" disabled={submitting}>
                  {submitting
                    ? 'Submitting…'
                    : course.status === 'coming_soon'
                      ? 'Notify me'
                      : 'Register'}
                </button>
                {formMsg ? <p className="CourseDetails__formMsg">{formMsg}</p> : null}
                {formError ? (
                  <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{formError}</p>
                ) : null}
              </form>
            ) : null}

            {registrationOpen && accessToken && course.status === 'coming_soon' ? (
              <p className="CourseDetails__formMsg" style={{ marginTop: 16 }}>
                You&apos;re on the notify list. We&apos;ll email you when this course is published.
              </p>
            ) : null}
          </div>
        </div>

        {course.status === 'coming_soon' ? (
          <div className="CourseDetails__locked">
            Lessons unlock when the course is published. Register above to be first to know.
          </div>
        ) : null}

        {course.status === 'published' && !accessToken ? (
          <div className="CourseDetails__locked">
            {isLoggedIn
              ? 'Click View course above to start — we’ll use your MSP account.'
              : (
                <>
                  Register with the form above to unlock <strong>View course</strong>, or{' '}
                  <Link to="/login" state={loginState}>log in with your MSP account</Link> to skip it.
                </>
              )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

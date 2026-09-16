import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiPlayCircle, FiAlertCircle, FiInfo, FiCheckCircle, FiUserPlus, FiArrowLeft } from 'react-icons/fi';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import SeasonBadge from '../components/SeasonBadge';
import mspLogo from '../assets/Images/msp-logo.png';
import { courseAccessTokenKey } from '../utils/youtube';
import './Courses.css';

const emptyForm = () => ({
  full_name: '',
  email: '',
  phone_number: '',
  university_id: '',
  attendance_type: 'live_attendance'
});

/**
 * Reusable Attendee Type Selector highlighting live attendance perks & tutor mentorship
 */
export function AttendeeTypeSelector({ value, onChange, maxAttendance, name = 'attendance_type' }) {
  const absenceText = maxAttendance !== null && maxAttendance !== undefined && Number.isFinite(Number(maxAttendance))
    ? (Number(maxAttendance) === 0
        ? '0 missed sessions allowed (100% attendance required for certificate)'
        : `${maxAttendance} missed session${Number(maxAttendance) > 1 ? 's' : ''} allowed for certificate`)
    : 'Attendance is mandatory (absence limit defined per course by instructor)';

  return (
    <div className="CourseDetails__typeSelector">
      <span className="CourseDetails__typeSelectorTitle">
        Participation &amp; Attendance Track *
      </span>
      <div className="CourseDetails__typeCards">
        {/* Option 1: Live Attendance & Mentorship */}
        <label
          className={`CourseDetails__typeCard CourseDetails__typeCard--highlight ${value === 'live_attendance' ? 'CourseDetails__typeCard--active' : ''}`}
        >
          <div className="CourseDetails__typeCardTop">
            <input
              type="radio"
              name={name}
              value="live_attendance"
              checked={value === 'live_attendance'}
              onChange={() => onChange('live_attendance')}
            />
            <div className="CourseDetails__typeCardHead">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="CourseDetails__typeCardLabel">Live Attendance &amp; Mentorship</span>
                <span className="CourseDetails__typeBadge CourseDetails__typeBadge--featured">⭐ Best Experience</span>
              </div>
              <span className="CourseDetails__typeBadge CourseDetails__typeBadge--live">In-Person / Live</span>
            </div>
          </div>

          <div className="CourseDetails__typeCardPerks">
            <div className="CourseDetails__typePerk">
              <FiCheckCircle className="CourseDetails__perkIcon" />
              <span><strong>Tutor &amp; Mentor Guidance:</strong> Dedicated tutors assist you through assignments, troubleshoot bugs, and guide your journey.</span>
            </div>
            <div className="CourseDetails__typePerk">
              <FiCheckCircle className="CourseDetails__perkIcon" />
              <span><strong>Live Troubleshooting:</strong> Ask questions in real time and get unblocked immediately during sessions.</span>
            </div>
            <div className="CourseDetails__typePerk">
              <FiCheckCircle className="CourseDetails__perkIcon" />
              <span><strong>Official Certificate:</strong> Eligible for the MSP Certificate of Completion upon finishing.</span>
            </div>
          </div>

          <div className="CourseDetails__typeCardAlert">
            <FiAlertCircle />
            <span>
              <strong>Commitment &amp; Absence Limit:</strong> Requires active participation. {absenceText}.
            </span>
          </div>
        </label>

        {/* Option 2: Watch Recordings Only */}
        <label
          className={`CourseDetails__typeCard ${value === 'recordings_only' ? 'CourseDetails__typeCard--active' : ''}`}
        >
          <div className="CourseDetails__typeCardTop">
            <input
              type="radio"
              name={name}
              value="recordings_only"
              checked={value === 'recordings_only'}
              onChange={() => onChange('recordings_only')}
            />
            <div className="CourseDetails__typeCardHead">
              <span className="CourseDetails__typeCardLabel">Watch Recordings Only</span>
              <span className="CourseDetails__typeBadge CourseDetails__typeBadge--recorded">Self-Paced / Remote</span>
            </div>
          </div>
          <p className="CourseDetails__typeCardDesc">
            Watch recorded session videos on your own schedule. Self-paced independent study without live meeting obligations.
          </p>
          <div className="CourseDetails__typeCardInfo">
            <FiInfo />
            <span>Flexible self-study. Note: Does not include live tutor mentorship, interactive group tasks, or certificate eligibility.</span>
          </div>
        </label>
      </div>
    </div>
  );
}

export default function CourseRegister() {
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
  const [accountAttendanceType, setAccountAttendanceType] = useState('live_attendance');
  const [authChecked, setAuthChecked] = useState(false);
  const [starting, setStarting] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [registeredAttendanceType, setRegisteredAttendanceType] = useState('live_attendance');
  const [fetchingEnrollment, setFetchingEnrollment] = useState(false);
  const [updatingName, setUpdatingName] = useState(false);
  const [nameEditMsg, setNameEditMsg] = useState(null);
  const [nameEditError, setNameEditError] = useState(null);

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
    setFormMsg(null);
    setFormError(null);

    const emailTrimmed = String(form.email || '').trim();
    const miuEmailRegex = /^[^\s@]+@miuegypt\.edu\.eg$/i;
    if (!miuEmailRegex.test(emailTrimmed)) {
      setFormError('Only @miuegypt.edu.eg email addresses are allowed');
      return;
    }

    setSubmitting(true);
    try {
      const result = await ApiService.enrollInCourse(courseId, {
        ...form,
        email: emailTrimmed
      });
      persistToken(result.data?.access_token);
      setFormMsg(result.message || 'Registered successfully!');
      setForm(emptyForm());
    } catch (err) {
      if (err.status === 409 && err.data?.access_token) {
        persistToken(err.data.access_token);
        setFormMsg('You are already registered for this course.');
      } else {
        setFormError(err.message || 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startWithAccount = async () => {
    setStarting(true);
    setFormError(null);
    setFormMsg(null);
    try {
      let token = accessToken;
      if (!token) {
        const result = await ApiService.enrollInCourseWithAccount(courseId, {
          attendance_type: accountAttendanceType
        });
        token = result.data?.access_token;
        persistToken(token);
        setFormMsg(result.message || 'Enrolled successfully with your MSP account!');
      }
      if (course?.status === 'published' && token) {
        navigate(`/courses/${courseId}/learn?token=${encodeURIComponent(token)}`);
      }
    } catch (err) {
      setFormError(err.message || 'Could not enroll with your MSP account');
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (Number.isFinite(courseId) && accessToken) {
      (async () => {
        try {
          setFetchingEnrollment(true);
          const progress = await ApiService.getCourseMyProgress(courseId, accessToken);
          if (!cancelled && progress) {
            if (progress.full_name) {
              setRegisteredName(progress.full_name);
            }
            if (progress.attendance_type) {
              setRegisteredAttendanceType(progress.attendance_type);
            }
          }
        } catch (err) {
          console.error('Failed to fetch enrollment details:', err);
        } finally {
          if (!cancelled) setFetchingEnrollment(false);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [courseId, accessToken]);

  const handleUpdateRegistration = async (e) => {
    e.preventDefault();
    setNameEditMsg(null);
    setNameEditError(null);

    if (!registeredName.trim()) {
      setNameEditError('Name cannot be empty');
      return;
    }

    setUpdatingName(true);
    try {
      const result = await ApiService.updateCourseEnrollmentName(courseId, {
        token: accessToken,
        full_name: registeredName,
        attendance_type: registeredAttendanceType
      });
      setNameEditMsg(result.message || 'Registration details updated successfully');
    } catch (err) {
      setNameEditError(err.message || 'Failed to update registration details');
    } finally {
      setUpdatingName(false);
    }
  };

  if (loading || !authChecked) return <PageLoader />;
  if (error || !course) {
    return (
      <div className="CourseDetails">
        <div className="CourseDetails__container">
          <BackButton to="/courses" label="Back to Courses" />
          <div className="CoursesPage__empty">{error || 'Course not found'}</div>
        </div>
      </div>
    );
  }

  const registrationOpen = course.status === 'coming_soon' || course.status === 'published';
  const learnPath = `/courses/${courseId}/learn${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`;
  const loginState = { from: { pathname: `/courses/${courseId}/register` } };

  return (
    <div className="CourseRegisterPage">
      <SEO
        title={`Register for ${course.title} | MSP Courses`}
        description={`Join ${course.title} with MSP Tech Club at MIU.`}
        keywords={`MSP course registration, ${course.title}, MIU`}
        url={`/courses/${course.course_id || courseId}/register`}
        image={course.thumbnail_url || undefined}
      />
      <div className="CourseRegisterPage__container">
        <BackButton to={`/courses/${courseId}`} label="Back to Course Details" />

        <div className="CourseRegisterPage__header">
          <div className="CourseDetails__headerBadges">
            <span className={`CoursesPage__badge CoursesPage__badge--${course.status}`}>
              {course.status === 'coming_soon' ? 'Coming soon' : 'Available'}
            </span>
            {course.season && <SeasonBadge season={course.season} />}
          </div>
          <h1 className="CourseRegisterPage__title">
            Register for {course.title}
          </h1>
          <p className="CourseRegisterPage__subtitle">
            Secure your spot, choose your attendance track, and start your learning journey.
          </p>
        </div>

        {/* Compact Course Info Card */}
        <div className="CourseRegisterPage__courseCard">
          <div className="CourseRegisterPage__cardMedia">
            <img
              src={course.thumbnail_url || mspLogo}
              alt={course.title}
              onError={(e) => { e.currentTarget.src = mspLogo; }}
            />
          </div>
          <div className="CourseRegisterPage__cardInfo">
            <h3>{course.title}</h3>
            <div className="CourseRegisterPage__cardBadges">
              <span className="CourseRegisterPage__spec">
                Allowed Absence: <strong>{course.max_attendance !== null && course.max_attendance !== undefined ? `${course.max_attendance} session(s)` : 'Per policy'}</strong>
              </span>
              <span className="CourseRegisterPage__spec">
                Mode: <strong>Live &amp; Recordings</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Success Confirmation State */}
        {formMsg && (
          <div className="CourseRegisterPage__successCard">
            <div className="CourseRegisterPage__successIcon">
              <FiCheckCircle size={36} />
            </div>
            <h3>{formMsg}</h3>
            <p>
              Your registration is confirmed. You will receive course updates and access as sessions begin.
            </p>
            <div className="CourseRegisterPage__successActions">
              {course.status === 'published' ? (
                <Link to={learnPath} className="CourseDetails__viewBtn" style={{ textDecoration: 'none' }}>
                  <FiPlayCircle /> Start Course Now
                </Link>
              ) : (
                <Link to={`/courses/${courseId}`} className="CourseDetails__viewBtn" style={{ textDecoration: 'none' }}>
                  <FiArrowLeft /> Back to Course Overview
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Form area (if not already succeeded) */}
        {!formMsg && (
          <>
            {/* Logged-in MSP member fast enrollment */}
            {registrationOpen && isLoggedIn && !accessToken ? (
              <div className="CourseDetails__form CourseDetails__accountBox">
                <h3>Register with your MSP account</h3>
                <p className="CourseDetails__formLead">
                  Signed in as <strong>{accountName || 'MSP member'}</strong>.
                </p>

                <AttendeeTypeSelector
                  value={accountAttendanceType}
                  onChange={setAccountAttendanceType}
                  maxAttendance={course.max_attendance}
                  name="account_attendance_type"
                />

                <button
                  type="button"
                  className="CourseDetails__viewBtn"
                  onClick={startWithAccount}
                  disabled={starting}
                  style={{ border: 'none', width: '100%', justifyContent: 'center', marginTop: 14 }}
                >
                  <FiUserPlus />
                  {starting ? 'Registering…' : 'Register with Account'}
                </button>
                {formError ? (
                  <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{formError}</p>
                ) : null}
              </div>
            ) : null}

            {/* Guest Registration Form */}
            {registrationOpen && !isLoggedIn && !accessToken ? (
              <form className="CourseDetails__form" onSubmit={onEnroll}>
                <h3>Register for This Course</h3>
                <p className="CourseDetails__formLead">
                  Complete the registration form to choose your attendance track and secure your spot.
                </p>
                <p className="CourseDetails__loginHint">
                  Already have an MSP MIU account?{' '}
                  <Link to="/login" state={loginState}>
                    Log in here
                  </Link>
                  {' '}to enroll in one click.
                </p>
                <div className="CourseDetails__formGrid">
                  <label>
                    Full name *
                    <input
                      required
                      placeholder="e.g. Ahmed Mohamed"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    Email (@miuegypt.edu.eg) *
                    <input
                      required
                      type="email"
                      placeholder="name2398765@miuegypt.edu.eg"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </label>
                  <label>
                    Phone number *
                    <input
                      required
                      placeholder="01xxxxxxxxx"
                      value={form.phone_number}
                      onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                    />
                  </label>
                  <label>
                    University ID *
                    <input
                      required
                      placeholder="e.g. 2023/12345"
                      value={form.university_id}
                      onChange={(e) => setForm((f) => ({ ...f, university_id: e.target.value }))}
                    />
                  </label>
                </div>

                <AttendeeTypeSelector
                  value={form.attendance_type}
                  onChange={(val) => setForm((f) => ({ ...f, attendance_type: val }))}
                  maxAttendance={course.max_attendance}
                  name="guest_attendance_type"
                />

                <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 14 }}>
                  <FiUserPlus style={{ marginRight: 6 }} />
                  {submitting ? 'Registering…' : 'Register for Course'}
                </button>
                {formError ? (
                  <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{formError}</p>
                ) : null}
              </form>
            ) : null}

            {/* Already registered (coming_soon): update details */}
            {registrationOpen && accessToken && course.status === 'coming_soon' ? (
              <div className="CourseDetails__form CourseDetails__editBox">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4caf50', fontWeight: 600, fontSize: '1.05rem' }}>
                  <FiCheckCircle size={22} />
                  <span>You are registered for this course!</span>
                </div>
                <p className="CourseDetails__formLead" style={{ marginTop: 8 }}>
                  You are on the registration roster. You can update your name or switch your attendance track below before sessions begin:
                </p>

                {fetchingEnrollment ? (
                  <p className="CourseDetails__formMsg">Loading current registration details...</p>
                ) : (
                  <form onSubmit={handleUpdateRegistration}>
                    <div className="CourseDetails__formGrid" style={{ marginBottom: 12 }}>
                      <label>
                        Full Name (printed on certificate)
                        <input
                          required
                          type="text"
                          value={registeredName}
                          onChange={(e) => setRegisteredName(e.target.value)}
                        />
                      </label>
                    </div>

                    <AttendeeTypeSelector
                      value={registeredAttendanceType}
                      onChange={setRegisteredAttendanceType}
                      maxAttendance={course.max_attendance}
                      name="registered_attendance_type"
                    />

                    <button
                      type="submit"
                      disabled={updatingName || !registeredName.trim()}
                      style={{ width: '100%', marginTop: 14 }}
                    >
                      {updatingName ? 'Saving...' : 'Save Changes'}
                    </button>
                    {nameEditMsg ? <p className="CourseDetails__formMsg" style={{ color: '#4caf50' }}>{nameEditMsg}</p> : null}
                    {nameEditError ? (
                      <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{nameEditError}</p>
                    ) : null}
                  </form>
                )}
              </div>
            ) : null}

            {/* Already registered and course published */}
            {registrationOpen && accessToken && course.status === 'published' ? (
              <div className="CourseDetails__form CourseDetails__accountBox" style={{ textAlign: 'center' }}>
                <FiCheckCircle size={44} style={{ color: '#4caf50', marginBottom: 12 }} />
                <h3>You are already enrolled!</h3>
                <p className="CourseDetails__formLead">
                  You have full access to this course on this device.
                </p>
                <Link to={learnPath} className="CourseDetails__viewBtn" style={{ textDecoration: 'none', width: '100%', justifyContent: 'center', marginTop: 16 }}>
                  <FiPlayCircle /> Start Course Now
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiPlayCircle, FiAlertCircle, FiInfo, FiUsers, FiCheckCircle } from 'react-icons/fi';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import SeasonBadge from '../components/SeasonBadge';
import { FormattedText } from '../utils/formatMarkdown';
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
 * Reusable Attendee Type Selector (Live Attendance & Activities vs Watch Recordings Only)
 */
function AttendeeTypeSelector({ value, onChange, maxAttendance, name = 'attendance_type' }) {
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
        {/* Option 1: Live Attendance & Activities */}
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
        const result = await ApiService.enrollInCourseWithAccount(courseId, {
          attendance_type: accountAttendanceType
        });
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
          console.error('Failed to fetch enrollment progress:', err);
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
      <SEO
        title={`${course.title} | MSP Courses`}
        description={course.description || `Learn ${course.title} with MSP Tech Club at MIU.`}
        keywords={`MSP course, ${course.title}, MIU`}
        url={`/courses/${course.course_id || courseId}`}
        image={course.thumbnail_url || undefined}
        type="article"
      />
      <div className="CourseDetails__container">
        <BackButton to="/courses" />

        {/* Top Header */}
        <header className="CourseDetails__header">
          <div className="CourseDetails__headerBadges">
            <span className={`CoursesPage__badge CoursesPage__badge--${course.status}`}>
              {course.status === 'coming_soon'
                ? 'Coming soon'
                : course.status === 'published'
                  ? 'Available'
                  : course.status}
            </span>
            {course.season && <SeasonBadge season={course.season} />}
          </div>
          <h1 className="CourseDetails__title">{course.title}</h1>
        </header>

        {/* 2-Column Responsive Layout */}
        <div className="CourseDetails__splitLayout">
          {/* Main Content Column (Left, ~62%) */}
          <main className="CourseDetails__mainCol">
            {/* Overview & Description Card */}
            <div className="CourseDetails__overviewCard">
              <h2 className="CourseDetails__sectionHeading">Course Overview</h2>
              {course.description ? (
                <div className="CourseDetails__descriptionContent">
                  <FormattedText text={course.description} className="CourseDetails__formattedDesc" />
                </div>
              ) : (
                <p style={{ color: '#A8C2D6' }}>No detailed overview provided yet.</p>
              )}
            </div>

            {/* Attendance & Commitment Policy Card */}
            <div className="CourseDetails__policyCard">
              <h3 className="CourseDetails__policyHeading">
                <FiUsers style={{ marginRight: 8, verticalAlign: 'middle', color: '#03A9F4' }} />
                Participation &amp; Attendance Tracks
              </h3>
              <p className="CourseDetails__policySub">
                To fit your learning goals and availability, this course offers two distinct enrollment options. Choosing Live Attendance gives you hands-on mentorship throughout your journey:
              </p>
              <div className="CourseDetails__policyGrid">
                <div className="CourseDetails__policyItem CourseDetails__policyItem--live">
                  <div className="CourseDetails__policyTag">⭐ Recommended • Full Mentorship</div>
                  <h4>Live Attendance &amp; Guidance</h4>
                  <ul>
                    <li><strong>Dedicated Tutor Mentorship:</strong> Experienced tutors guide you through each topic, review your code/tasks, and assist you whenever you get stuck.</li>
                    <li><strong>Live Troubleshooting &amp; Q&amp;A:</strong> Interactive problem-solving during sessions with immediate answers from instructors.</li>
                    <li><strong>Hands-on Activities:</strong> Practice real challenges, collaborate with peers, and receive constructive feedback.</li>
                    <li><strong>Official Certificate:</strong> Earn the accredited MSP Certificate of Completion upon finishing.</li>
                    <li>
                      <strong>Absence limit:</strong>{' '}
                      {course.max_attendance !== null && course.max_attendance !== undefined
                        ? (Number(course.max_attendance) === 0
                            ? '0 missed sessions (100% attendance required for certificate)'
                            : `${course.max_attendance} missed session${Number(course.max_attendance) > 1 ? 's' : ''} allowed`)
                        : 'Attendance required (defined by course policy)'}.
                    </li>
                  </ul>
                </div>
                <div className="CourseDetails__policyItem CourseDetails__policyItem--recordings">
                  <div className="CourseDetails__policyTag">Self-Paced Track</div>
                  <h4>Watch Recordings Only</h4>
                  <ul>
                    <li>Full access to watch recorded session videos online at your own pace.</li>
                    <li>No mandatory live meeting attendance or activity deadlines.</li>
                    <li>Great for attendees with timetable conflicts or remote restrictions.</li>
                    <li><em>Note: Self-paced study does not include live tutor mentorship, interactive exercises, or certificate eligibility.</em></li>
                  </ul>
                </div>
              </div>
            </div>

            {course.status === 'coming_soon' ? (
              <div className="CourseDetails__lockedNotice">
                <FiInfo style={{ marginRight: 6, flexShrink: 0 }} />
                <span>
                  Lessons and materials will unlock once this course is published. Register below to be notified first and secure your spot!
                </span>
              </div>
            ) : null}
          </main>

          {/* Sticky Sidebar Column (Right, ~38%) */}
          <aside className="CourseDetails__sidebarCol">
            <div className="CourseDetails__stickySidebar">
              {/* Media Card */}
              <div className="CourseDetails__thumb">
                <img
                  src={course.thumbnail_url || mspLogo}
                  alt={course.title}
                  onError={(e) => { e.currentTarget.src = mspLogo; }}
                />
              </div>

              {/* Quick Info Specs */}
              <div className="CourseDetails__quickSpecs">
                <div className="CourseDetails__specItem">
                  <span className="CourseDetails__specLabel">Status</span>
                  <span className="CourseDetails__specValue">
                    {course.status === 'coming_soon' ? 'Coming Soon' : 'Available Now'}
                  </span>
                </div>
                <div className="CourseDetails__specItem">
                  <span className="CourseDetails__specLabel">Attendance Modes</span>
                  <span className="CourseDetails__specValue">Live &amp; Recorded</span>
                </div>
                <div className="CourseDetails__specItem">
                  <span className="CourseDetails__specLabel">Allowed Absence</span>
                  <span className="CourseDetails__specValue">
                    {course.max_attendance !== null && course.max_attendance !== undefined
                      ? `${course.max_attendance} session${Number(course.max_attendance) > 1 ? 's' : ''}`
                      : 'Per Course Policy'}
                  </span>
                </div>
              </div>

              {/* Registered View Button (when course published) */}
              {canViewCourse ? (
                <div className="CourseDetails__viewWrap">
                  <Link to={learnPath} className="CourseDetails__viewBtn" style={{ width: '100%', justifyContent: 'center' }}>
                    <FiPlayCircle />
                    View course
                  </Link>
                  <p className="CourseDetails__formMsg">
                    You&apos;re registered on this device. Open the course anytime.
                  </p>
                </div>
              ) : null}

              {/* Logged-in MSP member box */}
              {registrationOpen && isLoggedIn && !accessToken ? (
                <div className="CourseDetails__form CourseDetails__accountBox">
                  <h3>
                    {course.status === 'coming_soon'
                      ? 'Get notified with your MSP account'
                      : 'Start with your MSP account'}
                  </h3>
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
                    style={{ border: 'none', width: '100%', justifyContent: 'center', marginTop: 12 }}
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

              {/* Guest registration form */}
              {registrationOpen && !isLoggedIn && !accessToken ? (
                <form className="CourseDetails__form" onSubmit={onEnroll}>
                  <h3>
                    {course.status === 'coming_soon'
                      ? 'Notify me when available'
                      : 'Register for this course'}
                  </h3>
                  <p className="CourseDetails__formLead">
                    {course.status === 'coming_soon'
                      ? 'We will email you as soon as lessons are published.'
                      : 'Complete the form below to watch lessons.'}
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
                      Email (@miuegypt.edu.eg)
                      <input
                        required
                        type="email"
                        placeholder="name2398765@miuegypt.edu.eg"
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

                  <AttendeeTypeSelector
                    value={form.attendance_type}
                    onChange={(val) => setForm((f) => ({ ...f, attendance_type: val }))}
                    maxAttendance={course.max_attendance}
                    name="guest_attendance_type"
                  />

                  <button type="submit" disabled={submitting} style={{ width: '100%', marginTop: 12 }}>
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

              {/* Already registered (coming_soon): update details */}
              {registrationOpen && accessToken && course.status === 'coming_soon' ? (
                <div className="CourseDetails__form CourseDetails__editBox">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4caf50', fontWeight: 600, fontSize: '0.95rem' }}>
                    <FiCheckCircle />
                    <span>You&apos;re registered on the notify list!</span>
                  </div>
                  <p className="CourseDetails__formLead" style={{ marginTop: 8 }}>
                    We will email you when this course is published. You can adjust your registration track and name below before the course starts.
                  </p>

                  {fetchingEnrollment ? (
                    <p className="CourseDetails__formMsg">Loading registration details...</p>
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
                        style={{ width: '100%', marginTop: 12 }}
                      >
                        {updatingName ? 'Saving...' : 'Update Details'}
                      </button>
                      {nameEditMsg ? <p className="CourseDetails__formMsg" style={{ color: '#4caf50' }}>{nameEditMsg}</p> : null}
                      {nameEditError ? (
                        <p className="CourseDetails__formMsg CourseDetails__formMsg--error">{nameEditError}</p>
                      ) : null}
                    </form>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


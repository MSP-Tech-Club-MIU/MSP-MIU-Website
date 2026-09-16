import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiPlayCircle,
  FiInfo,
  FiUsers,
  FiCheckCircle,
  FiUserPlus,
  FiEdit2,
  FiAward,
  FiClock,
  FiCheck,
  FiMaximize2,
  FiX
} from 'react-icons/fi';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import SeasonBadge from '../components/SeasonBadge';
import { FormattedText } from '../utils/formatMarkdown';
import mspLogo from '../assets/Images/msp-logo.png';
import { courseAccessTokenKey } from '../utils/youtube';
import './Courses.css';

/**
 * Course Details Page
 * Displays full uncropped thumbnail, course overview, tutor mentorship & attendance policy,
 * and prominent action CTA linking to the dedicated registration page (/courses/:id/register).
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
  const [accessToken, setAccessToken] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [registeredAttendanceType, setRegisteredAttendanceType] = useState('');
  const [fetchingEnrollment, setFetchingEnrollment] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

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

  // Fetch enrollment details if user has an access token
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

  if (loading) return <PageLoader />;
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

  const isEnrolled = !!accessToken;
  const canViewCourse = course.status === 'published' && isEnrolled;
  const learnPath = `/courses/${courseId}/learn${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`;
  const registerPath = `/courses/${courseId}/register${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`;

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
        <BackButton to="/courses" label="Back to Courses" />

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

        {/* 2-Column Responsive Split Layout */}
        <div className="CourseDetails__splitLayout">
          {/* Main Content Column (Left, ~60%) */}
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

            {/* Attendance & Participation Tracks Policy Card */}
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

            {/* Bottom Register CTA Banner */}
            <div className="CourseDetails__bottomCta">
              <div className="CourseDetails__bottomCtaContent">
                <h3>Ready to start learning {course.title}?</h3>
                <p>
                  Join fellow students in the live mentorship track or follow along with on-demand recordings.
                </p>
              </div>
              <div className="CourseDetails__bottomCtaAction">
                {canViewCourse ? (
                  <Link to={learnPath} className="CourseDetails__ctaBtn CourseDetails__ctaBtn--primary">
                    <FiPlayCircle /> Start Learning Now
                  </Link>
                ) : (
                  <Link to={registerPath} className="CourseDetails__ctaBtn CourseDetails__ctaBtn--primary">
                    <FiUserPlus />
                    {isEnrolled ? 'Edit Registration' : 'Register for Course'}
                  </Link>
                )}
              </div>
            </div>
          </main>

          {/* Sidebar Column (Right, ~40%) */}
          <aside className="CourseDetails__sidebarCol">
            <div className="CourseDetails__stickySidebar">
              {/* Full Uncropped Thumbnail Showcase with Lightbox Zoom */}
              <div
                className="CourseDetails__thumbFull"
                onClick={() => setImageModalOpen(true)}
                title="Click to view full image in high resolution"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setImageModalOpen(true); }}
              >
                <img
                  src={course.thumbnail_url || mspLogo}
                  alt={course.title}
                  className="CourseDetails__thumbImg"
                  onError={(e) => { e.currentTarget.src = mspLogo; }}
                />
                <span className="CourseDetails__zoomBadge">
                  <FiMaximize2 /> Expand Poster
                </span>
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

              {/* Registration Call To Action Card */}
              <div className="CourseDetails__actionCard">
                <h3 className="CourseDetails__actionTitle">Course Registration</h3>
                <p className="CourseDetails__actionDesc">
                  Registration is open. Register now to secure your spot and choose your preferred attendance track.
                </p>

                {/* State 1: Enrolled and Course Published */}
                {canViewCourse ? (
                  <div className="CourseDetails__enrolledBox">
                    <div className="CourseDetails__enrolledStatus">
                      <FiCheckCircle size={20} color="#4caf50" />
                      <span>You are registered on this device</span>
                    </div>
                    <Link to={learnPath} className="CourseDetails__ctaBtn CourseDetails__ctaBtn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <FiPlayCircle /> Start Course
                    </Link>
                  </div>
                ) : null}

                {/* State 2: Enrolled and Course Coming Soon */}
                {isEnrolled && course.status === 'coming_soon' ? (
                  <div className="CourseDetails__enrolledBox">
                    <div className="CourseDetails__enrolledStatus">
                      <FiCheckCircle size={20} color="#4caf50" />
                      <span>
                        Registered for course
                        {registeredAttendanceType
                          ? ` (${registeredAttendanceType === 'recordings_only' ? 'Recordings' : 'Live Track'})`
                          : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#A8C2D6', margin: '6px 0 14px' }}>
                      You are registered for this course. You can update your registration details anytime.
                    </p>
                    <Link to={registerPath} className="CourseDetails__ctaBtn CourseDetails__ctaBtn--outline" style={{ width: '100%', justifyContent: 'center' }}>
                      <FiEdit2 /> Edit Registration Details
                    </Link>
                  </div>
                ) : null}

                {/* State 3: Not Enrolled Yet */}
                {!isEnrolled ? (
                  <div className="CourseDetails__notEnrolledBox">
                    <Link to={registerPath} className="CourseDetails__ctaBtn CourseDetails__ctaBtn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <FiUserPlus />
                      <span>Register for Course</span>
                    </Link>
                    <p className="CourseDetails__ctaSub">
                      Includes choice of <strong>Live Attendance with Tutor Mentorship</strong> or <strong>Recordings Only</strong>.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Lightbox Modal for Full Poster Preview */}
      {imageModalOpen && (
        <div className="CourseDetails__lightboxOverlay" onClick={() => setImageModalOpen(false)}>
          <div className="CourseDetails__lightboxContent" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="CourseDetails__lightboxClose"
              onClick={() => setImageModalOpen(false)}
              aria-label="Close image preview"
            >
              <FiX size={22} />
            </button>
            <img
              src={course.thumbnail_url || mspLogo}
              alt={course.title}
              className="CourseDetails__lightboxImg"
            />
            <div className="CourseDetails__lightboxCaption">
              <span>{course.title}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

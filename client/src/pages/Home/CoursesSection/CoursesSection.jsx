import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiArrowRight } from 'react-icons/fi';
import './CoursesSection.css';
import ApiService from '../../../services/api';
import SeasonBadge from '../../../components/SeasonBadge';
import { useSeason } from '../../../context/SeasonContext';
import mspLogo from '../../../assets/Images/msp-logo.png';

const STATUS_LABELS = {
  published: 'Available',
  coming_soon: 'Coming soon',
  archived: 'Archived'
};

const CoursesSection = memo(() => {
  const { seasonFilters, isAll, defaultSeasonId } = useSeason();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchCourses = async () => {
      try {
        setLoading(true);
        // Request up to 3 courses for the active season
        let result = await ApiService.getCourses({ limit: 3, page: 1, ...seasonFilters });
        let list = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);

        // If the active season has no courses yet and we're not already viewing 'all', fallback to all available courses
        if (list.length === 0 && !isAll) {
          const fallbackResult = await ApiService.getCourses({ limit: 3, page: 1, season_id: 'all' });
          const fallbackList = Array.isArray(fallbackResult?.data) ? fallbackResult.data : [];
          if (fallbackList.length > 0) {
            list = fallbackList;
          }
        }

        if (!cancelled) {
          setCourses(list);
        }
      } catch (err) {
        console.error('Error fetching courses for home page:', err);
        if (!cancelled) {
          setCourses([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCourses();
    return () => {
      cancelled = true;
    };
  }, [seasonFilters, isAll]);

  const getImageSrc = useCallback((thumbnailUrl) => {
    if (!thumbnailUrl) return mspLogo;
    if (typeof thumbnailUrl === 'string' && (thumbnailUrl.startsWith('http') || thumbnailUrl.startsWith('/'))) {
      return thumbnailUrl;
    }
    return mspLogo;
  }, []);

  const initialAnimation = useMemo(() => ({ opacity: 0, y: 30 }), []);
  const whileInViewAnimation = useMemo(() => ({ opacity: 1, y: 0 }), []);
  const viewportProps = useMemo(() => ({ once: true, amount: 0.2 }), []);
  const hoverAnimation = useMemo(() => ({ y: -10, boxShadow: '0 14px 40px -12px rgba(0,0,0,.65), 0 0 0 1px rgba(0,119,204,.5)' }), []);
  const buttonHoverAnimation = useMemo(() => ({ scale: 1.07 }), []);
  const buttonTapAnimation = useMemo(() => ({ scale: 0.92 }), []);

  return (
    <section className="CoursesSection" aria-labelledby="courses-heading">
      <div className="CoursesSection__head">
        <div>
          <h2 id="courses-heading" className="CoursesSection__title">Explore Our Courses</h2>
          <p className="CoursesSection__subtitle">
            Master high-demand technical skills with curated lessons, video tutorials, and practical materials.
          </p>
        </div>
      </div>

      <div className="CoursesSection__grid">
        {loading ? (
          <div className="CoursesSection__empty">
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="CoursesSection__empty">
            <FiBookOpen size={36} style={{ marginBottom: '12px', opacity: 0.8 }} />
            <p>New courses coming soon. Stay tuned!</p>
          </div>
        ) : (
          courses.map((course) => {
            const isDifferentSeason = course.season_id && defaultSeasonId && course.season_id !== defaultSeasonId;
            const showSeasonBadge = isAll || isDifferentSeason;
            const statusKey = course.status || 'published';
            const statusLabel = STATUS_LABELS[statusKey] || statusKey;

            return (
              <motion.article
                key={course.course_id}
                className="CourseCard"
                initial={initialAnimation}
                whileInView={whileInViewAnimation}
                viewport={viewportProps}
                whileHover={hoverAnimation}
                onClick={() => navigate(`/courses/${course.course_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/courses/${course.course_id}`);
                }}
              >
                <div
                  className="CourseCard__media"
                  style={{
                    backgroundImage: `url(${getImageSrc(course.thumbnail_url)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <span className={`CourseCard__badge CourseCard__badge--${statusKey}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="CourseCard__body">
                  <h3 className="CourseCard__title">
                    {course.title}
                    {showSeasonBadge && course.season && (
                      <> {' '}<SeasonBadge season={course.season} /></>
                    )}
                  </h3>

                  {course.description && (
                    <p className="CourseCard__description">
                      {String(course.description).slice(0, 110)}
                      {String(course.description).length > 110 ? '…' : ''}
                    </p>
                  )}

                  <motion.button
                    className="CourseCard__btn"
                    whileHover={buttonHoverAnimation}
                    whileTap={buttonTapAnimation}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/courses/${course.course_id}`);
                    }}
                  >
                    View Course
                  </motion.button>
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      {!loading && courses.length > 0 && (
        <div className="CoursesSection__seeMoreContainer">
          <motion.button
            className="CoursesSection__seeMoreBtn"
            onClick={() => navigate('/courses')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore All Courses <FiArrowRight style={{ marginLeft: '8px' }} />
          </motion.button>
        </div>
      )}
    </section>
  );
});

CoursesSection.displayName = 'CoursesSection';

export default CoursesSection;

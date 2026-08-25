import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen } from 'react-icons/fi';
import SEO from '../components/SEO';
import ApiService from '../services/api';
import PageLoader from '../components/PageLoader';
import BackButton from '../components/BackButton';
import Pagination from '../components/Pagination';
import SeasonBadge from '../components/SeasonBadge';
import SeasonSelector from '../components/SeasonSelector';
import { useSeason } from '../context/SeasonContext';
import mspLogo from '../assets/Images/msp-logo.png';
import './Courses.css';

const PAGE_SIZE = 6;

const STATUS_LABEL = {
  coming_soon: 'Coming soon',
  published: 'Available',
  archived: 'Archived'
};

export default function Courses() {
  const { seasonFilters, isAll } = useSeason();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCourses = async () => {
      const isPageChange = hasLoadedOnceRef.current;
      try {
        if (isPageChange) {
          setPageLoading(true);
          setCourses([]);
        } else {
          setInitialLoading(true);
        }
        setError(null);
        const filters = { page, limit: PAGE_SIZE, ...seasonFilters };
        if (filter !== 'all') filters.status = filter;
        const result = await ApiService.getCourses(filters);
        if (cancelled) return;
        setCourses(Array.isArray(result.data) ? result.data : []);
        setPagination(result.pagination || null);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load courses');
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setPageLoading(false);
        }
      }
    };
    fetchCourses();
    return () => { cancelled = true; };
  }, [page, filter, seasonFilters]);

  useEffect(() => {
    setPage(1);
  }, [filter, seasonFilters]);

  if (initialLoading) return <PageLoader />;

  return (
    <div className="CoursesPage">
      <SEO
        title="Courses | MSP Tech Club"
        description="Browse MSP Tech Club courses — lessons, videos, and materials."
        url="/courses"
      />
      <div className="CoursesPage__container">
        <BackButton />
        <header className="CoursesPage__header">
          <h1 className="CoursesPage__title">Courses</h1>
          <p className="CoursesPage__subtitle">
            Learn at your pace with structured lessons, YouTube videos, and downloadable materials.
          </p>
        </header>

        <div className="CoursesPage__controls">
          <div className="CoursesPage__filters">
            {[
              { id: 'all', label: 'All' },
              { id: 'published', label: 'Available' },
              { id: 'coming_soon', label: 'Coming soon' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`CoursesPage__filterBtn${filter === f.id ? ' active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
            <SeasonSelector />
          </div>
        </div>

        {error ? (
          <div className="CoursesPage__empty">{error}</div>
        ) : pageLoading ? (
          <div className="CoursesPage__empty">Loading…</div>
        ) : courses.length === 0 ? (
          <div className="CoursesPage__empty">
            <FiBookOpen size={40} />
            <p>No courses yet.</p>
          </div>
        ) : (
          <div className="CoursesPage__grid">
            {courses.map((course, index) => (
              <motion.article
                key={course.course_id}
                className="CoursesPage__card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/courses/${course.course_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/courses/${course.course_id}`);
                }}
              >
                <div className="CoursesPage__cardImage">
                  <img
                    src={course.thumbnail_url || mspLogo}
                    alt=""
                    onError={(e) => { e.currentTarget.src = mspLogo; }}
                  />
                  <span className={`CoursesPage__badge CoursesPage__badge--${course.status}`}>
                    {STATUS_LABEL[course.status] || course.status}
                  </span>
                </div>
                <div className="CoursesPage__cardBody">
                  <h2>
                    {course.title}
                    {isAll && (course.season || course.season_id) ? (
                      <>{' '}<SeasonBadge season={course.season} /></>
                    ) : null}
                  </h2>
                  {course.description ? (
                    <p>
                      {String(course.description).slice(0, 120)}
                      {String(course.description).length > 120 ? '…' : ''}
                    </p>
                  ) : null}
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            disabled={pageLoading}
          />
        ) : null}
      </div>
    </div>
  );
}

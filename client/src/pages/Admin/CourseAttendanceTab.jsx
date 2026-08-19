import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { FiDownload } from 'react-icons/fi';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';
import ApiService from '../../services/api';
import Pagination from '../../components/Pagination';
import { useSeason } from '../../context/SeasonContext';

const LIMIT = 20;

const emptyFilters = () => ({
  course_id: '',
  attended: '',
  search: ''
});

const CourseAttendanceTab = memo(({ onAlert, initialCourseId = null }) => {
  const { seasonFilters } = useSeason();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters(),
    course_id: initialCourseId ? String(initialCourseId) : ''
  }));
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (initialCourseId != null && initialCourseId !== '') {
      setFilters((prev) => ({ ...prev, course_id: String(initialCourseId) }));
      setPage(1);
    }
  }, [initialCourseId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [filters.search]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const result = await ApiService.getAdminCourses({ limit: 100, ...seasonFilters });
        setCourses(Array.isArray(result?.data) ? result.data : []);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [seasonFilters]);

  const fetchEnrollments = useCallback(async () => {
    try {
      if (!initialLoadDoneRef.current) setLoading(true);
      else setIsFiltering(true);

      const params = { page, limit: LIMIT };
      if (filters.course_id) params.course_id = filters.course_id;

      const result = await ApiService.getCourseEnrollments(params);
      setRows(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      console.error('Failed to load course attendance:', err);
      setRows([]);
      setPagination(null);
      onAlert?.({ type: 'error', message: err.message || 'Failed to load attendance.' });
    } finally {
      initialLoadDoneRef.current = true;
      setLoading(false);
      setIsFiltering(false);
    }
  }, [page, filters.course_id, onAlert]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    if (name !== 'search') setPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters());
    setDebouncedSearch('');
    setPage(1);
  };

  const displayedRows = useMemo(() => {
    let list = rows;
    if (filters.attended === 'true') list = list.filter((r) => r.attended);
    else if (filters.attended === 'false') list = list.filter((r) => !r.attended);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((r) => {
        const hay = [
          r.full_name,
          r.email,
          r.phone_number,
          r.university_id,
          r.course?.title,
          String(r.course_id)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [rows, filters.attended, debouncedSearch]);

  const handleAttendedChange = async (row, newAttended) => {
    if (Boolean(row.attended) === newAttended) return;
    try {
      setUpdatingIds((prev) => new Set(prev).add(row.enrollment_id));
      await ApiService.updateCourseEnrollment(
        row.enrollment_id,
        { attended: newAttended },
        row.course_id
      );
      setRows((prev) =>
        prev.map((r) =>
          r.enrollment_id === row.enrollment_id ? { ...r, attended: newAttended } : r
        )
      );
      onAlert?.({ type: 'success', message: 'Attendance updated.' });
    } catch (err) {
      console.error('Error updating attendance:', err);
      onAlert?.({ type: 'error', message: err.message || 'Failed to update attendance.' });
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.enrollment_id);
        return next;
      });
    }
  };

  const toggleExpanded = (enrollmentId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  };

  const exportToCSV = async () => {
    if ((pagination?.total ?? rows.length) === 0) {
      onAlert?.({ type: 'error', message: 'No data to export.' });
      return;
    }
    try {
      setIsExporting(true);
      const blob = await ApiService.exportCourseEnrollmentsCsv(
        filters.course_id || undefined
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course_attendance_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onAlert?.({ type: 'success', message: 'CSV export started.' });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      onAlert?.({ type: 'error', message: err.message || 'Failed to export CSV.' });
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    filters.course_id || filters.attended !== '' || filters.search
  );
  const attendedOnPage = displayedRows.filter((r) => r.attended).length;
  const notAttendedOnPage = displayedRows.filter((r) => !r.attended).length;
  const avgCompletion =
    displayedRows.length === 0
      ? 0
      : Math.round(
          displayedRows.reduce((sum, r) => sum + (r.completion_percent ?? 0), 0) /
            displayedRows.length
        );
  const totalCount = pagination?.total ?? rows.length;

  if (loading && !isFiltering) {
    return (
      <div className="AdminPanel__loading">
        <div className="AdminPanel__spinner" />
        <p>Loading attendance &amp; progress...</p>
      </div>
    );
  }

  return (
    <div className="AttendanceAdmin CourseAttendanceAdmin">
      <div className="AttendanceAdmin__toolbar">
        <p className="AttendanceAdmin__subtitle">
          Track session attendance and lesson completion for course attendees.
        </p>
        {totalCount > 0 && (
          <button
            type="button"
            className="AdminPanel__addBtn AttendanceAdmin__exportBtn"
            onClick={exportToCSV}
            disabled={isExporting}
          >
            <FiDownload />
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        )}
      </div>

      {(displayedRows.length > 0 || totalCount > 0) && (
        <div className="AttendanceAdmin__stats">
          <div className="AttendanceAdmin__stat">
            <span className="AttendanceAdmin__statValue">{totalCount}</span>
            <span className="AttendanceAdmin__statLabel">Total Attendees</span>
          </div>
          <div className="AttendanceAdmin__stat">
            <span className="AttendanceAdmin__statValue AttendanceAdmin__statValue--ok">
              {attendedOnPage}
            </span>
            <span className="AttendanceAdmin__statLabel">Attended (page)</span>
          </div>
          <div className="AttendanceAdmin__stat">
            <span className="AttendanceAdmin__statValue AttendanceAdmin__statValue--warn">
              {notAttendedOnPage}
            </span>
            <span className="AttendanceAdmin__statLabel">Not Attended (page)</span>
          </div>
          <div className="AttendanceAdmin__stat">
            <span className="AttendanceAdmin__statValue">{avgCompletion}%</span>
            <span className="AttendanceAdmin__statLabel">Avg Progress (page)</span>
          </div>
        </div>
      )}

      <div className="AttendanceAdmin__filters">
        <label className="AttendanceAdmin__field AttendanceAdmin__field--search">
          <span>Search</span>
          <input
            type="text"
            className="AdminPanel__filterInput"
            placeholder="Name, email, university ID, or course…"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </label>
        <label className="AttendanceAdmin__field">
          <span>Course</span>
          <select
            className="AdminPanel__filterSelect"
            value={filters.course_id}
            onChange={(e) => handleFilterChange('course_id', e.target.value)}
            disabled={loadingCourses}
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course.course_id} value={course.course_id}>
                {course.title || `Course ${course.course_id}`}
              </option>
            ))}
          </select>
        </label>
        <label className="AttendanceAdmin__field">
          <span>Attendance</span>
          <select
            className="AdminPanel__filterSelect"
            value={filters.attended}
            onChange={(e) => handleFilterChange('attended', e.target.value)}
          >
            <option value="">All</option>
            <option value="false">Not Attended</option>
            <option value="true">Attended</option>
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            className="AdminPanel__actionBtn AdminPanel__actionBtn--edit AttendanceAdmin__clearBtn"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        )}
      </div>

      {isFiltering && (
        <p className="AttendanceAdmin__filteringHint">Updating results...</p>
      )}

      {displayedRows.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>No attendees found.</p>
          <p>
            {hasActiveFilters
              ? 'Try adjusting your filters.'
              : 'There are no enrollments yet.'}
          </p>
        </div>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table">
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>Course</th>
                <th>Progress</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row) => {
                const isUpdating = updatingIds.has(row.enrollment_id);
                const isExpanded = expandedIds.has(row.enrollment_id);
                const percent = row.completion_percent ?? 0;
                const done = row.completed_count ?? (row.lessonProgress || []).length;
                const total = row.lesson_count ?? 0;
                const progressList = Array.isArray(row.lessonProgress)
                  ? row.lessonProgress
                  : [];

                return (
                  <React.Fragment key={row.enrollment_id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="CourseAttendanceAdmin__expandBtn"
                          onClick={() => toggleExpanded(row.enrollment_id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Hide lesson progress' : 'Show lesson progress'}
                          disabled={progressList.length === 0 && total === 0}
                        >
                          {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
                        </button>
                      </td>
                      <td>
                        <strong>{row.full_name}</strong>
                        <div className="AttendanceAdmin__mono" style={{ opacity: 0.75 }}>
                          {row.university_id || '—'}
                        </div>
                      </td>
                      <td>{row.course?.title || `Course ${row.course_id}`}</td>
                      <td>
                        <div className="CourseAttendanceAdmin__progress">
                          <div
                            className="CourseAttendanceAdmin__progressBar"
                            role="progressbar"
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
                          </div>
                          <span className="CourseAttendanceAdmin__progressLabel">
                            {percent}% ({done}/{total})
                          </span>
                        </div>
                      </td>
                      <td>
                        <select
                          className="AdminPanel__filterSelect AttendanceAdmin__statusSelect"
                          value={row.attended ? 'true' : 'false'}
                          disabled={isUpdating}
                          onChange={(e) => {
                            handleAttendedChange(row, e.target.value === 'true');
                          }}
                        >
                          <option value="false">Not Attended</option>
                          <option value="true">Attended</option>
                        </select>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="CourseAttendanceAdmin__detailRow">
                        <td colSpan={5}>
                          <div className="CourseAttendanceAdmin__detail">
                            <strong>Completed lessons</strong>
                            {progressList.length === 0 ? (
                              <p>No lessons marked complete yet.</p>
                            ) : (
                              <ul>
                                {progressList.map((p) => (
                                  <li key={`${row.enrollment_id}-${p.lesson_id}`}>
                                    Lesson #{p.lesson_id}
                                    {p.completed_at
                                      ? ` · ${new Date(p.completed_at).toLocaleString()}`
                                      : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <Pagination pagination={pagination} onPageChange={setPage} />
      ) : null}
    </div>
  );
});

CourseAttendanceTab.displayName = 'CourseAttendanceTab';

export default CourseAttendanceTab;

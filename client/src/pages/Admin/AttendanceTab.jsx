import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { FiDownload } from 'react-icons/fi';
import ApiService from '../../services/api';
import Pagination from '../../components/Pagination';

const LIMIT = 20;

const emptyFilters = () => ({
    event_id: '',
    attended: '',
    search: ''
});

const AttendanceTab = memo(({ onAlert }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [filters, setFilters] = useState(emptyFilters);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [updatingIds, setUpdatingIds] = useState(() => new Set());
    const [isExporting, setIsExporting] = useState(false);
    const initialLoadDoneRef = useRef(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(filters.search.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [filters.search]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoadingEvents(true);
                const result = await ApiService.getEvents({ limit: 100 });
                setEvents(Array.isArray(result?.data) ? result.data : []);
            } catch (err) {
                console.error('Error fetching events:', err);
                setEvents([]);
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchEvents();
    }, []);

    const fetchAttendance = useCallback(async () => {
        try {
            if (!initialLoadDoneRef.current) setLoading(true);
            else setIsFiltering(true);

            const params = { page, limit: LIMIT };
            if (filters.event_id) params.event_id = filters.event_id;
            if (filters.attended !== '') params.attended = filters.attended;
            if (debouncedSearch) params.search = debouncedSearch;

            const result = await ApiService.getAdminAttendance(params);
            setRequests(Array.isArray(result?.data) ? result.data : []);
            setPagination(result?.pagination || null);
        } catch (err) {
            console.error('Failed to load attendance:', err);
            setRequests([]);
            setPagination(null);
            onAlert?.({ type: 'error', message: err.message || 'Failed to load attendance.' });
        } finally {
            initialLoadDoneRef.current = true;
            setLoading(false);
            setIsFiltering(false);
        }
    }, [page, filters.event_id, filters.attended, debouncedSearch, onAlert]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const handleFilterChange = (name, value) => {
        setFilters((prev) => ({ ...prev, [name]: value }));
        if (name !== 'search') setPage(1);
    };

    const clearFilters = () => {
        setFilters(emptyFilters());
        setDebouncedSearch('');
        setPage(1);
    };

    const handleAttendedChange = async (requestId, currentAttended, newAttended) => {
        if (currentAttended === newAttended) return;
        try {
            setUpdatingIds((prev) => new Set(prev).add(requestId));
            await ApiService.updateAdminAttendance(requestId, newAttended);
            setRequests((prev) =>
                prev.map((req) =>
                    req.request_id === requestId ? { ...req, attended: newAttended } : req
                )
            );
            onAlert?.({ type: 'success', message: 'Attendance updated.' });
        } catch (err) {
            console.error('Error updating attendance:', err);
            onAlert?.({ type: 'error', message: err.message || 'Failed to update attendance.' });
        } finally {
            setUpdatingIds((prev) => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString)
                .toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                .replace(',', '');
        } catch {
            return dateString;
        }
    };

    const exportToCSV = async () => {
        if ((pagination?.total ?? requests.length) === 0) {
            onAlert?.({ type: 'error', message: 'No data to export.' });
            return;
        }
        try {
            setIsExporting(true);
            const params = {};
            if (filters.event_id) params.event_id = filters.event_id;
            if (filters.attended !== '') params.attended = filters.attended === 'true';
            if (debouncedSearch) params.search = debouncedSearch;
            await ApiService.exportAttendanceRequestsToCSV(params);
            onAlert?.({ type: 'success', message: 'CSV export started.' });
        } catch (err) {
            console.error('Error exporting CSV:', err);
            onAlert?.({ type: 'error', message: err.message || 'Failed to export CSV.' });
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters = Boolean(
        filters.event_id || filters.attended !== '' || filters.search
    );
    const attendedOnPage = requests.filter((r) => r.attended).length;
    const notAttendedOnPage = requests.filter((r) => !r.attended).length;
    const totalCount = pagination?.total ?? requests.length;

    if (loading && !isFiltering) {
        return (
            <div className="AdminPanel__loading">
                <div className="AdminPanel__spinner" />
                <p>Loading attendance requests...</p>
            </div>
        );
    }

    return (
        <div className="AttendanceAdmin">
            <div className="AttendanceAdmin__toolbar">
                <p className="AttendanceAdmin__subtitle">
                    Review and manage attendance requests for events. Update status for registered users.
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

            {(requests.length > 0 || totalCount > 0) && (
                <div className="AttendanceAdmin__stats">
                    <div className="AttendanceAdmin__stat">
                        <span className="AttendanceAdmin__statValue">{totalCount}</span>
                        <span className="AttendanceAdmin__statLabel">Total Requests</span>
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
                        <span className="AttendanceAdmin__statLabel">Didn&apos;t Attend (page)</span>
                    </div>
                </div>
            )}

            <div className="AttendanceAdmin__filters">
                <label className="AttendanceAdmin__field AttendanceAdmin__field--search">
                    <span>Search</span>
                    <input
                        type="text"
                        className="AdminPanel__filterInput"
                        placeholder="Name, university ID, phone, or course code..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </label>
                <label className="AttendanceAdmin__field">
                    <span>Event</span>
                    <select
                        className="AdminPanel__filterSelect"
                        value={filters.event_id}
                        onChange={(e) => handleFilterChange('event_id', e.target.value)}
                        disabled={loadingEvents}
                    >
                        <option value="">All Events</option>
                        {events.map((event) => (
                            <option key={event.event_id} value={event.event_id}>
                                {event.name || `Event ${event.event_id}`}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="AttendanceAdmin__field">
                    <span>Status</span>
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

            {requests.length === 0 ? (
                <div className="AdminPanel__empty">
                    <p>No attendance requests found.</p>
                    <p>
                        {hasActiveFilters
                            ? 'Try adjusting your filters.'
                            : 'There are no registered users yet.'}
                    </p>
                </div>
            ) : (
                <div className="AdminPanel__tableWrap">
                    <table className="AdminPanel__table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Full Name</th>
                                <th>University ID</th>
                                <th>Event</th>
                                <th>Course Code</th>
                                <th>Registered Date</th>
                                <th>Attendance Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req, index) => {
                                const rowNum =
                                    ((pagination?.page || page) - 1) * (pagination?.limit || LIMIT) +
                                    index +
                                    1;
                                const isUpdating = updatingIds.has(req.request_id);
                                const eventLabel = req.event
                                    ? req.event.name || `Event ${req.event_id}`
                                    : req.event_name || `Event ${req.event_id}` || 'N/A';

                                return (
                                    <tr key={req.request_id}>
                                        <td>{rowNum}</td>
                                        <td style={{ fontWeight: 600 }}>{req.full_name}</td>
                                        <td className="AttendanceAdmin__mono">{req.university_id}</td>
                                        <td>{eventLabel}</td>
                                        <td>{req.course_code || '—'}</td>
                                        <td>{formatDate(req.created_at)}</td>
                                        <td>
                                            <select
                                                className="AdminPanel__filterSelect AttendanceAdmin__statusSelect"
                                                value={req.attended ? 'true' : 'false'}
                                                disabled={isUpdating}
                                                onChange={(e) => {
                                                    handleAttendedChange(
                                                        req.request_id,
                                                        req.attended,
                                                        e.target.value === 'true'
                                                    );
                                                }}
                                            >
                                                <option value="false">Didn&apos;t Attend</option>
                                                <option value="true">Attended</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
        </div>
    );
});

AttendanceTab.displayName = 'AttendanceTab';

export default AttendanceTab;

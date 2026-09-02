import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import { useSeason } from '../../context/SeasonContext';
import { getDepartmentNameById } from '../../data/departments';
import CommentModal from '../../components/CommentModal';
import TextModal from '../../components/TextModal';
import ChartsSection from '../../components/ChartsSection';
import FiltersSection from '../../components/FiltersSection';
import ApplicationsTable from '../../components/ApplicationsTable';
import Pagination from '../../components/Pagination';
import './RegistrationsAdmin.css';

const chartColors = [
    '#4aa6ff', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c',
    '#5dade2', '#e67e22', '#3498db', '#2ecc71', '#8e44ad', '#f1c40f',
    '#e91e63', '#00bcd4', '#4caf50', '#ff9800', '#795548', '#607d8b'
];

const LIMIT = 20;

const emptyFilters = () => ({
    first_choice: '',
    second_choice: '',
    status: '',
    faculty: '',
    year: ''
});

const mapStatsToChart = (items, total, mapDept = false) =>
    (items || [])
        .map((row, index) => {
            let label = row.value;
            if (mapDept && label != null && label !== '') {
                label = getDepartmentNameById(label);
            }
            if (!label && label !== 0) label = 'N/A';
            return {
                label: String(label),
                count: row.count || 0,
                percentage: total ? Math.round((row.count / total) * 100) : 0,
                color: chartColors[index % chartColors.length]
            };
        })
        .sort((a, b) => b.count - a.count);

const RegistrationsTab = memo(({ onAlert }) => {
    const { seasonFilters } = useSeason();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [sendingActivation, setSendingActivation] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedText, setExpandedText] = useState({ field: null, appId: null });
    const [commentModal, setCommentModal] = useState({ isOpen: false, application: null, comment: '' });
    const textareaRef = useRef(null);

    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [stats, setStats] = useState(null);

    const [recruitmentSettings, setRecruitmentSettings] = useState({
        enabled: true,
        title: 'Recruitment is Currently Closed',
        closedMessage: 'Registrations are currently closed. Please wait until recruitment is available! Follow our Instagram page to know when recruitment opens.',
        instagramUrl: 'https://www.instagram.com/mspmiu'
    });
    const [togglingRecruitment, setTogglingRecruitment] = useState(false);

    const loadRecruitmentSettings = useCallback(async () => {
        try {
            const res = await ApiService.getSiteContentKey('recruitment');
            const val = res?.data?.value ?? res?.data;
            if (val && typeof val === 'object') {
                setRecruitmentSettings((prev) => ({ ...prev, ...val }));
            }
        } catch (err) {
            console.warn('Could not load recruitment settings:', err);
        }
    }, []);

    useEffect(() => {
        loadRecruitmentSettings();
    }, [loadRecruitmentSettings]);

    const handleToggleRecruitment = async () => {
        const nextEnabled = !recruitmentSettings.enabled;
        const confirmMsg = nextEnabled
            ? 'Open membership registrations? Users will be able to fill out and submit the Become a Member form.'
            : 'Stop membership registrations? When stopped, visitors will see the "Recruitment Closed" screen directing them to follow the Instagram page.';

        const ok = await confirmModal({
            title: nextEnabled ? 'Open Recruitment?' : 'Stop Recruitment?',
            message: confirmMsg,
            confirmText: nextEnabled ? 'Open Recruitment' : 'Stop Recruitment',
            cancelText: 'Cancel',
            type: nextEnabled ? 'info' : 'warning'
        });
        if (!ok) return;

        try {
            setTogglingRecruitment(true);
            const updated = {
                ...recruitmentSettings,
                enabled: nextEnabled
            };
            await ApiService.updateSiteContent('recruitment', updated);
            setRecruitmentSettings(updated);
            onAlert?.({
                type: 'success',
                message: nextEnabled
                    ? 'Recruitment opened! Applications are now active.'
                    : 'Recruitment stopped! Registrations are now closed.'
            });
        } catch (err) {
            console.error('Error toggling recruitment:', err);
            onAlert?.({
                type: 'error',
                message: err.message || 'Failed to update recruitment status.'
            });
        } finally {
            setTogglingRecruitment(false);
        }
    };

    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

    const firstChoiceData = mapStatsToChart(stats?.by_first_choice, stats?.total, true);
    const secondChoiceData = mapStatsToChart(stats?.by_second_choice, stats?.total, true);
    const facultyData = mapStatsToChart(stats?.by_faculty, stats?.total, false);

    const handleTextClick = (field, appId, text) => {
        if (text && text.length > 100) {
            setExpandedText({ field, appId, text });
        }
    };

    const closeExpandedText = () => setExpandedText({ field: null, appId: null });

    const openCommentModal = (application) => {
        setCommentModal({
            isOpen: true,
            application,
            comment: application.comment || ''
        });
    };

    const closeCommentModal = () => {
        setCommentModal({ isOpen: false, application: null, comment: '' });
    };

    useEffect(() => {
        if (commentModal.isOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [commentModal.isOpen]);

    const getStatusColor = (status) => {
        if (status?.startsWith('approved')) return '#27ae60';
        if (status?.startsWith('rejected')) return '#e74c3c';
        return '#4aa6ff';
    };

    const saveComment = async () => {
        try {
            await ApiService.updateApplicationComment(
                commentModal.application.application_id,
                commentModal.comment
            );
            const patch = (prev) =>
                prev.map((app) =>
                    app.application_id === commentModal.application.application_id
                        ? { ...app, comment: commentModal.comment }
                        : app
                );
            setApplications(patch);
            setFilteredApplications(patch);
            closeCommentModal();
            onAlert?.({ type: 'success', message: 'Comment saved.' });
        } catch (error) {
            console.error('Error saving comment:', error);
            onAlert?.({ type: 'error', message: 'Failed to save comment.' });
        }
    };

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const initialLoadDoneRef = useRef(false);

    const fetchApplications = useCallback(async () => {
        try {
            if (!initialLoadDoneRef.current) setLoading(true);
            else setIsFiltering(true);

            const currentFilters = {
                page,
                limit: LIMIT,
                ...seasonFilters
            };
            Object.entries(appliedFilters).forEach(([key, value]) => {
                if (value !== '' && value != null) currentFilters[key] = value;
            });
            if (debouncedSearchTerm) currentFilters.search = debouncedSearchTerm;

            const result = await ApiService.getAllApplications(currentFilters);
            const rows = Array.isArray(result?.data) ? result.data : [];

            setApplications(rows);
            setFilteredApplications(rows);
            setPagination(result?.pagination || null);
            setStats(result?.stats || null);
            setHasSearched(Boolean(
                debouncedSearchTerm ||
                Object.values(appliedFilters).some((v) => v !== '' && v != null)
            ));
        } catch (err) {
            console.error('Error fetching applications:', err);
            onAlert?.({ type: 'error', message: err.message || 'Failed to load applications.' });
        } finally {
            initialLoadDoneRef.current = true;
            setIsFiltering(false);
            setLoading(false);
        }
    }, [onAlert, appliedFilters, debouncedSearchTerm, page, seasonFilters]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const handleFilterChange = useCallback((filterKey, value) => {
        setFilters((prev) => ({ ...prev, [filterKey]: value }));
    }, []);

    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
    }, []);

    const applyFilters = useCallback(() => {
        setAppliedFilters({ ...filters });
        setPage(1);
        setIsFiltering(true);
    }, [filters]);

    const clearFilters = useCallback(() => {
        const cleared = emptyFilters();
        setFilters(cleared);
        setAppliedFilters(cleared);
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setHasSearched(false);
        setPage(1);
    }, []);

    const handleStatusChange = async (application_id, newStatus) => {
        try {
            await ApiService.updateApplicationStatus(application_id, newStatus);
            const patch = (prev) =>
                prev.map((app) =>
                    app.application_id === application_id ? { ...app, status: newStatus } : app
                );
            setApplications(patch);
            setFilteredApplications(patch);
            onAlert?.({
                type: 'success',
                message: `Application status updated to "${newStatus}".`
            });
        } catch (error) {
            console.error('Error updating application status:', error);
            onAlert?.({
                type: 'error',
                message: error.message || 'Failed to update application status.'
            });
        }
    };

    const handleDelete = async (app) => {
        const ok = await confirmModal({
            title: 'Delete Application?',
            message: `Delete application for "${app.full_name}"? This action cannot be undone.`,
            confirmText: 'Delete Application',
            cancelText: 'Cancel',
            type: 'danger'
        });
        if (!ok) return;
        try {
            await ApiService.deleteApplication(app.application_id);
            const remove = (prev) => prev.filter((a) => a.application_id !== app.application_id);
            setApplications(remove);
            setFilteredApplications(remove);
            onAlert?.({ type: 'success', message: 'Application deleted.' });
            fetchApplications();
        } catch (error) {
            onAlert?.({ type: 'error', message: error.message || 'Failed to delete application.' });
        }
    };

    const handleSendActivationEmails = async () => {
        const confirmed = await confirmModal({
            title: 'Send Activation Emails?',
            message: 'Send activation emails to all accepted members who do not have an account yet?\n\nMembers who already activated their account will be skipped. This may take a while.',
            confirmText: 'Send Activation Emails',
            cancelText: 'Cancel',
            type: 'warning'
        });
        if (!confirmed) return;

        try {
            setSendingActivation(true);
            const result = await ApiService.sendMemberActivationEmails(seasonFilters);
            const summary = result?.data;
            const sent = summary?.sent ?? 0;
            const skipped = summary?.skipped ?? 0;
            const failed = summary?.failed ?? 0;

            if (failed > 0 && sent === 0) {
                onAlert?.({
                    type: 'error',
                    message: result?.message || `Failed to send activation emails (${failed} error(s)).`
                });
            } else {
                onAlert?.({
                    type: 'success',
                    message:
                        result?.message ||
                        `Sent ${sent} activation email(s). Skipped ${skipped}. Failed ${failed}.`
                });
            }
        } catch (error) {
            console.error('Error sending activation emails:', error);
            onAlert?.({
                type: 'error',
                message: error.message || 'Failed to send activation emails.'
            });
        } finally {
            setSendingActivation(false);
        }
    };

    if (loading && !isFiltering) {
        return (
            <div className="RegistrationsAdmin__loading">
                <div className="AdminPanel__spinner" />
                <p>Loading applications...</p>
            </div>
        );
    }

    const totalCount = pagination?.total ?? stats?.total ?? applications.length;

    return (
        <div className="RegistrationsAdmin">
            <TextModal expandedText={expandedText} closeExpandedText={closeExpandedText} />
            <CommentModal
                commentModal={commentModal}
                setCommentModal={setCommentModal}
                closeCommentModal={closeCommentModal}
                saveComment={saveComment}
                textareaRef={textareaRef}
            />

            {/* Recruitment Control Banner */}
            <div className={`RegistrationsAdmin__recruitmentBanner ${recruitmentSettings.enabled ? 'is-active' : 'is-stopped'}`}>
                <div className="RegistrationsAdmin__recruitmentInfo">
                    <div className="RegistrationsAdmin__recruitmentBadge">
                        <span className={`RegistrationsAdmin__statusDot ${recruitmentSettings.enabled ? 'dot-active' : 'dot-stopped'}`} />
                        <span className="RegistrationsAdmin__statusText">
                            {recruitmentSettings.enabled ? 'Recruitment Open (Accepting Applications)' : 'Recruitment Stopped (Registrations Closed)'}
                        </span>
                    </div>
                    <p className="RegistrationsAdmin__recruitmentDesc">
                        {recruitmentSettings.enabled
                            ? 'The "Become a Member" form is currently active. Students can submit membership applications.'
                            : 'Registrations are stopped. Visitors to the Become a Member page see a notice directing them to wait and follow Instagram.'}
                    </p>
                </div>
                <div className="RegistrationsAdmin__recruitmentActions">
                    <button
                        type="button"
                        className={`AdminPanel__actionBtn ${recruitmentSettings.enabled ? 'AdminPanel__actionBtn--danger' : 'AdminPanel__actionBtn--approve'}`}
                        onClick={handleToggleRecruitment}
                        disabled={togglingRecruitment}
                    >
                        {togglingRecruitment ? (
                            'Updating status…'
                        ) : recruitmentSettings.enabled ? (
                            '🛑 Stop Registrations'
                        ) : (
                            '✅ Open Registrations'
                        )}
                    </button>
                </div>
            </div>

            <div className="RegistrationsAdmin__toolbar">
                <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                    onClick={handleSendActivationEmails}
                    disabled={sendingActivation}
                >
                    {sendingActivation
                        ? 'Sending activation emails…'
                        : 'Send activation emails to all accepted members'}
                </button>
            </div>

            <ChartsSection
                theme="admin"
                firstChoiceData={firstChoiceData}
                secondChoiceData={secondChoiceData}
                facultyData={facultyData}
            />

            <FiltersSection
                theme="admin"
                filters={filters}
                searchTerm={searchTerm}
                filteredApplications={filteredApplications}
                handleFilterChange={handleFilterChange}
                handleSearchChange={handleSearchChange}
                clearFilters={clearFilters}
                applyFilters={applyFilters}
                isFiltering={isFiltering}
            />

            {hasSearched && filteredApplications.length === 0 && !isFiltering && (
                <div className="RegistrationsAdmin__empty">
                    <h3>No Applications Found</h3>
                    <p>The entered filters don't match any applicants. Try adjusting your search criteria.</p>
                    <button type="button" className="AdminPanel__actionBtn AdminPanel__actionBtn--edit" onClick={clearFilters}>
                        Clear All Filters
                    </button>
                </div>
            )}

            <ApplicationsTable
                theme="admin"
                filteredApplications={filteredApplications}
                handleTextClick={handleTextClick}
                openCommentModal={openCommentModal}
                handleStatusChange={handleStatusChange}
                handleDelete={handleDelete}
                getStatusColor={getStatusColor}
            />

            <Pagination pagination={pagination} onPageChange={(p) => { setPage(p); }} />

            <p className="RegistrationsAdmin__footerCounts">
                Total Applications: {totalCount}
                {filteredApplications.length !== totalCount
                    ? ` | Showing: ${filteredApplications.length}`
                    : ''}
            </p>
        </div>
    );
});

RegistrationsTab.displayName = 'RegistrationsTab';

export default RegistrationsTab;

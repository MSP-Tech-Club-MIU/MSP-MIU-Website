import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MdAdd,
  MdClose,
  MdCloudUpload,
  MdEvent,
  MdOpenInNew,
  MdImage,
  MdAttachFile,
  MdFactCheck,
  MdArrowBack
} from 'react-icons/md';
import ApiService from '../../services/api';
import Pagination from '../../components/Pagination';
import SeasonBadge from '../../components/SeasonBadge';
import { useSeason } from '../../context/SeasonContext';
import AttendanceTab from './AttendanceTab';
import mspLogo from '../../assets/Images/msp-logo.png';

const PAGE_SIZE = 6;

const emptyForm = () => ({
  name: '',
  description: '',
  event_date: '',
  location: '',
  category: 'Workshop',
  main_image: '',
  upload_file: '',
  registration_enabled: true
});

function formatDate(dateString) {
  if (!dateString) return '—';
  const raw = String(dateString).split('T')[0];
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function normalizeEventDate(value) {
  if (!value) return '';
  return String(value).split('T')[0];
}

export default function EventsAdminTab({ onAlert }) {
  const { seasonFilters, isAll, selectedSeasonId } = useSeason();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'attendance' ? 'attendance' : 'events';

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);

  const setView = useCallback(
    (next) => {
      if (next === 'attendance') {
        setSearchParams({ view: 'attendance' }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setSearchParams]
  );

  const load = useCallback(async () => {
    if (view !== 'events') return;
    const isPageChange = hasLoadedOnceRef.current;
    try {
      if (isPageChange) {
        setPageLoading(true);
      } else {
        setInitialLoading(true);
      }
      const result = await ApiService.getEvents({ page, limit: PAGE_SIZE, ...seasonFilters });
      setItems(Array.isArray(result?.data) ? result.data : []);
      const meta = Array.isArray(result) ? null : result?.pagination || null;
      if (!meta || meta.totalPages <= 1 || (typeof meta.total === 'number' && meta.total <= PAGE_SIZE)) {
        setPagination(null);
      } else {
        setPagination(meta);
      }
      hasLoadedOnceRef.current = true;
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load events' });
      setItems([]);
      if (!hasLoadedOnceRef.current) {
        setPagination(null);
      }
    } finally {
      setInitialLoading(false);
      setPageLoading(false);
    }
  }, [page, onAlert, view, seasonFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePageChange = (nextPage) => {
    if (pageLoading || nextPage === page) return;
    setPage(nextPage);
  };

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving && !uploadingImage && !uploadingFile) {
        setModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen, saving, uploadingImage, uploadingFile]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      description: row.description || '',
      event_date: normalizeEventDate(row.event_date),
      location: row.location || '',
      category: row.category || 'Workshop',
      main_image: row.main_image || '',
      upload_file: row.upload_file || '',
      registration_enabled: row.registration_enabled !== false
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || uploadingImage || uploadingFile) return;
    setModalOpen(false);
  };

  const setField = (key) => (e) => {
    const { value, type, checked } = e.target;
    setForm((f) => ({ ...f, [key]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onAlert?.({ type: 'error', message: 'Please select an image file' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onAlert?.({ type: 'error', message: 'Image size must be less than 10MB' });
      return;
    }
    try {
      setUploadingImage(true);
      const result = await ApiService.uploadFile(file, 'events');
      setForm((f) => ({ ...f, main_image: result.url || '' }));
      onAlert?.({ type: 'success', message: 'Image uploaded.' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Image upload failed' });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      onAlert?.({ type: 'error', message: 'File size must be less than 50MB' });
      return;
    }
    try {
      setUploadingFile(true);
      const result = await ApiService.uploadFile(file, 'slides');
      setForm((f) => ({ ...f, upload_file: result.url || '' }));
      onAlert?.({ type: 'success', message: 'File uploaded.' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'File upload failed' });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      onAlert?.({ type: 'error', message: 'Event name is required' });
      return;
    }
    if (!form.event_date) {
      onAlert?.({ type: 'error', message: 'Event date is required' });
      return;
    }
    if (!form.location.trim()) {
      onAlert?.({ type: 'error', message: 'Location is required' });
      return;
    }
    if (!['Session', 'Workshop', 'Entertainment'].includes(form.category)) {
      onAlert?.({ type: 'error', message: 'Invalid category' });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date,
        location: form.location.trim(),
        category: form.category,
        main_image: form.main_image.trim() || null,
        upload_file: form.upload_file.trim() || null,
        registration_enabled: !!form.registration_enabled
      };
      if (!editing && typeof selectedSeasonId === 'number') {
        payload.season_id = selectedSeasonId;
      }

      if (editing) {
        await ApiService.updateEvent(editing.event_id, payload);
        onAlert?.({ type: 'success', message: 'Event updated.' });
      } else {
        await ApiService.createEvent(payload);
        onAlert?.({ type: 'success', message: 'Event created.' });
      }
      setModalOpen(false);
      hasLoadedOnceRef.current = false;
      if (page === 1) {
        await load();
      } else {
        setPage(1);
      }
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete event "${row.name}"? This cannot be undone.`)) return;
    try {
      await ApiService.deleteEvent(row.event_id);
      onAlert?.({ type: 'success', message: 'Event deleted.' });
      hasLoadedOnceRef.current = false;
      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const busy = saving || uploadingImage || uploadingFile;
  const previewImage = form.main_image?.trim() || mspLogo;

  const modal = modalOpen
    ? createPortal(
        <div
          className="AdminPanel__modalOverlay SponsorsAdmin__overlay"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="AdminPanel__modalContent AdminPanel__modalContent--large SponsorsAdmin__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="events-modal-title"
          >
            <div className="AdminPanel__modalHeader SponsorsAdmin__modalHeader">
              <div>
                <h3 id="events-modal-title">{editing ? 'Edit event' : 'Add event'}</h3>
                <p className="SponsorsAdmin__modalSub">
                  {editing
                    ? `Updating ${editing.name}`
                    : 'Create a new event for the public events calendar'}
                </p>
              </div>
              <button
                type="button"
                className="AdminPanel__modalClose"
                onClick={closeModal}
                aria-label="Close"
                disabled={busy}
              >
                <MdClose />
              </button>
            </div>

            <div className="SponsorsAdmin__body">
              <div className="SponsorsAdmin__logoPane">
                <div className="SponsorsAdmin__logoPreview">
                  <img src={previewImage} alt="" />
                </div>
                <label className="SponsorsAdmin__fileBtn">
                  <MdCloudUpload />
                  {uploadingImage ? 'Uploading…' : 'Upload image'}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                </label>
                {form.main_image ? (
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={busy}
                    onClick={() => setForm((f) => ({ ...f, main_image: '' }))}
                  >
                    Remove image
                  </button>
                ) : (
                  <p className="SponsorsAdmin__hint">
                    Optional. Default MSP logo is used when no image is set.
                  </p>
                )}
              </div>

              <div className="SponsorsAdmin__formPane">
                <div className="AdminPanel__formGrid SponsorsAdmin__formGrid">
                  <label className="AdminPanel__fullWidth">
                    Event name *
                    <input
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="e.g. Opening Ceremony"
                      autoFocus
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Date *
                    <input
                      type="date"
                      value={form.event_date}
                      onChange={setField('event_date')}
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Category *
                    <select
                      value={form.category}
                      onChange={setField('category')}
                      disabled={busy}
                    >
                      <option value="Workshop">Workshop</option>
                      <option value="Session">Session</option>
                      <option value="Entertainment">Entertainment</option>
                    </select>
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Location *
                    <input
                      value={form.location}
                      onChange={setField('location')}
                      placeholder="e.g. Main Building, Room OOA"
                      disabled={busy}
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Description
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={setField('description')}
                      placeholder="What attendees can expect…"
                      disabled={busy}
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Image URL
                    <input
                      value={form.main_image}
                      onChange={setField('main_image')}
                      placeholder="https://…/image.jpg"
                      disabled={busy}
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Attachment URL
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        value={form.upload_file}
                        onChange={setField('upload_file')}
                        placeholder="https://…/slides.pdf"
                        disabled={busy}
                        style={{ flex: 1 }}
                      />
                      <label className="SponsorsAdmin__fileBtn" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                        <MdAttachFile />
                        {uploadingFile ? '…' : 'Upload'}
                        <input
                          ref={fileInputRef}
                          type="file"
                          disabled={busy}
                          onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </label>
                  <label className="AdminPanel__fullWidth" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={!!form.registration_enabled}
                      onChange={setField('registration_enabled')}
                      disabled={busy}
                      style={{ width: 18, height: 18 }}
                    />
                    Allow attendance registration for this event
                  </label>
                </div>
              </div>
            </div>

            <div className="AdminPanel__modalActions SponsorsAdmin__actions">
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={closeModal}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                disabled={busy}
                onClick={save}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="AdminPanel__section SponsorsAdmin">
      {view === 'attendance' ? (
        <>
          <div className="AdminPanel__sectionHeader">
            <div>
              <h2 className="AdminPanel__sectionTitle">
                <MdFactCheck /> Attendance Review
              </h2>
              <p className="SponsorsAdmin__sectionSub">
                Review and mark attendance requests for events.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={() => setView('events')}
              >
                <MdArrowBack style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                Back to Events
              </button>
            </div>
          </div>
          <AttendanceTab onAlert={onAlert} />
        </>
      ) : (
        <>
          <div className="AdminPanel__sectionHeader">
            <div>
              <h2 className="AdminPanel__sectionTitle">
                <MdEvent /> Events
              </h2>
              <p className="SponsorsAdmin__sectionSub">
                Create, update, and delete events shown on the public events page.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={() => setView('attendance')}
              >
                <MdFactCheck style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                Attendance Review
              </button>
              <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
                <MdAdd /> Add Event
              </button>
            </div>
          </div>

          {initialLoading ? (
            <div className="AdminPanel__empty"><p>Loading…</p></div>
          ) : items.length === 0 && !pageLoading ? (
            <div className="AdminPanel__empty SponsorsAdmin__empty">
              <MdEvent />
              <p>No events yet.</p>
              <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
                <MdAdd /> Add your first event
              </button>
            </div>
          ) : pageLoading ? (
            <div className="AdminPanel__empty" aria-live="polite" aria-busy="true">
              <p>Loading page {page}…</p>
            </div>
          ) : (
            <div className="AdminPanel__tableWrap">
              <table className="AdminPanel__table SponsorsAdmin__table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Registration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.event_id}>
                      <td>
                        <div className="SponsorsAdmin__rowIdentity">
                          <div className="SponsorsAdmin__rowLogo">
                            {row.main_image ? (
                              <img src={row.main_image} alt="" />
                            ) : (
                              <MdImage />
                            )}
                          </div>
                          <div className="SponsorsAdmin__rowText">
                            <span className="SponsorsAdmin__rowName">
                              {row.name}
                              {isAll && (row.season || row.season_id) && (
                                <> {' '}<SeasonBadge season={row.season} /></>
                              )}
                            </span>
                            {row.description ? (
                              <span className="SponsorsAdmin__rowTagline">
                                {String(row.description).slice(0, 80)}
                                {String(row.description).length > 80 ? '…' : ''}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="SponsorsAdmin__tier">{row.category || '—'}</span>
                      </td>
                      <td>{formatDate(row.event_date)}</td>
                      <td>{row.location || '—'}</td>
                      <td>
                        <span
                          className={`AdminPanel__badge AdminPanel__badge--${
                            row.registration_enabled !== false ? 'active' : 'rejected'
                          }`}
                        >
                          {row.registration_enabled !== false ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td>
                        <div className="SponsorsAdmin__rowActions">
                          <Link
                            className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                            to={`/events/${row.event_id}`}
                            title="View public page"
                          >
                            <MdOpenInNew style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                            View
                          </Link>
                          <button
                            type="button"
                            className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                            onClick={() => remove(row)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pagination?.totalPages > 1 && (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              disabled={pageLoading}
            />
          )}
          {modal}
        </>
      )}
    </div>
  );
}

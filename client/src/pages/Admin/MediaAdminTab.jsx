import React, { useCallback, useEffect, useState } from 'react';
import { MdPermMedia, MdUpload } from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import MediaUploadModal, { MEDIA_UPLOAD_META } from './MediaUploadModal';

const TYPES = [
  { key: 'images', label: 'Gallery images', uploadType: 'images', list: 'getImages' },
  { key: 'assets', label: 'Assets', uploadType: 'assets', list: 'getAssets' },
  { key: 'slides', label: 'Slides', uploadType: 'slides', list: 'getSlides' },
  { key: 'event-thumbnails', label: 'Event thumbnails', uploadType: 'events', list: 'getEventThumbnails' },
];

const LIST_LIMIT = 24;

export default function MediaAdminTab({ onAlert }) {
  const [mediaType, setMediaType] = useState('images');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modal, setModal] = useState(null); // { mode: 'upload'|'replace', item? }
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const activeMeta = MEDIA_UPLOAD_META[mediaType] || MEDIA_UPLOAD_META.images;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const typeCfg = TYPES.find((t) => t.key === mediaType) || TYPES[0];
      let result;
      if (typeCfg.list === 'getImages') {
        result = await ApiService.getImages({ page, limit: LIST_LIMIT });
      } else if (typeCfg.list === 'getAssets') {
        result = await ApiService.getAssets('assets', { page, limit: LIST_LIMIT });
      } else if (typeCfg.list === 'getSlides') {
        result = await ApiService.getAssets('slides', { page, limit: LIST_LIMIT });
      } else {
        result = await ApiService.getAssets('event-thumbnails', { page, limit: LIST_LIMIT });
      }
      const rows =
        result?.images ||
        result?.assets ||
        result?.slides ||
        result?.['event-thumbnails'] ||
        result?.data ||
        [];
      setItems(Array.isArray(rows) ? rows : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load media' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mediaType, page, onAlert]);

  useEffect(() => {
    setPage(1);
  }, [mediaType]);

  useEffect(() => {
    load();
  }, [load]);

  const loadEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      const result = await ApiService.getEvents({ page: 1, limit: 200 });
      const rows = result?.data || result?.events || (Array.isArray(result) ? result : []);
      setEvents(Array.isArray(rows) ? rows : []);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const openUploadModal = () => {
    setModal({ mode: 'upload' });
    if (activeMeta.needsEvent) loadEvents();
  };

  const openReplaceModal = (item) => {
    if (!item?.key || uploading) return;
    setModal({ mode: 'replace', item });
    if (activeMeta.needsEvent) loadEvents();
  };

  const closeModal = () => {
    if (uploading) return;
    setModal(null);
  };

  const linkToEvent = async (eventId, eventField, url) => {
    if (!eventId || !eventField || !url) return;
    await ApiService.updateEvent(eventId, { [eventField]: url });
  };

  const handleModalSubmit = async ({ file, eventId, eventField, linkEvent }) => {
    const typeCfg = TYPES.find((t) => t.key === mediaType) || TYPES[0];
    try {
      setUploading(true);
      if (modal?.mode === 'replace') {
        const key = modal.item?.key;
        if (!key || !file) throw new Error('Missing file or key');
        const result = await ApiService.replaceCloudObject(key, file);
        if (linkEvent && eventId && eventField) {
          await linkToEvent(eventId, eventField, result.url || modal.item.url);
          onAlert?.({ type: 'success', message: 'File replaced and linked to event.' });
        } else {
          onAlert?.({ type: 'success', message: 'File replaced.' });
        }
      } else {
        if (!file) throw new Error('Choose a file');
        const result = await ApiService.uploadFile(file, typeCfg.uploadType);
        if (linkEvent && eventId && eventField) {
          await linkToEvent(eventId, eventField, result.url);
          onAlert?.({ type: 'success', message: `Uploaded to ${activeMeta.destination} and linked to event.` });
        } else {
          onAlert?.({
            type: 'success',
            message: `Uploaded to ${activeMeta.destination}`,
          });
        }
      }
      setModal(null);
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Upload failed' });
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (item) => {
    if (!item?.key) return;
    const itemName = item.name || item.key;
    const ok = await confirmModal({
      title: 'Delete Media File?',
      message: `Are you sure you want to delete ${itemName}? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await ApiService.deleteCloudObject(item.key);
      onAlert?.({ type: 'success', message: 'Deleted.' });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  return (
    <div className="AdminPanel__section">
      <div className="AdminPanel__sectionHeader">
        <h2 className="AdminPanel__sectionTitle">
          <MdPermMedia /> Media library
        </h2>
        <button
          type="button"
          className="AdminPanel__addBtn"
          disabled={uploading}
          onClick={openUploadModal}
        >
          <MdUpload /> {uploading ? 'Working…' : 'Upload'}
        </button>
      </div>

      <div className="AdminPanel__filters">
        <select
          className="AdminPanel__filterSelect"
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <span className="MediaAdminTab__destHint" title={`Uploads go to ${activeMeta.destination}`}>
          Uploads → <code>{activeMeta.destination}</code>
        </span>
      </div>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="AdminPanel__empty"><p>No files in this folder.</p></div>
      ) : (
        <div className="AdminPanel__mediaGrid">
          {items.map((item) => (
            <div key={item.key} className="AdminPanel__mediaCard">
              {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.key || '') ? (
                <img
                  src={`${item.url}${item.url?.includes('?') ? '&' : '?'}t=${item.lastModified ? new Date(item.lastModified).getTime() : ''}`}
                  alt={item.name || ''}
                  loading="lazy"
                />
              ) : (
                <div className="AdminPanel__mediaPlaceholder">{item.name || item.key}</div>
              )}
              <div className="AdminPanel__mediaMeta">
                <span title={item.key}>{item.name || item.key}</span>
                {(mediaType === 'slides' || mediaType === 'event-thumbnails') && (
                  <span
                    className={`AdminPanel__mediaEvent${item.event ? '' : ' AdminPanel__mediaEvent--unlinked'}`}
                    title={
                      item.events?.length
                        ? item.events.map((e) => `#${e.event_id} ${e.name}`).join(', ')
                        : 'Not linked to an event'
                    }
                  >
                    {item.events?.length > 1
                      ? `Events: ${item.events.map((e) => e.name).join(', ')}`
                      : item.event
                        ? `Event: ${item.event.name}`
                        : 'Not linked to an event'}
                  </span>
                )}
                <div className="AdminPanel__mediaActions">
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                    disabled={uploading}
                    onClick={() => openReplaceModal(item)}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                    disabled={uploading}
                    onClick={() => remove(item)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination pagination={pagination} onPageChange={setPage} />

      {modal && (
        <MediaUploadModal
          mediaType={mediaType}
          mode={modal.mode}
          replaceItem={modal.item || null}
          events={events}
          eventsLoading={eventsLoading}
          submitting={uploading}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}

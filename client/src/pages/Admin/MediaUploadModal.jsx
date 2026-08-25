import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdCloudUpload, MdClose } from 'react-icons/md';

export const MEDIA_UPLOAD_META = {
  images: {
    title: 'Upload gallery image',
    replaceTitle: 'Replace gallery image',
    destination: 'Images/',
    folderLabel: 'Gallery images',
    accept: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg',
    acceptHint: 'JPG, PNG, GIF, WebP, or SVG',
    needsEvent: false,
    description: 'Stored in the gallery folder and available on the public site.',
  },
  assets: {
    title: 'Upload asset',
    replaceTitle: 'Replace asset',
    destination: 'Assets/',
    folderLabel: 'Assets',
    accept: '.pdf,.jpg,.jpeg,.png,.gif,.pptx,.ppt,.docx,.doc,.xls,.xlsx,.zip',
    acceptHint: 'PDF, Office, image, or ZIP',
    needsEvent: false,
    description: 'General site assets (logos, docs, misc files).',
  },
  slides: {
    title: 'Upload event slides',
    replaceTitle: 'Replace event slides',
    destination: 'Slides/',
    folderLabel: 'Slides',
    accept: '.ppt,.pptx,.pdf,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    acceptHint: 'PPT, PPTX, or PDF',
    needsEvent: true,
    eventField: 'upload_file',
    description: 'Uploaded to Slides/ and can be linked as an event’s downloadable file.',
  },
  'event-thumbnails': {
    title: 'Upload event thumbnail',
    replaceTitle: 'Replace event thumbnail',
    destination: 'Events_Thumbnails/',
    folderLabel: 'Event thumbnails',
    accept: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg',
    acceptHint: 'JPG, PNG, GIF, WebP, or SVG',
    needsEvent: true,
    eventField: 'main_image',
    description: 'Uploaded to Events_Thumbnails/ and can be set as an event’s main image.',
  },
};

function formatBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Adaptive media upload / replace modal.
 * Destination & event linking depend on the active library dropdown type.
 */
export default function MediaUploadModal({
  mediaType,
  mode = 'upload', // 'upload' | 'replace'
  replaceItem = null,
  events = [],
  eventsLoading = false,
  submitting = false,
  onClose,
  onSubmit,
}) {
  const meta = MEDIA_UPLOAD_META[mediaType] || MEDIA_UPLOAD_META.images;
  const isReplace = mode === 'replace';

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isReplace && replaceItem?.event?.event_id) {
      setEventId(String(replaceItem.event.event_id));
    } else {
      setEventId('');
    }
  }, [isReplace, replaceItem]);

  useEffect(() => {
    if (!file || !/^image\//i.test(file.type)) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectedEvent = useMemo(
    () => events.find((e) => String(e.event_id) === String(eventId)) || null,
    [events, eventId]
  );

  const onPickFile = (picked) => {
    setError('');
    if (!picked) {
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isReplace && !file) {
      setError('Choose a file to upload.');
      return;
    }
    if (isReplace && !file) {
      setError('Choose a replacement file.');
      return;
    }
    try {
      await onSubmit({
        file,
        eventId: meta.needsEvent && eventId ? Number(eventId) : null,
        eventField: meta.eventField || null,
        linkEvent: Boolean(meta.needsEvent && eventId),
      });
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
  };

  return createPortal(
    <div className="AdminPanel__modal" onClick={onClose} role="presentation">
      <div
        className="AdminPanel__modalContent MediaUploadModal"
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-upload-title"
      >
        <div className="AdminPanel__modalHeader">
          <h3 id="media-upload-title" className="AdminPanel__modalTitle" style={{ margin: 0 }}>
            {isReplace ? meta.replaceTitle : meta.title}
          </h3>
          <button type="button" className="AdminPanel__modalClose" onClick={onClose} aria-label="Close" disabled={submitting}>
            <MdClose />
          </button>
        </div>

        <p className="MediaUploadModal__lead">{meta.description}</p>

        <div className="MediaUploadModal__dest">
          <span className="MediaUploadModal__destLabel">Destination</span>
          <code className="MediaUploadModal__destPath">{meta.destination}</code>
          <span className="MediaUploadModal__destType">{meta.folderLabel}</span>
        </div>

        {isReplace && replaceItem && (
          <div className="MediaUploadModal__current">
            <span className="MediaUploadModal__destLabel">Replacing</span>
            <strong title={replaceItem.key}>{replaceItem.name || replaceItem.key}</strong>
            {replaceItem.event?.name && (
              <span className="MediaUploadModal__currentEvent">Currently: {replaceItem.event.name}</span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="AdminPanel__formGroup">
            <label htmlFor="media-upload-file">File</label>
            <label
              className={`MediaUploadModal__drop${file ? ' MediaUploadModal__drop--hasFile' : ''}`}
              htmlFor="media-upload-file"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="" className="MediaUploadModal__preview" />
              ) : (
                <MdCloudUpload className="MediaUploadModal__dropIcon" />
              )}
              <span className="MediaUploadModal__dropText">
                {file ? file.name : 'Click to choose a file'}
              </span>
              <span className="MediaUploadModal__dropHint">
                {file ? formatBytes(file.size) : meta.acceptHint}
              </span>
              <input
                id="media-upload-file"
                type="file"
                accept={meta.accept}
                disabled={submitting}
                onChange={(ev) => onPickFile(ev.target.files?.[0] || null)}
              />
            </label>
          </div>

          {meta.needsEvent && (
            <div className="AdminPanel__formGroup">
              <label htmlFor="media-upload-event">
                {isReplace ? 'Belong to event (optional)' : 'Belong to event'}
              </label>
              <select
                id="media-upload-event"
                value={eventId}
                disabled={submitting || eventsLoading}
                onChange={(ev) => setEventId(ev.target.value)}
              >
                <option value="">
                  {eventsLoading ? 'Loading events…' : 'Don’t link to an event'}
                </option>
                {events.map((ev) => (
                  <option key={ev.event_id} value={ev.event_id}>
                    {ev.name}
                    {ev.event_date ? ` (${ev.event_date})` : ''}
                  </option>
                ))}
              </select>
              {selectedEvent && (
                <p className="MediaUploadModal__eventNote">
                  {meta.eventField === 'main_image'
                    ? 'Will be set as this event’s main thumbnail.'
                    : 'Will be set as this event’s slides / download file.'}
                  {(meta.eventField === 'main_image' ? selectedEvent.main_image : selectedEvent.upload_file)
                    ? ' (replaces the event’s current file link)'
                    : ''}
                </p>
              )}
            </div>
          )}

          {error && <p className="MediaUploadModal__error">{error}</p>}

          <div className="AdminPanel__modalActions">
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
              disabled={submitting}
            >
              {submitting ? 'Working…' : isReplace ? 'Replace file' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

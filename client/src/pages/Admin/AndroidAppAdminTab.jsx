import React, { useCallback, useEffect, useState } from 'react';
import { FaAndroid } from 'react-icons/fa';
import { FiDownload, FiSend, FiUpload } from 'react-icons/fi';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import EmailSendProgress from '../../components/EmailSendProgress';
import './AndroidAppAdminTab.css';

const AndroidAppAdminTab = ({ onAlert, onOpenJob }) => {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [emailSendJob, setEmailSendJob] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ApiService.getAndroidApp();
      const data = result.data || null;
      setCurrent(data);
      if (data?.versionName) setVersionName(data.versionName);
      if (data?.versionCode) setVersionCode(String((Number(data.versionCode) || 0) + 1));
      if (data?.releaseNotes) setReleaseNotes('');
    } catch (err) {
      setError(err.message || 'Failed to load Android app info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (!selected) {
      setFile(null);
      return;
    }
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (ext !== 'apk') {
      setError('Please select a .apk file');
      setFile(null);
      e.target.value = '';
      return;
    }
    setError('');
    setFile(selected);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose an APK file to upload');
      return;
    }
    if (!versionName.trim()) {
      setError('Version name is required');
      return;
    }

    setPublishing(true);
    setError('');
    try {
      const result = await ApiService.publishAndroidAppUpdate({
        file,
        versionName: versionName.trim(),
        versionCode: versionCode.trim() || undefined,
        releaseNotes: releaseNotes.trim(),
        notifyUsers
      });
      const job = result?.emailJob || result?.emails?.emailJob;
      if (job?.id) {
        if (onOpenJob) {
          onOpenJob({ id: job.id, title: `Android App Update (v${versionName.trim()})` });
        } else {
          setEmailSendJob({ id: job.id, title: `Android App Update (v${versionName.trim()})` });
        }
      }
      setCurrent(result.data || null);
      setFile(null);
      const fileInput = document.getElementById('android-apk-file');
      if (fileInput) fileInput.value = '';
      if (result.data?.versionCode) {
        setVersionCode(String((Number(result.data.versionCode) || 0) + 1));
      }
      onAlert?.({
        type: 'success',
        message: result.message || 'Android app updated successfully'
      });
    } catch (err) {
      setError(err.message || 'Failed to publish update');
      onAlert?.({ type: 'error', message: err.message || 'Failed to publish update' });
    } finally {
      setPublishing(false);
    }
  };

  const handleNotifyOnly = async () => {
    const ok = await confirmModal({
      title: 'Send App Update Emails?',
      message: 'Are you sure you want to send the Android app update email broadcast to all users again?',
      confirmText: 'Yes, Send Emails',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;
    setNotifying(true);
    setError('');
    try {
      const result = await ApiService.notifyAndroidAppUpdate();
      const job = result?.emailJob || result?.emails?.emailJob;
      if (job?.id) {
        if (onOpenJob) {
          onOpenJob({ id: job.id, title: `Android App Update (v${current?.versionName || 'Release'})` });
        } else {
          setEmailSendJob({ id: job.id, title: `Android App Update (v${current?.versionName || 'Release'})` });
        }
      }
      onAlert?.({
        type: 'success',
        message: result.message || 'Update emails sent'
      });
    } catch (err) {
      setError(err.message || 'Failed to send emails');
      onAlert?.({ type: 'error', message: err.message || 'Failed to send emails' });
    } finally {
      setNotifying(false);
    }
  };

  const updatedLabel = current?.updatedAt
    ? new Date(current.updatedAt).toLocaleString()
    : 'Never published via admin';

  return (
    <div className="AdminPanel__section AndroidAppAdmin">
      <div className="AdminPanel__sectionHeader">
        <h2>Android application update</h2>
        <p className="AdminPanel__muted">
          Upload a new APK to replace the public download file
          (<code>Mobile Application/MSP-MIU.apk</code>) and optionally email every user.
        </p>
      </div>

      {error && <div className="AdminPanel__errorBanner">{error}</div>}

      <div className="AndroidAppAdmin__current">
        <div className="AndroidAppAdmin__currentIcon" aria-hidden="true">
          <FaAndroid />
        </div>
        <div className="AndroidAppAdmin__currentBody">
          <span className="AndroidAppAdmin__eyebrow">Current public release</span>
          {loading ? (
            <p className="AdminPanel__muted">Loading…</p>
          ) : (
            <>
              <strong className="AndroidAppAdmin__version">
                Version {current?.versionName || '—'}
                {current?.versionCode != null ? (
                  <span className="AndroidAppAdmin__code"> ({current.versionCode})</span>
                ) : null}
              </strong>
              <p className="AdminPanel__muted">
                Size: {current?.fileSizeLabel || '—'} · Updated: {updatedLabel}
              </p>
              {current?.releaseNotes ? (
                <p className="AndroidAppAdmin__notes">{current.releaseNotes}</p>
              ) : null}
              <div className="AndroidAppAdmin__links">
                {current?.pageUrl ? (
                  <a href={current.pageUrl} target="_blank" rel="noreferrer">
                    <FiDownload /> Download page
                  </a>
                ) : null}
                <button
                  type="button"
                  className="AndroidAppAdmin__notifyBtn"
                  onClick={handleNotifyOnly}
                  disabled={notifying || publishing || loading}
                >
                  <FiSend />
                  {notifying ? 'Sending…' : 'Re-send update email'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <form className="AndroidAppAdmin__form" onSubmit={handlePublish}>
        <h3 className="AndroidAppAdmin__formTitle">Publish new APK</h3>

        <div className="AdminPanel__formRow">
          <div className="AdminPanel__formGroup">
            <label htmlFor="android-version-name">Version name *</label>
            <input
              id="android-version-name"
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. 1.0.1"
              required
              disabled={publishing}
            />
          </div>
          <div className="AdminPanel__formGroup">
            <label htmlFor="android-version-code">Version code</label>
            <input
              id="android-version-code"
              type="number"
              min="1"
              step="1"
              value={versionCode}
              onChange={(e) => setVersionCode(e.target.value)}
              placeholder="Auto-increments if empty"
              disabled={publishing}
            />
          </div>
        </div>

        <div className="AdminPanel__formGroup">
          <label htmlFor="android-apk-file">APK file *</label>
          <input
            id="android-apk-file"
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={handleFileChange}
            disabled={publishing}
          />
          {file ? (
            <p className="AdminPanel__muted">
              Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          ) : (
            <p className="AdminPanel__muted">Max size 100 MB. Replaces the current public APK.</p>
          )}
        </div>

        <div className="AdminPanel__formGroup">
          <label htmlFor="android-release-notes">Release notes</label>
          <textarea
            id="android-release-notes"
            rows={4}
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            placeholder="What changed in this update? Shown on the download page and in the email."
            disabled={publishing}
          />
        </div>

        <label className="AndroidAppAdmin__checkbox">
          <input
            type="checkbox"
            checked={notifyUsers}
            onChange={(e) => setNotifyUsers(e.target.checked)}
            disabled={publishing}
          />
          <span>Email all users about this update</span>
        </label>

        <div className="AndroidAppAdmin__actions">
          <button
            type="submit"
            className="AndroidAppAdmin__publishBtn"
            disabled={publishing || !file}
          >
            <FiUpload />
            {publishing ? 'Publishing…' : 'Publish update'}
          </button>
        </div>
      </form>

      {emailSendJob && (
        <EmailSendProgress
          jobId={emailSendJob.id}
          title={emailSendJob.title}
          onClear={() => setEmailSendJob(null)}
        />
      )}
    </div>
  );
};

export default AndroidAppAdminTab;


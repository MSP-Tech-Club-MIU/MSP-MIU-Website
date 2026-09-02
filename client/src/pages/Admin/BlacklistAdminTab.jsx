import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdBlock, MdAdd, MdEdit, MdDelete, MdSearch, MdWarning } from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';

const LIST_LIMIT = 20;

const emptyForm = () => ({
  name: '',
  identifier: '',
  phone_number: '',
  reason: ''
});

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export default function BlacklistAdminTab({ onAlert }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load blacklist data
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiService.getBlacklist({
        page,
        limit: LIST_LIMIT,
        search: debouncedSearch || undefined
      });
      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load blacklist entries' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, onAlert]);

  useEffect(() => {
    load();
  }, [load]);

  // Modal ESC key listener & body scroll lock
  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen, saving]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      identifier: row.identifier || '',
      phone_number: row.phone_number || '',
      reason: row.reason || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setFormError('');
  };

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (formError) setFormError('');
  };

  const save = async () => {
    const name = form.name.trim();
    const identifier = form.identifier.trim();
    const phone_number = form.phone_number.trim();
    const reason = form.reason.trim();

    if (!reason) {
      setFormError('A reason is required.');
      return;
    }

    if (!name && !identifier && !phone_number) {
      setFormError('At least one identifier (Name, ID, or Phone Number) must be provided.');
      return;
    }

    const payload = {
      name: name || null,
      identifier: identifier || null,
      phone_number: phone_number || null,
      reason
    };

    try {
      setSaving(true);
      if (editing) {
        await ApiService.updateBlacklistEntry(editing.blacklist_id, payload);
        onAlert?.({ type: 'success', message: 'Blacklist entry updated successfully.' });
      } else {
        await ApiService.createBlacklistEntry(payload);
        onAlert?.({ type: 'success', message: 'Person added to blacklist.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err.message || 'Failed to save blacklist entry');
      onAlert?.({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const target = row.name || row.identifier || row.phone_number || `#${row.blacklist_id}`;
    const ok = await confirmModal({
      title: 'Unblock and Remove?',
      message: `Unblock and remove "${target}" from the blacklist?\n\nThis will allow them to participate in club activities again.`,
      confirmText: 'Unblock & Remove',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;
    try {
      await ApiService.deleteBlacklistEntry(row.blacklist_id);
      onAlert?.({ type: 'success', message: `Removed "${target}" from blacklist.` });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to delete blacklist entry' });
    }
  };

  return (
    <div className="AdminPanel__section">
      <div className="AdminPanel__sectionHeader">
        <div>
          <h2 className="AdminPanel__sectionTitle">
            <MdBlock /> Blacklist
          </h2>
          <p className="SponsorsAdmin__sectionSub" style={{ marginTop: 4, opacity: 0.8 }}>
            Block individuals by Name, University / Student ID, or Phone Number from all club activities (recruitment, events, courses, competitions, and login).
          </p>
        </div>
        <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
          <MdAdd /> Add to Blacklist
        </button>
      </div>

      <div className="AdminPanel__filters">
        <input
          className="AdminPanel__filterSelect"
          style={{ minWidth: 260 }}
          placeholder="Search name, ID, phone, reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading blacklist…</p></div>
      ) : items.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>{debouncedSearch ? 'No blacklisted entries match your search.' : 'No individuals currently blacklisted.'}</p>
          {!debouncedSearch && (
            <button type="button" className="AdminPanel__addBtn" onClick={openCreate} style={{ marginTop: 12 }}>
              <MdAdd /> Add someone to blacklist
            </button>
          )}
        </div>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID / University ID</th>
                <th>Phone Number</th>
                <th>Reason</th>
                <th>Added Date</th>
                <th>Added By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.blacklist_id}>
                  <td style={{ fontWeight: 600 }}>
                    {row.name ? (
                      <span>{row.name}</span>
                    ) : (
                      <span style={{ opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td>
                    {row.identifier ? (
                      <code style={{ fontSize: '0.9em', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                        {row.identifier}
                      </code>
                    ) : (
                      <span style={{ opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td>
                    {row.phone_number ? (
                      <span>{row.phone_number}</span>
                    ) : (
                      <span style={{ opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 300 }}>
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                      color: '#ffd0d0'
                    }}>
                      {row.reason}
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.88em', opacity: 0.85 }}>
                    {formatDate(row.created_at)}
                  </td>
                  <td style={{ fontSize: '0.88em', opacity: 0.85 }}>
                    {row.creator?.full_name || row.creator?.email || 'Admin'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                      onClick={() => openEdit(row)}
                      title="Edit blacklist entry"
                    >
                      <MdEdit /> Edit
                    </button>
                    <button
                      type="button"
                      className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                      onClick={() => remove(row)}
                      title="Unblock and remove from blacklist"
                    >
                      <MdDelete /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      {modalOpen
        ? createPortal(
            <div
              className="AdminPanel__modalOverlay"
              onClick={closeModal}
              role="presentation"
            >
              <div
                className="AdminPanel__modalContent"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="blacklist-modal-title"
                style={{ maxWidth: 520 }}
              >
                <h3 id="blacklist-modal-title" className="AdminPanel__modalTitle">
                  <MdBlock style={{ verticalAlign: 'middle', marginRight: 6, color: '#f87171' }} />
                  {editing ? 'Edit Blacklist Entry' : 'Add to Blacklist'}
                </h3>

                {formError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <MdWarning /> {formError}
                  </div>
                )}

                <div className="AdminPanel__formGrid">
                  <p className="AdminPanel__fullWidth AdminPanel__fieldHint" style={{ marginBottom: 4 }}>
                    Specify at least one matching criterion (Name, ID, or Phone). If any provided field matches during activity registration, the action will be blocked.
                  </p>

                  <label className="AdminPanel__fullWidth">
                    Name (Optional)
                    <input
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="e.g. John Doe"
                      disabled={saving}
                    />
                    <span className="AdminPanel__fieldHint">
                      Matches the person's full name.
                    </span>
                  </label>

                  <label className="AdminPanel__fullWidth">
                    ID / University ID / National ID (Optional)
                    <input
                      value={form.identifier}
                      onChange={setField('identifier')}
                      placeholder="e.g. 2023/12345 or National ID"
                      disabled={saving}
                    />
                    <span className="AdminPanel__fieldHint">
                      Matches student university ID, student ID, or national ID.
                    </span>
                  </label>

                  <label className="AdminPanel__fullWidth">
                    Phone Number (Optional)
                    <input
                      value={form.phone_number}
                      onChange={setField('phone_number')}
                      placeholder="e.g. 01012345678"
                      disabled={saving}
                    />
                    <span className="AdminPanel__fieldHint">
                      Matches contact phone number.
                    </span>
                  </label>

                  <label className="AdminPanel__fullWidth">
                    Reason (Required)
                    <textarea
                      rows={3}
                      value={form.reason}
                      onChange={setField('reason')}
                      placeholder="Explain why this person is blacklisted from club activities..."
                      disabled={saving}
                      style={{
                        width: '100%',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        padding: '8px 10px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                    <span className="AdminPanel__fieldHint">
                      This reason will be recorded and shown when restricting the participant.
                    </span>
                  </label>
                </div>

                <div className="AdminPanel__modalActions" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="AdminPanel__addBtn"
                    disabled={saving}
                    onClick={save}
                    style={{ background: '#ef4444' }}
                  >
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Block & Blacklist'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

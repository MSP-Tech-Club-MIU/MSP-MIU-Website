import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdAdd, MdAccountTree, MdLink, MdOpenInNew } from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import { BOARD_POSITION_NAMES } from '../../data/departments';

const LIST_LIMIT = 50;

/** IDs used by auth, HR registrations access, and board leadership display. */
const PROTECTED_DEPT_IDS = new Set([1, 2, 5, 7, 8, 9]);

/** Matches server DEPARTMENTS_WITHOUT_WHATSAPP */
const NO_WHATSAPP_NAMES = new Set([...BOARD_POSITION_NAMES, 'Competitor']);

const emptyForm = () => ({ name: '', whatsapp_group_url: '' });

function isProtected(row) {
  return PROTECTED_DEPT_IDS.has(Number(row.department_id))
    || BOARD_POSITION_NAMES.includes(row.name);
}

function departmentSupportsWhatsApp(name) {
  return !NO_WHATSAPP_NAMES.has(String(name || '').trim());
}

function truncateUrl(url, max = 42) {
  if (!url) return '';
  return url.length > max ? `${url.slice(0, max)}…` : url;
}

export default function DepartmentsAdminTab({ onAlert }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiService.getDepartments({ page, limit: LIST_LIMIT });
      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load departments' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, onAlert]);

  useEffect(() => {
    load();
  }, [load]);

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

  const showWhatsAppField = departmentSupportsWhatsApp(form.name);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      whatsapp_group_url: row.whatsapp_group_url || ''
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      onAlert?.({ type: 'error', message: 'Department name is required' });
      return;
    }
    const supportsWa = departmentSupportsWhatsApp(name);
    const payload = {
      name,
      whatsapp_group_url: supportsWa ? (form.whatsapp_group_url.trim() || null) : null
    };
    try {
      setSaving(true);
      if (editing) {
        await ApiService.updateDepartment(editing.department_id, payload);
        onAlert?.({ type: 'success', message: 'Department updated.' });
      } else {
        await ApiService.createDepartment(payload);
        onAlert?.({ type: 'success', message: 'Department created.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (isProtected(row)) {
      onAlert?.({
        type: 'error',
        message: `"${row.name}" is a system department and cannot be deleted.`
      });
      return;
    }
    const ok = await confirmModal({
      title: 'Delete Department?',
      message: `Delete department "${row.name}"?\n\nThis will fail if members, board roles, or applications still reference it.`,
      confirmText: 'Delete Department',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await ApiService.deleteDepartment(row.department_id);
      onAlert?.({ type: 'success', message: 'Department deleted.' });
      await load();
    } catch (err) {
      onAlert?.({
        type: 'error',
        message: err.message || 'Delete failed (department may still be in use)'
      });
    }
  };

  return (
    <div className="AdminPanel__section">
      <div className="AdminPanel__sectionHeader">
        <div>
          <h2 className="AdminPanel__sectionTitle">
            <MdAccountTree /> Departments
          </h2>
          <p className="SponsorsAdmin__sectionSub">
            Manage departments and their WhatsApp group links used in acceptance emails.
          </p>
        </div>
        <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
          <MdAdd /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="AdminPanel__empty">
          <p>No departments yet.</p>
          <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
            <MdAdd /> Add your first department
          </button>
        </div>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>WhatsApp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const protectedRow = isProtected(row);
                const isLeadership = BOARD_POSITION_NAMES.includes(row.name);
                const supportsWa = departmentSupportsWhatsApp(row.name);
                return (
                  <tr key={row.department_id}>
                    <td>{row.department_id}</td>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td>
                      {isLeadership
                        ? 'Leadership display'
                        : protectedRow
                          ? 'System'
                          : 'Joinable'}
                    </td>
                    <td>
                      {!supportsWa ? (
                        '—'
                      ) : row.whatsapp_group_url ? (
                        <a
                          className="SponsorsAdmin__link"
                          href={row.whatsapp_group_url}
                          target="_blank"
                          rel="noreferrer"
                          title={row.whatsapp_group_url}
                        >
                          <MdLink /> {truncateUrl(row.whatsapp_group_url)} <MdOpenInNew />
                        </a>
                      ) : (
                        <span style={{ opacity: 0.55 }}>Not set</span>
                      )}
                    </td>
                    <td>
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
                        disabled={protectedRow}
                        title={protectedRow ? 'System departments cannot be deleted' : undefined}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
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
                aria-labelledby="departments-modal-title"
              >
                <h3 id="departments-modal-title" className="AdminPanel__modalTitle">
                  {editing ? 'Edit department' : 'Add department'}
                </h3>
                <div className="AdminPanel__formGrid">
                  <label className="AdminPanel__fullWidth">
                    Name
                    <input
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="e.g. Public Relations"
                      autoFocus
                      disabled={saving}
                    />
                  </label>
                  {showWhatsAppField ? (
                    <label className="AdminPanel__fullWidth">
                      WhatsApp group link
                      <input
                        value={form.whatsapp_group_url}
                        onChange={setField('whatsapp_group_url')}
                        placeholder="https://chat.whatsapp.com/…"
                        disabled={saving}
                      />
                      <span className="AdminPanel__fieldHint">
                        Used in member acceptance emails for this department. Leave blank to clear.
                      </span>
                    </label>
                  ) : (
                    <p className="AdminPanel__fullWidth AdminPanel__fieldHint">
                      Leadership / display roles do not use a WhatsApp group link.
                    </p>
                  )}
                </div>
                <div className="AdminPanel__modalActions">
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
                  >
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
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

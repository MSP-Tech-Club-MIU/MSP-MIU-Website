import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdAdd, MdGroups } from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import SeasonBadge from '../../components/SeasonBadge';
import { useSeason } from '../../context/SeasonContext';
import { departments as fallbackDepts } from '../../data/departments';
import PersonNameSearch from './PersonNameSearch';

const POSITIONS = ['Founder', 'President', 'Vice President', 'Head', 'Co-Head'];
const FACULTIES = [
  'Computer Science',
  'Engineering Sciences & Arts - ECE',
  'Mass Communication',
  'Dentistry',
  'Engineering Sciences & Arts - Architecture',
  'Pharmacy',
  'Business',
  'Alsun'
];
const LIST_LIMIT = 50;

const emptyForm = () => ({
  full_name: '',
  position: 'Head',
  department_id: '',
  faculty: '',
  year: '2025-2026',
  email: '',
  university_id: '',
  user_id: '',
  photo_url: '',
  linkedin_url: '',
  github_url: '',
  sort_order: 0,
  is_visible: true
});

export default function BoardAdminTab({ onAlert }) {
  const { seasonFilters, isAll, selectedSeasonId } = useSeason();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depts, setDepts] = useState(fallbackDepts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await ApiService.getDepartments({ limit: 100, page: 1 });
        const rows = Array.isArray(result?.data) ? result.data : [];
        if (rows.length) {
          setDepts(rows.map((d) => ({ id: d.department_id, name: d.name })));
        }
      } catch {
        /* keep fallback */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiService.getBoard({
        page,
        limit: LIST_LIMIT,
        includeHidden: true,
        ...seasonFilters
      });
      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load board' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, onAlert, seasonFilters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      full_name: row.full_name || '',
      position: row.position || 'Head',
      department_id: row.department_id ?? '',
      faculty: row.faculty || '',
      year: row.year || '2025-2026',
      email: row.email || '',
      university_id: row.university_id || '',
      user_id: row.user_id ?? '',
      photo_url: row.photo_url || '',
      linkedin_url: row.linkedin_url || '',
      github_url: row.github_url || '',
      sort_order: row.sort_order ?? 0,
      is_visible: row.is_visible !== false
    });
    setModalOpen(true);
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const result = await ApiService.uploadFile(file, 'board_photos');
      setForm((f) => ({ ...f, photo_url: result.url || '' }));
      onAlert?.({ type: 'success', message: 'Photo uploaded.' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.full_name.trim()) {
      onAlert?.({ type: 'error', message: 'Name is required' });
      return;
    }
    if (
      (form.position === 'Head' || form.position === 'Co-Head') &&
      (form.department_id === '' || form.department_id == null)
    ) {
      onAlert?.({
        type: 'error',
        message: `Department is required for ${form.position} so Meet the Board can place them in the hierarchy.`
      });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        full_name: form.full_name.trim(),
        position: form.position,
        department_id: form.department_id === '' ? null : Number(form.department_id),
        faculty: form.faculty || null,
        year: form.year,
        email: form.email || null,
        university_id: form.university_id || null,
        user_id: form.user_id === '' ? null : Number(form.user_id),
        photo_url: form.photo_url || null,
        linkedin_url: form.linkedin_url || null,
        github_url: form.github_url || null,
        sort_order: Number(form.sort_order) || 0,
        is_visible: Boolean(form.is_visible)
      };
      if (!editing && typeof selectedSeasonId === 'number') {
        payload.season_id = selectedSeasonId;
      }
      if (editing) {
        await ApiService.updateBoardMember(editing.board_id, payload);
        onAlert?.({ type: 'success', message: 'Board member updated.' });
      } else {
        await ApiService.createBoardMember(payload);
        onAlert?.({ type: 'success', message: 'Board member created.' });
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
    const ok = await confirmModal({
      title: 'Delete Board Member?',
      message: `Are you sure you want to delete "${row.full_name}" from the board?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await ApiService.deleteBoardMember(row.board_id);
      onAlert?.({ type: 'success', message: 'Board member deleted.' });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const sendActivationMail = async (row) => {
    if (!row?.email) {
      onAlert?.({ type: 'error', message: 'This board member has no email address.' });
      return;
    }
    const ok = await confirmModal({
      title: 'Send Activation Email?',
      message: `Send board account activation email to ${row.full_name} (${row.email})?`,
      confirmText: 'Send Email',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!ok) return;
    try {
      setSendingId(row.board_id);
      const result = await ApiService.sendBoardActivationEmail(row.board_id);
      onAlert?.({
        type: 'success',
        message: result.message || `Board account activation email sent to ${row.email}`
      });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to send email' });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="AdminPanel__section">
      <div className="AdminPanel__sectionHeader">
        <h2 className="AdminPanel__sectionTitle">
          <MdGroups /> Meet the Board
        </h2>
        <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
          <MdAdd /> Add Member
        </button>
      </div>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="AdminPanel__empty"><p>No board members in the database yet. Add them here to power the public page.</p></div>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Dept</th>
                <th>Faculty</th>
                <th>Account</th>
                <th>Visible</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const hasAccount = Boolean(row.has_active_account);
                return (
                  <tr key={row.board_id}>
                    <td style={{ fontWeight: 600 }}>
                      {row.full_name}
                      {isAll && (row.season || row.season_id) && (
                        <> {' '}<SeasonBadge season={row.season} /></>
                      )}
                    </td>
                    <td>{row.position}</td>
                    <td>{row.department?.name || row.department_id || '—'}</td>
                    <td>{row.faculty || '—'}</td>
                    <td>
                      <span
                        className={`AdminPanel__badge AdminPanel__badge--${
                          hasAccount ? 'active' : 'pending'
                        }`}
                      >
                        {hasAccount ? 'Active' : 'No account'}
                      </span>
                    </td>
                    <td>{row.is_visible === false ? 'Hidden' : 'Yes'}</td>
                    <td>{row.sort_order}</td>
                    <td>
                      {!hasAccount && (
                        <button
                          type="button"
                          className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                          disabled={sendingId === row.board_id}
                          onClick={() => sendActivationMail(row)}
                        >
                          {sendingId === row.board_id
                            ? 'Sending…'
                            : 'Send board account activation email'}
                        </button>
                      )}
                      <button type="button" className="AdminPanel__actionBtn AdminPanel__actionBtn--edit" onClick={() => openEdit(row)}>Edit</button>
                      <button type="button" className="AdminPanel__actionBtn AdminPanel__actionBtn--delete" onClick={() => remove(row)}>Delete</button>
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
              onClick={() => setModalOpen(false)}
              role="presentation"
            >
              <div
                className="AdminPanel__modalContent"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <h3 className="AdminPanel__modalTitle">{editing ? 'Edit board member' : 'Add board member'}</h3>
                <div className="AdminPanel__formGrid">
                  <label>
                    Full name
                    <PersonNameSearch
                      value={form.full_name}
                      disabled={saving}
                      placeholder="Search board, members, or users…"
                      onChange={(full_name) => setForm((f) => ({ ...f, full_name }))}
                      onSelectPerson={(person) => {
                        setForm((f) => {
                          const patch = {
                            ...f,
                            full_name: person.full_name || f.full_name,
                            user_id: person.user_id ? String(person.user_id) : f.user_id,
                            university_id: person.university_id || f.university_id,
                            email: person.email || f.email
                          };
                          const needsDept = f.position === 'Head' || f.position === 'Co-Head';
                          if (
                            needsDept &&
                            person.department_id != null &&
                            ![7, 8, 9].includes(Number(person.department_id))
                          ) {
                            patch.department_id = String(person.department_id);
                          }
                          return patch;
                        });
                      }}
                    />
                  </label>
                  <label>Position
                    <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
                      {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label>Department
                    <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                      <option value="">
                        {form.position === 'Head' || form.position === 'Co-Head'
                          ? 'Select department (required)'
                          : 'None / Leadership'}
                      </option>
                      {depts
                        .filter((d) => ![7, 8, 9].includes(Number(d.id)))
                        .map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </label>
                  <label>Faculty
                    <select value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
                      <option value="">Select faculty</option>
                      {FACULTIES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </label>
                  <label>Year<input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2025-2026" /></label>
                  <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                  <label>University ID<input value={form.university_id} onChange={(e) => setForm({ ...form, university_id: e.target.value })} /></label>
                  <label>Linked user ID<input type="number" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} /></label>
                  <label>Sort order<input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></label>
                  <label className="AdminPanel__fullWidth">Meet the Board photo URL
                    <input
                      value={form.photo_url}
                      onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                      placeholder="https://… or upload below"
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">Upload Meet the Board photo
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                    />
                    <span className="AdminPanel__fieldHint">
                      This is not the member&apos;s regular profile picture — profile avatars and
                      Meet the Board photos are stored separately. Use a clear / transparent
                      background (PNG preferred) so the portrait displays cleanly on the public
                      Meet the Board cards.
                    </span>
                  </label>
                  {form.photo_url ? (
                    <div className="AdminPanel__fullWidth AdminPanel__boardPhotoPreview">
                      <img src={form.photo_url} alt="Meet the Board preview" />
                    </div>
                  ) : null}
                  <label>LinkedIn URL<input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></label>
                  <label>GitHub URL<input value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} /></label>
                  <label className="AdminPanel__checkboxLabel">
                    <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} />
                    Visible on public Board page
                  </label>
                </div>
                <div className="AdminPanel__modalActions">
                  <button type="button" className="AdminPanel__actionBtn" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="button" className="AdminPanel__addBtn" disabled={saving} onClick={save}>
                    {saving ? 'Saving…' : 'Save'}
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

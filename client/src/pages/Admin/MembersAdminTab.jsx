import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdPeople } from 'react-icons/md';
import ApiService from '../../services/api';
import { confirmModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import SeasonBadge from '../../components/SeasonBadge';
import { useSeason } from '../../context/SeasonContext';
import { getDepartmentNameById, memberDepartments } from '../../data/departments';

const LIST_LIMIT = 20;

const FACULTIES = [
  'Computer Science',
  'Engineering Sciences & Arts - ECE',
  'Mass Communication',
  'Dentistry',
  'Engineering Sciences & Arts - Architecture',
  'Pharmacy',
  'Business',
  'Alsun',
];

export default function MembersAdminTab({ onAlert }) {
  const { seasonFilters, isAll } = useSeason();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [faculty, setFaculty] = useState('');
  const [departments, setDepartments] = useState(memberDepartments);
  const [sendingId, setSendingId] = useState(null);

  // Edit member state
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    university_id: '',
    email: '',
    phone_number: '',
    faculty: '',
    year: '1',
    department_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await ApiService.getDepartments({ limit: 100, page: 1 });
        const rows = Array.isArray(result?.data) ? result.data : [];
        if (rows.length) {
          setDepartments(rows.map((d) => ({ id: d.department_id, name: d.name })));
        }
      } catch {
        /* keep memberDepartments fallback */
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiService.getMembers({
        page,
        limit: LIST_LIMIT,
        search: debounced || undefined,
        department_id: departmentId || undefined,
        faculty: faculty || undefined,
        ...seasonFilters
      });
      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load members' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, departmentId, faculty, onAlert, seasonFilters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editingMember) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setEditingMember(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [editingMember]);

  const openEdit = (row) => {
    setEditingMember(row);
    setEditForm({
      full_name: row.full_name || '',
      university_id: row.university_id || '',
      email: row.email || '',
      phone_number: row.phone_number || '',
      faculty: row.faculty || '',
      year: row.year != null ? String(row.year) : '1',
      department_id: row.department_id != null ? String(row.department_id) : ''
    });
  };

  const closeEdit = () => {
    setEditingMember(null);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    if (!editForm.full_name?.trim()) {
      onAlert?.({ type: 'error', message: 'Full name is required.' });
      return;
    }
    if (!editForm.university_id?.trim()) {
      onAlert?.({ type: 'error', message: 'University ID is required.' });
      return;
    }
    if (!editForm.email?.trim()) {
      onAlert?.({ type: 'error', message: 'Email is required.' });
      return;
    }
    if (!editForm.department_id) {
      onAlert?.({ type: 'error', message: 'Department is required.' });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        full_name: editForm.full_name.trim(),
        university_id: editForm.university_id.trim(),
        email: editForm.email.trim(),
        phone_number: editForm.phone_number?.trim() || '',
        faculty: editForm.faculty?.trim() || '',
        year: Number(editForm.year) || 1,
        department_id: Number(editForm.department_id)
      };

      const result = await ApiService.updateMember(editingMember.member_id, payload);
      const updated = result?.data || { ...editingMember, ...payload };

      setItems((prev) =>
        prev.map((m) =>
          m.member_id === editingMember.member_id
            ? {
                ...m,
                ...updated,
                department:
                  updated.department ||
                  departments.find((d) => d.id === Number(payload.department_id)) ||
                  m.department
              }
            : m
        )
      );

      onAlert?.({ type: 'success', message: 'Member profile updated successfully.' });
      setEditingMember(null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to update member.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const ok = await confirmModal({
      title: 'Remove Member?',
      message: `Remove member "${row.full_name}"? This action cannot be undone.`,
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await ApiService.deleteMember(row.member_id);
      onAlert?.({ type: 'success', message: 'Member deleted.' });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const sendAccountMail = async (row) => {
    if (!row?.email) {
      onAlert?.({ type: 'error', message: 'This member has no email address.' });
      return;
    }
    const ok = await confirmModal({
      title: 'Send Account Creation Email?',
      message: `Send account creation email to ${row.full_name} (${row.email})?`,
      confirmText: 'Send Email',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!ok) return;
    try {
      setSendingId(row.member_id);
      const result = await ApiService.sendMemberActivationEmail(row.member_id);
      onAlert?.({
        type: 'success',
        message: result.message || `Account creation email sent to ${row.email}`
      });
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
          <MdPeople /> Club members
        </h2>
      </div>

      <div className="AdminPanel__filters">
        <input
          className="AdminPanel__filterSelect"
          style={{ minWidth: 220 }}
          placeholder="Search name, email, ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="AdminPanel__filterSelect"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <select
          className="AdminPanel__filterSelect"
          value={faculty}
          onChange={(e) => {
            setFaculty(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by faculty"
        >
          <option value="">All faculties</option>
          {FACULTIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="AdminPanel__empty"><p>No members found.</p></div>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>University ID</th>
                <th>Email</th>
                <th>Faculty</th>
                <th>Year</th>
                <th>Department</th>
                <th>Account</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const hasAccount = Boolean(row.has_active_account);
                return (
                  <tr key={row.member_id}>
                    <td style={{ fontWeight: 600 }}>
                      {row.full_name}
                      {isAll && (row.season || row.season_id) && (
                        <> {' '}<SeasonBadge season={row.season} /></>
                      )}
                    </td>
                    <td>{row.university_id}</td>
                    <td>{row.email}</td>
                    <td>{row.faculty}</td>
                    <td>{row.year}</td>
                    <td>{row.department?.name || getDepartmentNameById(row.department_id)}</td>
                    <td>
                      <span
                        className={`AdminPanel__badge AdminPanel__badge--${
                          hasAccount ? 'active' : 'pending'
                        }`}
                      >
                        {hasAccount ? 'Active' : 'No account'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      {!hasAccount && (
                        <button
                          type="button"
                          className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                          disabled={sendingId === row.member_id}
                          onClick={() => sendAccountMail(row)}
                        >
                          {sendingId === row.member_id
                            ? 'Sending…'
                            : 'Send mail'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                        onClick={() => remove(row)}
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

      {/* Edit Member Profile Modal */}
      {editingMember &&
        createPortal(
          <div className="AdminPanel__modalOverlay" onClick={closeEdit}>
            <div
              className="AdminPanel__modalContent"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <h3 className="AdminPanel__modalTitle">Edit Member Profile</h3>
              <form onSubmit={saveEdit}>
                <div className="AdminPanel__formGrid">
                  <label>
                    Full name
                    <input
                      type="text"
                      required
                      value={editForm.full_name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, full_name: e.target.value }))
                      }
                      placeholder="e.g. John Doe"
                    />
                  </label>
                  <label>
                    University ID
                    <input
                      type="text"
                      required
                      value={editForm.university_id}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, university_id: e.target.value }))
                      }
                      placeholder="e.g. 2022/12345"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="e.g. student@miuegypt.edu.eg"
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      type="tel"
                      value={editForm.phone_number}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, phone_number: e.target.value }))
                      }
                      placeholder="e.g. 01012345678"
                    />
                  </label>
                  <label>
                    Faculty
                    <select
                      value={editForm.faculty}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, faculty: e.target.value }))
                      }
                    >
                      <option value="">Select faculty</option>
                      {FACULTIES.map((fac) => (
                        <option key={fac} value={fac}>
                          {fac}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Academic Year
                    <select
                      value={editForm.year}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, year: e.target.value }))
                      }
                    >
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                      <option value="5">Year 5</option>
                    </select>
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Department
                    <select
                      required
                      value={editForm.department_id}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, department_id: e.target.value }))
                      }
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="AdminPanel__modalActions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--reject"
                    disabled={saving}
                    onClick={closeEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

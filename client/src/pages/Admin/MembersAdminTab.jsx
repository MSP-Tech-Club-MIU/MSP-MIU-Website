import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdPeople, MdMoreVert, MdEdit, MdDelete, MdEmail } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
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
  const [roleFilter, setRoleFilter] = useState('');
  const [departments, setDepartments] = useState(memberDepartments);
  const [sendingActivationId, setSendingActivationId] = useState(null);
  const [sendingAcceptanceId, setSendingAcceptanceId] = useState(null);

  // Row operations dropdown menu state
  const [openMenuMemberId, setOpenMenuMemberId] = useState(null);
  const [menuCoords, setMenuCoords] = useState(null);

  // Edit member state
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    university_id: '',
    email: '',
    phone_number: '',
    faculty: '',
    year: '1',
    department_id: '',
    role: 'member'
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
        role: roleFilter || undefined,
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
  }, [page, debounced, departmentId, faculty, roleFilter, onAlert, seasonFilters]);

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

  // Close operations menu on scroll, window resize, or escape key
  useEffect(() => {
    if (!openMenuMemberId) return undefined;

    const handleClose = () => {
      setOpenMenuMemberId(null);
      setMenuCoords(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuMemberId]);

  const handleToggleMenu = (e, row) => {
    e.stopPropagation();
    if (openMenuMemberId === row.member_id) {
      setOpenMenuMemberId(null);
      setMenuCoords(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 275;
    const estimatedHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let left = rect.right - menuWidth;
    if (left < 12) left = 12;
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    setMenuCoords({
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      left,
      openUp
    });
    setOpenMenuMemberId(row.member_id);
  };

  const openEdit = (row) => {
    setOpenMenuMemberId(null);
    setMenuCoords(null);
    setEditingMember(row);
    setEditForm({
      full_name: row.full_name || '',
      university_id: row.university_id || '',
      email: row.email || '',
      phone_number: row.phone_number || '',
      faculty: row.faculty || '',
      year: row.year != null ? String(row.year) : '1',
      department_id: row.department_id != null ? String(row.department_id) : '',
      role: row.role || 'member'
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
        department_id: Number(editForm.department_id),
        role: editForm.role === 'delegate' ? 'delegate' : 'member'
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
    setOpenMenuMemberId(null);
    setMenuCoords(null);
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
    setOpenMenuMemberId(null);
    setMenuCoords(null);
    if (!row?.email) {
      onAlert?.({ type: 'error', message: 'This member has no email address.' });
      return;
    }
    const hasAccount = Boolean(row.has_active_account);
    const ok = await confirmModal({
      title: hasAccount ? 'Resend Account Creation Email?' : 'Send Account Creation Email?',
      message: hasAccount
        ? `Member "${row.full_name}" (${row.email}) already has an account, but you can resend an activation email. Proceed?`
        : `Send account creation email to ${row.full_name} (${row.email})?`,
      confirmText: 'Send Email',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!ok) return;
    try {
      setSendingActivationId(row.member_id);
      const result = await ApiService.sendMemberActivationEmail(row.member_id);
      onAlert?.({
        type: 'success',
        message: result.message || `Account creation email sent to ${row.email}`
      });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to send email' });
    } finally {
      setSendingActivationId(null);
    }
  };

  const sendAcceptanceMail = async (row) => {
    setOpenMenuMemberId(null);
    setMenuCoords(null);
    if (!row?.email) {
      onAlert?.({ type: 'error', message: 'This member has no email address.' });
      return;
    }
    const deptName = row.department?.name || getDepartmentNameById(row.department_id) || 'assigned department';
    const ok = await confirmModal({
      title: 'Send Acceptance (WhatsApp) Email?',
      message: `Send acceptance email (with WhatsApp group link for "${deptName}") to ${row.full_name} (${row.email})?`,
      confirmText: 'Send Acceptance Email',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!ok) return;
    try {
      setSendingAcceptanceId(row.member_id);
      const result = await ApiService.sendMemberAcceptanceEmail(row.member_id);
      onAlert?.({
        type: 'success',
        message: result.message || `Acceptance (WhatsApp) email sent to ${row.email}`
      });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to send acceptance email' });
    } finally {
      setSendingAcceptanceId(null);
    }
  };

  const renderRowActionsMenu = () => {
    if (!openMenuMemberId || !menuCoords) return null;
    const selectedRow = items.find((m) => m.member_id === openMenuMemberId);
    if (!selectedRow) return null;

    const hasAccount = Boolean(selectedRow.has_active_account);
    const isSendingAcceptance = sendingAcceptanceId === selectedRow.member_id;
    const isSendingActivation = sendingActivationId === selectedRow.member_id;
    const deptName = selectedRow.department?.name || getDepartmentNameById(selectedRow.department_id);

    const closeMenu = () => {
      setOpenMenuMemberId(null);
      setMenuCoords(null);
    };

    return createPortal(
      <div className="CourseActions__portalWrapper">
        <div className="CourseActions__backdrop" onClick={closeMenu} />
        <div
          className={`CourseActions__menu CourseActions__menu--portal ${
            menuCoords.openUp ? 'CourseActions__menu--up' : ''
          }`}
          style={{
            position: 'fixed',
            top: menuCoords.openUp ? 'auto' : `${menuCoords.top}px`,
            bottom: menuCoords.openUp ? `${menuCoords.bottom}px` : 'auto',
            left: `${menuCoords.left}px`,
            width: '275px',
            zIndex: 10001
          }}
          role="menu"
          aria-label="Member operations"
        >
          <div className="CourseActions__menuHeader">Email Operations</div>

          <button
            type="button"
            className="CourseActions__menuItem"
            role="menuitem"
            disabled={isSendingAcceptance}
            onClick={() => sendAcceptanceMail(selectedRow)}
          >
            {isSendingAcceptance ? (
              <span className="CourseActions__inlineSpinner" />
            ) : (
              <FaWhatsapp className="CourseActions__itemIcon CourseActions__itemIcon--whatsapp" />
            )}
            <div className="CourseActions__itemContent">
              <span>Send Acceptance (WhatsApp)</span>
              <span className="CourseActions__itemDesc">
                {deptName ? `${deptName} group invitation` : 'Includes WhatsApp group link'}
              </span>
            </div>
          </button>

          <button
            type="button"
            className="CourseActions__menuItem"
            role="menuitem"
            disabled={isSendingActivation}
            onClick={() => sendAccountMail(selectedRow)}
          >
            {isSendingActivation ? (
              <span className="CourseActions__inlineSpinner" />
            ) : (
              <MdEmail className="CourseActions__itemIcon" style={{ color: '#64B5F6' }} />
            )}
            <div className="CourseActions__itemContent">
              <span>{hasAccount ? 'Resend Account Email' : 'Send Account Creation Email'}</span>
              <span className="CourseActions__itemDesc">
                {hasAccount ? 'Account active · sends reset/login link' : 'Sends activation link to set password'}
              </span>
            </div>
          </button>

          <div className="CourseActions__menuDivider" />
          <div className="CourseActions__menuHeader">Member Management</div>

          <button
            type="button"
            className="CourseActions__menuItem"
            role="menuitem"
            onClick={() => openEdit(selectedRow)}
          >
            <MdEdit className="CourseActions__itemIcon" style={{ color: '#90CAF9' }} />
            <div className="CourseActions__itemContent">
              <span>Edit Member Profile</span>
              <span className="CourseActions__itemDesc">Update details, faculty, department</span>
            </div>
          </button>

          <button
            type="button"
            className="CourseActions__menuItem CourseActions__menuItem--danger"
            role="menuitem"
            onClick={() => remove(selectedRow)}
          >
            <MdDelete className="CourseActions__itemIcon" />
            <div className="CourseActions__itemContent">
              <span>Delete Member</span>
              <span className="CourseActions__itemDesc">Remove member from club</span>
            </div>
          </button>
        </div>
      </div>,
      document.body
    );
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
        <select
          className="AdminPanel__filterSelect"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="member">Members only</option>
          <option value="delegate">Delegates only</option>
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
                <th>Role</th>
                <th>Account</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const hasAccount = Boolean(row.has_active_account);
                const isOperating =
                  sendingAcceptanceId === row.member_id ||
                  sendingActivationId === row.member_id;

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
                          row.role === 'delegate' ? 'delegate' : 'member'
                        }`}
                      >
                        {row.role === 'delegate' ? '⭐ Delegate' : 'Member'}
                      </span>
                    </td>
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
                      <div className="CourseActions__row" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                          onClick={() => openEdit(row)}
                          title="Edit member details"
                        >
                          Edit
                        </button>
                        <div className="CourseActions__menuWrapper">
                          <button
                            type="button"
                            className={`CourseActions__iconBtn ${
                              openMenuMemberId === row.member_id
                                ? 'CourseActions__iconBtn--active'
                                : ''
                            }`}
                            onClick={(e) => handleToggleMenu(e, row)}
                            title="Member options & operations"
                            aria-label={`Operations for ${row.full_name}`}
                            aria-expanded={openMenuMemberId === row.member_id}
                            disabled={isOperating}
                          >
                            {isOperating ? (
                              <span className="CourseActions__inlineSpinner" />
                            ) : (
                              <MdMoreVert />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Row operations floating menu */}
      {renderRowActionsMenu()}

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
                  <label className="AdminPanel__fullWidth">
                    Club Role
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, role: e.target.value }))
                      }
                    >
                      <option value="member">Member</option>
                      <option value="delegate">Delegate</option>
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

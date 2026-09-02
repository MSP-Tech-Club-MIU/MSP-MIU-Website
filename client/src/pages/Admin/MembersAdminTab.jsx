import React, { useCallback, useEffect, useState } from 'react';
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
                      {!hasAccount && (
                        <button
                          type="button"
                          className="AdminPanel__actionBtn AdminPanel__actionBtn--approve"
                          disabled={sendingId === row.member_id}
                          onClick={() => sendAccountMail(row)}
                        >
                          {sendingId === row.member_id
                            ? 'Sending…'
                            : 'Send account creation mail'}
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
    </div>
  );
}

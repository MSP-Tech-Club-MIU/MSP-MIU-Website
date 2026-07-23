import React, { useCallback, useEffect, useState } from 'react';
import { MdPeople } from 'react-icons/md';
import ApiService from '../../services/api';
import Pagination from '../../components/Pagination';
import { getDepartmentNameById } from '../../data/departments';

const LIST_LIMIT = 20;

export default function MembersAdminTab({ onAlert }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

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
        search: debounced || undefined
      });
      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load members' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, onAlert]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Remove member "${row.full_name}"? This cannot be undone.`)) return;
    try {
      await ApiService.deleteMember(row.member_id);
      onAlert?.({ type: 'success', message: 'Member deleted.' });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Delete failed' });
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.member_id}>
                  <td style={{ fontWeight: 600 }}>{row.full_name}</td>
                  <td>{row.university_id}</td>
                  <td>{row.email}</td>
                  <td>{row.faculty}</td>
                  <td>{row.year}</td>
                  <td>{row.department?.name || getDepartmentNameById(row.department_id)}</td>
                  <td>
                    <button
                      type="button"
                      className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                      onClick={() => remove(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={pagination} onPageChange={setPage} />
    </div>
  );
}

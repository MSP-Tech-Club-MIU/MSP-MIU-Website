import React, { memo } from 'react';
import { getDepartmentNameById } from '../data/departments';

const ApplicationsTable = memo(({
  filteredApplications,
  handleTextClick,
  openCommentModal,
  handleStatusChange,
  getStatusColor,
  handleDelete,
  theme = 'light'
}) => {
  const isAdmin = theme === 'admin';

  if (isAdmin) {
    return (
      <div className="RegAdmin__tableWrap">
        <table className="RegAdmin__table">
          <thead>
            <tr>
              <th>University ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Faculty</th>
              <th>Year</th>
              <th>Phone</th>
              <th>First Choice</th>
              <th>Second Choice</th>
              <th>Skills</th>
              <th>Why Join MSP?</th>
              <th>Interview</th>
              <th>Status</th>
              {handleDelete ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app) => (
              <tr key={app.application_id}>
                <td>{app.university_id}</td>
                <td>
                  <span
                    className="RegAdmin__linkish"
                    onClick={() => openCommentModal(app)}
                    title="Click to add/edit interview comment"
                  >
                    {app.full_name}
                  </span>
                  <div className="RegAdmin__hint">Click to add comment</div>
                </td>
                <td>
                  <a className="RegAdmin__linkish" href={`mailto:${app.email}`}>{app.email}</a>
                  <div className="RegAdmin__hint">Click to send mail</div>
                </td>
                <td>{app.faculty}</td>
                <td>{app.year}</td>
                <td>
                  <a
                    className="RegAdmin__linkish"
                    href={`https://wa.me/${String(app.phone_number || '').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {app.phone_number}
                  </a>
                  <div className="RegAdmin__hint">WhatsApp</div>
                </td>
                <td>{getDepartmentNameById(app.first_choice)}</td>
                <td>{app.second_choice ? getDepartmentNameById(app.second_choice) : 'N/A'}</td>
                <td style={{ maxWidth: 200 }}>
                  <span
                    className={app.skills?.length > 100 ? 'RegAdmin__linkish' : undefined}
                    onClick={() => handleTextClick('skills', app.application_id, app.skills)}
                  >
                    {app.skills?.length > 100 ? `${app.skills.substring(0, 100)}...` : app.skills}
                  </span>
                  {app.skills?.length > 100 && <div className="RegAdmin__hint">View more</div>}
                </td>
                <td style={{ maxWidth: 200 }}>
                  <span
                    className={app.motivation?.length > 100 ? 'RegAdmin__linkish' : undefined}
                    onClick={() => handleTextClick('motivation', app.application_id, app.motivation)}
                  >
                    {app.motivation?.length > 100 ? `${app.motivation.substring(0, 100)}...` : app.motivation}
                  </span>
                  {app.motivation?.length > 100 && <div className="RegAdmin__hint">View more</div>}
                </td>
                <td>{app.interview}</td>
                <td>
                  <select
                    className="RegAdmin__statusSelect"
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.application_id, e.target.value)}
                    style={{ backgroundColor: getStatusColor(app.status) }}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
                {handleDelete ? (
                  <td>
                    <button
                      type="button"
                      className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                      onClick={() => handleDelete(app)}
                    >
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#395a7f' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>University ID</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Full Name</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Faculty</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Year</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Phone</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>First Choice</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Second Choice</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Skills</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Why Join MSP?</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Interview</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredApplications.map((app) => (
            <tr key={app.application_id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '8px' }}>{app.university_id}</td>
              <td style={{ padding: '8px' }}>
                <div>
                  <span
                    onClick={() => openCommentModal(app)}
                    style={{
                      cursor: 'pointer',
                      color: 'inherit',
                      textDecoration: 'underline',
                      fontWeight: '500'
                    }}
                    title="Click to add/edit interview comment"
                  >
                    {app.full_name}
                  </span>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                    Click to add comment
                  </div>
                </div>
              </td>
              <td style={{ padding: '8px' }}>
                <a href={`mailto:${app.email}`} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: '500' }}>
                  {app.email}
                </a>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                  Click to send mail
                </div>
              </td>
              <td style={{ padding: '8px' }}>{app.faculty}</td>
              <td style={{ padding: '8px' }}>{app.year}</td>
              <td style={{ padding: '8px' }}>
                <a
                  href={`https://wa.me/${String(app.phone_number || '').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline', fontWeight: '500' }}
                >
                  {app.phone_number}
                </a>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                  Click to chat on WhatsApp
                </div>
              </td>
              <td style={{ padding: '8px' }}>{getDepartmentNameById(app.first_choice)}</td>
              <td style={{ padding: '8px' }}>
                {app.second_choice ? getDepartmentNameById(app.second_choice) : 'N/A'}
              </td>
              <td style={{ padding: '8px', maxWidth: '200px', wordWrap: 'break-word' }}>
                <span
                  onClick={() => handleTextClick('skills', app.application_id, app.skills)}
                  style={{
                    cursor: app.skills?.length > 100 ? 'pointer' : 'default',
                    textDecoration: app.skills?.length > 100 ? 'underline' : 'none'
                  }}
                >
                  {app.skills?.length > 100 ? `${app.skills.substring(0, 100)}...` : app.skills}
                </span>
              </td>
              <td style={{ padding: '8px', maxWidth: '200px', wordWrap: 'break-word' }}>
                <span
                  onClick={() => handleTextClick('motivation', app.application_id, app.motivation)}
                  style={{
                    cursor: app.motivation?.length > 100 ? 'pointer' : 'default',
                    textDecoration: app.motivation?.length > 100 ? 'underline' : 'none'
                  }}
                >
                  {app.motivation?.length > 100 ? `${app.motivation.substring(0, 100)}...` : app.motivation}
                </span>
              </td>
              <td style={{ padding: '8px' }}>{app.interview}</td>
              <td style={{ padding: '8px' }}>
                <select
                  value={app.status}
                  onChange={(e) => handleStatusChange(app.application_id, e.target.value)}
                  style={{
                    padding: '4px',
                    fontSize: '12px',
                    backgroundColor: getStatusColor(app.status),
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

ApplicationsTable.displayName = 'ApplicationsTable';

export default ApplicationsTable;

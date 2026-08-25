import React, { memo } from 'react';
import { memberDepartments } from '../data/departments';

const FiltersSection = memo(({
  filters,
  searchTerm,
  filteredApplications,
  handleFilterChange,
  handleSearchChange,
  clearFilters,
  applyFilters,
  isFiltering,
  theme = 'light'
}) => {
  const isAdmin = theme === 'admin';

  if (isAdmin) {
    return (
      <div className="RegAdmin__filters">
        <h3 className="RegAdmin__filtersTitle">Filters</h3>

        <div className="RegAdmin__searchWrap">
          <input
            type="text"
            className="RegAdmin__input"
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="RegAdmin__filterRow">
          <div className="RegAdmin__field">
            <label>First Choice</label>
            <select
              className="RegAdmin__select"
              value={filters.first_choice}
              onChange={(e) => handleFilterChange('first_choice', e.target.value)}
            >
              <option value="">All Departments</option>
              {memberDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="RegAdmin__field">
            <label>Second Choice</label>
            <select
              className="RegAdmin__select"
              value={filters.second_choice}
              onChange={(e) => handleFilterChange('second_choice', e.target.value)}
            >
              <option value="">All Departments</option>
              {memberDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="RegAdmin__field">
            <label>Status</label>
            <select
              className="RegAdmin__select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="RegAdmin__field">
            <label>Faculty</label>
            <select
              className="RegAdmin__select"
              value={filters.faculty}
              onChange={(e) => handleFilterChange('faculty', e.target.value)}
            >
              <option value="">All Faculties</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Engineering Sciences & Arts - ECE">Engineering Sciences & Arts - ECE</option>
              <option value="Mass Communication">Mass Communication</option>
              <option value="Dentistry">Dentistry</option>
              <option value="Engineering Sciences & Arts - Architecture">Engineering Sciences & Arts - Architecture</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Business">Business</option>
              <option value="Alsun">Alsun</option>
            </select>
          </div>

          <div className="RegAdmin__field">
            <label>Year</label>
            <select
              className="RegAdmin__select"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
            >
              <option value="">All Years</option>
              <option value="1">Freshman</option>
              <option value="2">Sophomore</option>
              <option value="3">Junior</option>
              <option value="4">Senior</option>
              <option value="5">Senior 2</option>
            </select>
          </div>
        </div>

        <div className="RegAdmin__actions">
          <button
            type="button"
            className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
            onClick={applyFilters}
            disabled={isFiltering}
          >
            {isFiltering ? 'Filtering...' : 'Apply Filters'}
          </button>
          <button
            type="button"
            className="AdminPanel__actionBtn AdminPanel__actionBtn--reject"
            onClick={clearFilters}
          >
            Clear All Filters
          </button>
        </div>

        <p className="RegAdmin__meta">Showing {filteredApplications.length} applications</p>
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: '20px',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#395a7f' }}>Filters</h3>

      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          placeholder="Search applications..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            padding: '10px',
            width: '300px',
            border: '1px solid #ccc',
            color: '#395a7f',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        color: '#395a7f',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#395a7f' }}>
            First Choice:
          </label>
          <select
            value={filters.first_choice}
            onChange={(e) => handleFilterChange('first_choice', e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#395a7f',
              minWidth: '150px'
            }}
          >
            <option value="">All Departments</option>
            {memberDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#395a7f' }}>
            Second Choice:
          </label>
          <select
            value={filters.second_choice}
            onChange={(e) => handleFilterChange('second_choice', e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#395a7f',
              minWidth: '150px'
            }}
          >
            <option value="">All Departments</option>
            {memberDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#395a7f' }}>
            Status:
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#395a7f',
              minWidth: '120px'
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#395a7f' }}>
            Faculty:
          </label>
          <select
            value={filters.faculty}
            onChange={(e) => handleFilterChange('faculty', e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#395a7f',
              minWidth: '150px'
            }}
          >
            <option value="">All Faculties</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Engineering Sciences & Arts - ECE">Engineering Sciences & Arts - ECE</option>
            <option value="Mass Communication">Mass Communication</option>
            <option value="Dentistry">Dentistry</option>
            <option value="Engineering Sciences & Arts - Architecture">Engineering Sciences & Arts - Architecture</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Business">Business</option>
            <option value="Alsun">Alsun</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#395a7f' }}>
            Year:
          </label>
          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#395a7f',
              minWidth: '100px'
            }}
          >
            <option value="">All Years</option>
            <option value="1">Freshman</option>
            <option value="2">Sophomore</option>
            <option value="3">Junior</option>
            <option value="4">Senior</option>
            <option value="5">Senior 2</option>
          </select>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <button
          onClick={applyFilters}
          disabled={isFiltering}
          style={{
            padding: '10px 20px',
            backgroundColor: isFiltering ? '#ccc' : '#395a7f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: isFiltering ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          {isFiltering ? 'Filtering...' : 'Apply Filters'}
        </button>

        <button
          onClick={clearFilters}
          style={{
            padding: '10px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Clear All Filters
        </button>
      </div>

      <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '14px' }}>
        Showing {filteredApplications.length} applications
      </p>
    </div>
  );
});

FiltersSection.displayName = 'FiltersSection';

export default FiltersSection;

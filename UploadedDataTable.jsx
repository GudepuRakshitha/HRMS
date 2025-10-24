import React, { useState, useMemo, useEffect } from 'react';
//import './src/styles/dashboard-table.css';
//import './src/styles/Dashboard.css';
//import "../styles/dashboard-table.css";
import '../../components/LeaveManagement/EmployeeList.css';

export default function UploadedDataTable({ data, onInviteSelected, loading, type = 'candidate' }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'asc' });
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    const validData = Array.isArray(data) ? data : [];

    let filtered = validData.filter(item => {
      if (!search) return true;
      const searchTerm = search.toLowerCase();
      return (
        (item.firstName || '').toLowerCase().includes(searchTerm) ||
        (item.lastName || '').toLowerCase().includes(searchTerm) ||
        (item.email || '').toLowerCase().includes(searchTerm) ||
        (item.phoneNumber || '').toLowerCase().includes(searchTerm) ||
        (item.status || '').toLowerCase().includes(searchTerm)
      );
    });

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';

      if (sortConfig.direction === 'asc') {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });

    setFilteredData(filtered);
  }, [data, search, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="sort-icon"></span>;
    return sortConfig.direction === 'asc' ? <span className="sort-icon">▲</span> : <span className="sort-icon">▼</span>;
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    setSelected(checked ? filteredData.map((item, idx) => idx) : []);
  };

  const handleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleInviteSelected = () => {
    const selectedItems = filteredData.filter((item, idx) => selected.includes(idx));
    onInviteSelected(selectedItems);
  };

  return (
    <div className="employee-list-root uploaded-data-table-container">
      <div className="dashboard-controls">
        <input
          type="text"
          placeholder="Search by first name, last name, email, phone, status..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="employee-list-container">
        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
              </th>
              <th className="sortable" onClick={() => handleSort('firstName')}>First Name {getSortIcon('firstName')}</th>
              <th className="sortable" onClick={() => handleSort('lastName')}>Last Name {getSortIcon('lastName')}</th>
              <th className="sortable" onClick={() => handleSort('email')}>Email {getSortIcon('email')}</th>
              <th className="sortable" onClick={() => handleSort('phoneNumber')}>Phone {getSortIcon('phoneNumber')}</th>
              <th className="sortable" onClick={() => handleSort('status')}>Status {getSortIcon('status')}</th>
              <th>Email Sent</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="empty-state">Loading data...</td></tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((item, idx) => (
                <tr key={idx} className={selected.includes(idx) ? 'selected-row' : ''}>
                  <td>
                    <input type="checkbox" checked={selected.includes(idx)} onChange={() => handleSelect(idx)} />
                  </td>
                  <td>{item.firstName}</td>
                  <td>{item.lastName}</td>
                  <td>{item.email}</td>
                  <td>{item.phoneNumber}</td>
                  <td>{item.status}</td>
                  <td>{item.emailSent ? '✅' : '❌'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="empty-state">No data found.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {filteredData.length > 0 && (
        <div className="dashboard-actions">
          <button
            className="dashboard-invite-btn"
            onClick={handleInviteSelected}
            disabled={selected.length === 0 || loading}
          >
            Invite Selected ({selected.length})
          </button>
        </div>
      )}
    </div>
  );
}

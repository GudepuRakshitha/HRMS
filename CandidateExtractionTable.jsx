import React, { useMemo, useState } from 'react';
import EnhancedTable from './EnhancedTable';

// Candidate extraction table using the same header controls (Search / Filter / Settings / Reset)
// as the employee list via EnhancedTable.
export default function CandidateExtractionTable({ data = [], onInviteSelected, loading, type = 'candidate' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [filters, setFilters] = useState({ status: '' });

  // Map incoming data to rows and apply local search/filter
  const rows = useMemo(() => {
    const src = Array.isArray(data) ? data : [];
    let list = src.map((c, idx) => ({ id: c.id ?? idx, ...c }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phoneNumber || '').toLowerCase().includes(q) ||
        (String(c.status || '')).toLowerCase().includes(q)
      );
    }
    if (filters.status) {
      const f = filters.status.toLowerCase();
      list = list.filter(c => String(c.status || '').toLowerCase() === f);
    }
    return list;
  }, [data, searchQuery, filters]);

  const columns = [
    { key: 'name', label: 'Name', visible: true, className: 'col-name truncate' },
    { key: 'email', label: 'Email', visible: true, className: 'col-email truncate' },
    { key: 'phoneNumber', label: 'Phone', visible: true, className: 'col-phone' },
    { key: 'status', label: 'Status', visible: true, className: 'col-status' },
  ];

  const tableFilters = {
    status: {
      label: 'Status',
      options: [
        { label: 'All', value: '' },
        ...[...new Set((Array.isArray(data) ? data : []).map(r => r.status).filter(Boolean))]
          .map(v => ({ label: String(v), value: String(v) }))
      ]
    }
  };

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const handleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setSelected(newVal ? rows.map(r => r.id) : []);
  };

  const handleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="candidate-extraction-table-container">
      <EnhancedTable
        data={rows}
        columns={columns}
        onSearch={setSearchQuery}
        onFilter={setFilters}
        onSort={handleSort}
        searchPlaceholder="Search by name, email, phone, status..."
        filters={tableFilters}
        sortConfig={sortConfig}
        loading={loading}
        selectedRows={selected}
        onRowSelect={handleSelect}
        onSelectAll={handleSelectAll}
      />

      {rows.length > 0 && (
        <div className="invite-actions" style={{ marginTop: 16, textAlign: 'right' }}>
          <button
            className="btn-invite-selected"
            onClick={() => onInviteSelected && onInviteSelected(rows.filter(r => selected.includes(r.id)))}
            disabled={selected.length === 0 || loading}
          >
            Invite Selected ({selected.length})
          </button>
        </div>
      )}

      {rows.length === 0 && !loading && (
        <p>No candidates extracted or an error occurred.</p>
      )}
    </div>
  );
}
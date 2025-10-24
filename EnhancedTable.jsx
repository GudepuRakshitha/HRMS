import React, { useState, useRef, useEffect } from 'react';
import searchIcon from '../../assets/icons/search.svg';
import filterIcon from '../../assets/icons/filter.svg';
import settingsIcon from '../../assets/icons/settings.svg';
import '../../styles/EnhancedTable.css';

const EnhancedTable = ({ 
  data = [], 
  columns = [], 
  onSearch, 
  onFilter, 
  onSort,
  onColumnReorder,
  onColumnToggle,
  onColumnEdit,
  searchPlaceholder = "Search by ID, name, email...",
  filters = {},
  sortConfig = {},
  loading = false,
  selectedRows = [],
  onRowSelect,
  onSelectAll,
  actions = [],
  headerControlsHidden = false,
  controlledSearchQuery,
  triggerOpenFilters = 0,
  triggerOpenSettings = 0,
  triggerReset = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [columnNames, setColumnNames] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({});
  const [activeFilters, setActiveFilters] = useState({});

  const columnPanelRef = useRef(null);
  const filtersPanelRef = useRef(null);

  // Initialize column visibility and names
  useEffect(() => {
    const initialVisible = {};
    const initialNames = {};
    columns.forEach(col => {
      initialVisible[col.key] = col.visible !== false;
      initialNames[col.key] = col.label || col.key;
    });
    setVisibleColumns(initialVisible);
    setColumnNames(initialNames);
  }, [columns]);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (columnPanelRef.current && !columnPanelRef.current.contains(event.target)) {
        setShowColumnPanel(false);
        setEditingColumn(null);
      }
      if (filtersPanelRef.current && !filtersPanelRef.current.contains(event.target)) {
        setShowFiltersPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync controlled search from parent toolbar
  useEffect(() => {
    if (typeof controlledSearchQuery === 'string') {
      setSearchQuery(controlledSearchQuery);
      onSearch && onSearch(controlledSearchQuery);
    }
  }, [controlledSearchQuery]);

  // External triggers from parent toolbar
  const prevFiltersTrig = useRef(triggerOpenFilters);
  const prevSettingsTrig = useRef(triggerOpenSettings);
  const prevResetTrig = useRef(triggerReset);

  useEffect(() => {
    if (prevFiltersTrig.current !== triggerOpenFilters) {
      prevFiltersTrig.current = triggerOpenFilters;
      setShowFiltersPanel((v) => !v);
    }
  }, [triggerOpenFilters]);

  useEffect(() => {
    if (prevSettingsTrig.current !== triggerOpenSettings) {
      prevSettingsTrig.current = triggerOpenSettings;
      setShowColumnPanel((v) => !v);
    }
  }, [triggerOpenSettings]);

  useEffect(() => {
    if (prevResetTrig.current !== triggerReset) {
      prevResetTrig.current = triggerReset;
      handleResetFilters();
    }
  }, [triggerReset]);

  const handleSearch = (value) => {
    setSearchQuery(value);
    onSearch && onSearch(value);
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...activeFilters, [filterKey]: value };
    setActiveFilters(newFilters);
    onFilter && onFilter(newFilters);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
    onSearch && onSearch('');
    onFilter && onFilter({});
  };

  const handleColumnToggle = (columnKey) => {
    const newVisible = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisible);
    onColumnToggle && onColumnToggle(columnKey, newVisible[columnKey]);
  };

  const handleColumnNameEdit = (columnKey, newName) => {
    const newNames = { ...columnNames, [columnKey]: newName };
    setColumnNames(newNames);
    onColumnEdit && onColumnEdit(columnKey, newName);
    setEditingColumn(null);
  };

  const handleColumnReorder = (fromIndex, toIndex) => {
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, reorderedItem);
    
    onColumnReorder && onColumnReorder(items);
  };

  const getSortState = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction; // 'asc' | 'desc'
  };

  const getFilterOptions = (filterKey) => {
    // Generate filter options based on data
    const uniqueValues = [...new Set(data.map(row => row[filterKey]).filter(Boolean))];
    return uniqueValues.map(value => ({ label: value, value }));
  };

  return (
    <div className="enhanced-table-container">
      {/* Header Controls */}
      {!headerControlsHidden && (
      <div className="table-header-controls">
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            <button className="search-btn" onClick={() => handleSearch(searchQuery)} title="Search">
              <img src={searchIcon} alt="Search" style={{ width: 16, height: 16 }} />
            </button>
            <button 
              className={`filter-btn ${showFiltersPanel ? 'active' : ''}`}
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              title="Filters"
            >
              <img src={filterIcon} alt="Filters" style={{ width: 16, height: 16 }} />
            </button>
            <button
              className={`settings-btn ${showColumnPanel ? 'active' : ''}`}
              onClick={() => setShowColumnPanel(!showColumnPanel)}
              title="Manage Columns"
            >
              <img src={settingsIcon} alt="Settings" style={{ width: 16, height: 16 }} />
            </button>
            <button className="reset-btn" onClick={handleResetFilters}>
              Reset
            </button>
          </div>
        </div>

        <div className="table-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              className={`action-btn ${action.variant || 'primary'} ${action.size === 'sm' ? 'small' : ''}`}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <span className="action-icon">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Main Content Area */}
      <div className="table-content-area">
        {/* Column Management Panel */}
        {showColumnPanel && (
          <div className="column-panel" ref={columnPanelRef}>
            <div className="panel-header">
              <h3>Table Columns</h3>
              <button 
                className="close-panel-btn"
                onClick={() => setShowColumnPanel(false)}
              >
                ✕
              </button>
            </div>
            <div className="panel-content">
              <div className="columns-list">
                {columns.map((column, index) => (
                  <div key={column.key} className="column-item">
                    <div className="column-reorder-controls">
                      <button
                        className="reorder-btn"
                        onClick={() => handleColumnReorder(index, Math.max(0, index - 1))}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        className="reorder-btn"
                        onClick={() => handleColumnReorder(index, Math.min(columns.length - 1, index + 1))}
                        disabled={index === columns.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                    
                    <div className="column-name">
                      {editingColumn === column.key ? (
                        <input
                          type="text"
                          value={columnNames[column.key] || ''}
                          onChange={(e) => setColumnNames({
                            ...columnNames,
                            [column.key]: e.target.value
                          })}
                          onBlur={() => handleColumnNameEdit(column.key, columnNames[column.key])}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleColumnNameEdit(column.key, columnNames[column.key]);
                            }
                          }}
                          autoFocus
                          className="column-name-input"
                        />
                      ) : (
                        <span>{columnNames[column.key] || column.label}</span>
                      )}
                    </div>

                    <div className="column-actions">
                      <button
                        className="edit-column-btn"
                        onClick={() => setEditingColumn(column.key)}
                        title="Edit column name"
                      >
                        ✏️
                      </button>
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.key] || false}
                        onChange={() => handleColumnToggle(column.key)}
                        className="column-checkbox"
                        title="Show/hide column"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="panel-tip">
                <small>💡 Tip: Double-click a table header to rename it.</small>
              </div>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFiltersPanel && (
          <div className="filters-panel" ref={filtersPanelRef}>
            <div className="panel-header">
              <h3>Filters</h3>
              <button 
                className="close-panel-btn"
                onClick={() => setShowFiltersPanel(false)}
              >
                ✕
              </button>
            </div>
            <div className="panel-content">
              {Object.keys(filters).map(filterKey => (
                <div key={filterKey} className="filter-group">
                  <label className="filter-label">
                    {filters[filterKey].label || filterKey}
                  </label>
                  <select
                    value={activeFilters[filterKey] || ''}
                    onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Select {filters[filterKey].label || filterKey}</option>
                    {(filters[filterKey].options || getFilterOptions(filterKey)).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              
              <div className="filter-actions">
                <button className="clear-filters-btn" onClick={handleResetFilters}>
                  Clear All
                </button>
                <button className="apply-filters-btn" onClick={() => setShowFiltersPanel(false)}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="table-wrapper">
          <div className="table-controls-bar">
            <div className="table-info">
              {selectedRows.length > 0 && (
                <span className="selected-count">
                  {selectedRows.length} selected
                </span>
              )}
            </div>
          </div>

          <table className="enhanced-table">
            <thead>
              <tr>
                {onRowSelect && (
                  <th className="select-column">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === data.length && data.length > 0}
                      onChange={onSelectAll}
                    />
                  </th>
                )}
                {columns
                  .filter(col => visibleColumns[col.key])
                  .map(column => (
                    <th
                      key={column.key}
                      className={`sortable ${sortConfig.key === column.key ? 'sorted' : ''} ${column.className || ''}`}
                      onClick={() => onSort && onSort(column.key)}
                      onDoubleClick={() => setEditingColumn(column.key)}
                    >
                      <div className="th-content">
                        <span className={`th-label ${getSortState(column.key) ? 'active' : ''}`}>
                          {columnNames[column.key] || column.label}
                        </span>
                        {getSortState(column.key) && (
                          <span className={`sort-arrow ${getSortState(column.key)}`}>
                            {getSortState(column.key) === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (onRowSelect ? 1 : 0)} className="loading-cell">
                    <div className="loading-spinner"></div>
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (onRowSelect ? 1 : 0)} className="empty-cell">
                    No data found
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr
                    key={row.id || index}
                    className={selectedRows.includes(row.id) ? 'selected-row' : ''}
                  >
                    {onRowSelect && (
                      <td className="select-column">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={() => onRowSelect(row.id)}
                        />
                      </td>
                    )}
                    {columns
                      .filter(col => visibleColumns[col.key])
                      .map(column => (
                        <td key={column.key} className={column.className || ''}>
                          {column.render ? column.render(row[column.key], row) : row[column.key]}
                        </td>
                      ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTable;

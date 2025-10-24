import React, { useState, useEffect, useCallback, useRef } from "react";
import './OnboardingTables.css';
import PaginationBar from "../common/PaginationBar";
import "../../styles/Pagination.css";
import filterIcon from "../../assets/icons/filter.svg";
import settingsIcon from "../../assets/icons/settings.svg";
import { getProfileStatus, calculateProgressPercentage, getStatusColor } from "../../services/profileService";
import { employeeService } from "../../services/apiService";
import toast from "../../services/toastService";

export default function UploadEmployeeTable({ 
  controlledSearchQuery, 
  hideInlineSearch = false, 
  hideInlineControls = false,
  filterTrigger = 0,
  settingsTrigger = 0,
  resetTrigger = 0
}) {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "uploadedAt",
    direction: "desc",
  });
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusMap, setStatusMap] = useState({}); // userId → profile status

  // 🔹 Filters + Settings
  const [filters, setFilters] = useState({ status: "", emailSent: "", profileStatus: "" });
  const [visibleColumns, setVisibleColumns] = useState({
    email: true,
    firstName: true,
    lastName: true,
    phoneNumber: true,
    emailSent: false,
    profileStatus: true,
    uploadedAt: true,
    lastEmailAt: false,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filterRef = useRef(null);
  const settingsRef = useRef(null);

  // 🔹 Handle trigger props
  useEffect(() => {
    if (filterTrigger > 0) {
      setShowFilters(true);
    }
  }, [filterTrigger]);

  useEffect(() => {
    if (settingsTrigger > 0) {
      setShowSettings(true);
    }
  }, [settingsTrigger]);

  useEffect(() => {
    if (resetTrigger > 0) {
      setFilters({ status: "", emailSent: "", profileStatus: "" });
      setSearchQuery("");
      setCurrentPage(0);
      setShowFilters(false);
      setShowSettings(false);
    }
  }, [resetTrigger]);

  // 🔹 Fetch current employees list
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
        sortBy: sortConfig.key,
        direction: sortConfig.direction
      };

  // 🔹 DateTime formatter (for full date + time)
  const formatDateTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };
      
      if (searchQuery) params.search = searchQuery;
      if (filters.status) params.status = filters.status;
      if (filters.emailSent) params.emailSent = filters.emailSent;
      if (filters.profileStatus) params.profileStatus = filters.profileStatus;

      const data = await employeeService.getEmployees(params);
      if (Array.isArray(data)) {
        setEmployees(data);
        setTotalPages(1);
        setTotalElements(data.length);
      } else {
        const employeeData = data?.content || [];
        setEmployees(employeeData);
        setTotalPages(data?.totalPages || 0);
        setTotalElements(data?.totalElements || employeeData.length || 0);
      }
      setSelected([]);
      setSelectAll(false);

      // Fetch profile status for all employees
      const baseList = Array.isArray(data) ? data : (data?.content || []);
      if (baseList.length > 0) {
        const statusPromises = baseList.map(employee =>
          getProfileStatus(employee.id)
            .then(status => ({ userId: employee.id, status }))
            .catch(err => ({ userId: employee.id, status: null }))
        );
        const statusResults = await Promise.all(statusPromises);
        const map = {};
        statusResults.forEach(s => { map[s.userId] = s.status; });
        setStatusMap(map);
      }
    } catch (err) {
      setEmployees([]);
      const errorMessage = err.message.includes("You don't have permission") 
        ? "You don't have permission to view this data."
        : "Error fetching employees.";
      setMessage(`❌ ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortConfig, searchQuery, filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // 🔹 Refetch when filters or search change
  useEffect(() => {
    fetchEmployees();
  }, [filters, searchQuery, fetchEmployees]);

  // Sync controlled search from parent toolbar
  useEffect(() => {
    if (typeof controlledSearchQuery === 'string') {
      setSearchQuery(controlledSearchQuery);
    }
  }, [controlledSearchQuery]);

  // 🔹 Close filter/settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔹 Sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="sort-icon"></span>;
    return sortConfig.direction === "asc" ? (
      <span className="sort-icon">▲</span>
    ) : (
      <span className="sort-icon">▼</span>
    );
  };

  // 🔹 Selection
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    setSelected(checked ? employees.map((emp) => emp.id) : []);
  };

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // 🔹 Send emails
  const handleSendEmails = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one employee.");
      return;
    }
    
    const loadingToast = toast.loading("Sending emails...");
    setMessage("⏳ Sending emails...");
    
    try {
      const resp = await employeeService.sendEmployeeEmails({ ids: selected });
      // Patch only from backend `updated`
      if (resp && Array.isArray(resp.updated) && resp.updated.length > 0) {
        const updatedMap = new Map(resp.updated.map(u => [u.id, u]));
        setEmployees(prev => prev.map(emp => (
          updatedMap.has(emp.id) ? { ...emp, ...updatedMap.get(emp.id) } : emp
        )));
      }

      const updatedCount = Array.isArray(resp?.updated) ? resp.updated.length : 0;
      const failedCount = Array.isArray(resp?.failed) ? resp.failed.length : 0;
      const summary = failedCount > 0
        ? `Sent ${updatedCount}, Failed ${failedCount}`
        : (updatedCount > 0 ? `Successfully sent ${updatedCount} email${updatedCount > 1 ? 's' : ''}!` : 'No emails were sent.');
      setMessage(`✅ ${summary}`);
      toast.success(summary);

      // Per-entry failure toasts (limit to 10)
      if (failedCount > 0) {
        (resp.failed || []).slice(0, 10).forEach((f) => {
          const id = f?.id || f?.employeeId || f?.userId || 'unknown';
          const reason = f?.error || f?.message || 'Unknown error';
          toast.error(`Failed to send to ID ${id}: ${reason}`);
        });
      }

      toast.remove(loadingToast);
      // Refetch to ensure server state is reflected everywhere
      fetchEmployees();
    } catch (error) {
      if (error?.status === 404) {
        const m = (error?.data && (error.data.message || error.data.error)) || 'Resource not available';
        setMessage(`❌ ${m}`);
        toast.error(m);
        toast.remove(loadingToast);
        return;
      }
      const errorMessage = error.message || "Failed to send emails.";
      setMessage(`❌ ${errorMessage}`);
      toast.error(errorMessage);
      toast.remove(loadingToast);
    }
  };

  // 🔹 Pagination
  const handlePageChange = (newPage) => setCurrentPage(newPage);
  const handlePageSizeChange = (e) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(0);
  };

  // 🔹 Badges
  const renderStatusBadge = (status) => {
    const statusColors = {
      Pending: '#ffc107',
      Active: '#28a745',
      Rejected: '#dc3545',
      "On Leave": '#17a2b8',
      Terminated: '#6c757d',
      New: '#007bff',
      Interviewed: '#fd7e14',
      Offered: '#20c997',
    };
    
    const backgroundColor = statusColors[status] || '#6c757d';
    
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: backgroundColor,
        color: 'white'
      }}>
        {status || "-"}
      </span>
    );
  };

  const renderEmailBadge = (emailSent) => {
    return emailSent ? (
      <span className="badge badge-success">Mail Sent</span>
    ) : (
      <span className="badge badge-danger">Mail Not Sent</span>
    );
  };

  // 🔹 Profile Status Badge
  const renderProfileStatusBadge = (status) => {
    if (!status) {
      return (
        <span style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'center',
          backgroundColor: '#6c757d',
          color: 'white'
        }}>
          Loading...
        </span>
      );
    }

    const backgroundColor = getStatusColor(status.onboarding_status);
    const displayText = status.onboarding_status ? 
      status.onboarding_status.replace('_', ' ').toUpperCase() : 'NOT STARTED';

    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: backgroundColor,
        color: 'white'
      }}>
        {displayText}
      </span>
    );
  };

  // 🔹 Progress Bar
  const renderProgressBar = (status) => {
    if (!status) return null;
    
    const progressPercent = calculateProgressPercentage(status);
    
    return (
      <div style={{ width: '100%', marginTop: '4px' }}>
        <div style={{
          width: '100%',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            backgroundColor: progressPercent === 100 ? '#28a745' : '#007bff',
            height: '100%',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }}>
          </div>
        </div>
        <small style={{ fontSize: '10px', color: '#6c757d' }}>
          {progressPercent}% Complete
        </small>
      </div>
    );
  };

  return (
    <div className="upload-table-container">

      {/* Always show dropdowns when triggered, even if inline controls are hidden */}
      {(showFilters || showSettings) && (
        <div className="dashboard-controls" style={{ position: 'relative', zIndex: 1000 }}>
          {/* 🔽 Filter Dropdown */}
          {showFilters && (
            <div className="dropdown-wrapper" ref={filterRef} style={{ position: 'absolute', top: 0, left: 0 }}>
              <div className="dropdown-menu" style={{ position: 'static', display: 'block' }}>
                <label>
                  Status:
                  <select
                    className="filter-select"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                    <option value="Rejected">Rejected</option>
                    <option value="New">New</option>
                    <option value="Interviewed">Interviewed</option>
                    <option value="Offered">Offered</option>
                  </select>
                </label>

                <label>
                  Email Status:
                  <select
                    className="filter-select"
                    value={filters.emailSent}
                    onChange={(e) =>
                      setFilters({ ...filters, emailSent: e.target.value })
                    }
                  >
                    <option value="">All</option>
                    <option value="true">Sent</option>
                    <option value="false">Not Sent</option>
                  </select>
                </label>

                <label>
                  Profile Status:
                  <select
                    className="filter-select"
                    value={filters.profileStatus}
                    onChange={(e) =>
                      setFilters({ ...filters, profileStatus: e.target.value })
                    }
                  >
                    <option value="">All</option>
                    <option value="loading">Loading</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* ⚙️ Settings Dropdown */}
          {showSettings && (
            <div className="dropdown-wrapper" ref={settingsRef} style={{ position: 'absolute', top: 0, left: showFilters ? '250px' : '0' }}>
              <div className="dropdown-menu" style={{ position: 'static', display: 'block' }}>
                <h4>Manage Columns</h4>
                <div className="settings-options">
                  {Object.keys(visibleColumns).map((col) => (
                    <div key={col} className="settings-option">
                      <label>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col]}
                          onChange={() =>
                            setVisibleColumns((prev) => ({
                              ...prev,
                              [col]: !prev[col],
                            }))
                          }
                        />
                        {col}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!hideInlineControls && (
      <div className="dashboard-controls">
        {/* 🔍 Search (hidden when controlled by sticky toolbar) */}
        {!hideInlineSearch && (
          <input
            type="text"
            placeholder="Search employees..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        )}

        {/* 🔽 Filter Icon */}
        <div className="dropdown-wrapper" ref={filterRef}>
          <button
            className="icon-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            <img src={filterIcon} alt="Filter" className="icon" />
          </button>

          {showFilters && (
            <div className="dropdown-menu">
              <label>
                Status:
                <select
                  className="filter-select"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                  <option value="Rejected">Rejected</option>
                  <option value="New">New</option>
                  <option value="Interviewed">Interviewed</option>
                  <option value="Offered">Offered</option>
                </select>
              </label>

              <label>
                Email Status:
                <select
                  className="filter-select"
                  value={filters.emailSent}
                  onChange={(e) =>
                    setFilters({ ...filters, emailSent: e.target.value })
                  }
                >
                  <option value="">All</option>
                  <option value="true">Sent</option>
                  <option value="false">Not Sent</option>
                </select>
              </label>

              <label>
                Profile Status:
                <select
                  className="filter-select"
                  value={filters.profileStatus}
                  onChange={(e) =>
                    setFilters({ ...filters, profileStatus: e.target.value })
                  }
                >
                  <option value="">All</option>
                  <option value="loading">Loading</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
          )}
        </div>

        {/* ⚙️ Settings Icon */}
        <div className="dropdown-wrapper" ref={settingsRef}>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            <img src={settingsIcon} alt="Settings" className="icon" />
          </button>

          {showSettings && (
            <div className="dropdown-menu">
              <h4>Manage Columns</h4>
              <div className="settings-options">
                {Object.keys(visibleColumns).map((col) => (
                  <div key={col} className="settings-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={visibleColumns[col]}
                        onChange={() =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [col]: !prev[col],
                          }))
                        }
                      />
                      {col}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Page size moved to PaginationBar; top selector removed per request */}

        {/* 📧 Send Emails (hidden as requested) */}
      </div>
      )}

      {/* Employee Table */}
      <div className="dashboard-list">
        <table className="dashboard-table table-fixed">
          <thead>
            <tr>
              {visibleColumns.email && (
                <th
                  className={`sortable ue-col-email sticky-first-col ${sortConfig.key === 'email' ? 'sorted' : ''}`}
                  onClick={() => handleSort("email")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'email' ? 'active' : ''}`}>Email</span>
                    {sortConfig.key === 'email' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.firstName && (
                <th
                  className={`sortable ue-col-first ${sortConfig.key === 'firstName' ? 'sorted' : ''}`}
                  onClick={() => handleSort("firstName")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'firstName' ? 'active' : ''}`}>First Name</span>
                    {sortConfig.key === 'firstName' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.lastName && (
                <th
                  className={`sortable ue-col-last ${sortConfig.key === 'lastName' ? 'sorted' : ''}`}
                  onClick={() => handleSort("lastName")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'lastName' ? 'active' : ''}`}>Last Name</span>
                    {sortConfig.key === 'lastName' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.phoneNumber && (
                <th
                  className={`sortable ue-col-phone ${sortConfig.key === 'phoneNumber' ? 'sorted' : ''}`}
                  onClick={() => handleSort("phoneNumber")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'phoneNumber' ? 'active' : ''}`}>Phone</span>
                    {sortConfig.key === 'phoneNumber' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.emailSent && (
                <th
                  className={`sortable ue-col-status ${sortConfig.key === 'emailSent' ? 'sorted' : ''}`}
                  onClick={() => handleSort("emailSent")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'emailSent' ? 'active' : ''}`}>Email Status</span>
                    {sortConfig.key === 'emailSent' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.profileStatus && (
                <th
                  className={`sortable ue-col-profile ${sortConfig.key === 'profileStatus' ? 'sorted' : ''}`}
                  onClick={() => handleSort("profileStatus")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'profileStatus' ? 'active' : ''}`}>Profile Status</span>
                    {sortConfig.key === 'profileStatus' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.lastEmailAt && (
                <th
                  className={`sortable ue-col-last-email ${sortConfig.key === 'lastEmailAt' ? 'sorted' : ''}`}
                  onClick={() => handleSort("lastEmailAt")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'lastEmailAt' ? 'active' : ''}`}>Last Email</span>
                    {sortConfig.key === 'lastEmailAt' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.uploadedAt && (
                <th
                  className={`sortable ue-col-uploaded ${sortConfig.key === 'uploadedAt' ? 'sorted' : ''}`}
                  onClick={() => handleSort("uploadedAt")}
                >
                  <div className="th-content">
                    <span className={`th-label ${sortConfig.key === 'uploadedAt' ? 'active' : ''}`}>Uploaded</span>
                    {sortConfig.key === 'uploadedAt' && (
                      <span className={`sort-arrow ${sortConfig.direction}`}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="10" className="loading-cell">
                  Loading employees...
                </td>
              </tr>
            ) : employees.length > 0 ? (
              employees.map((emp) => (
                <tr key={emp.id}>
                  {visibleColumns.email && <td className="ue-col-email truncate sticky-first-col">{emp.email || emp.username}</td>}
                  {visibleColumns.firstName && <td className="ue-col-first truncate">{emp.firstName || "-"}</td>}
                  {visibleColumns.lastName && <td className="ue-col-last truncate">{emp.lastName || "-"}</td>}
                  {visibleColumns.phoneNumber && (
                    <td className="ue-col-phone truncate">{emp.phoneNumber || "-"}</td>
                  )}
                  {visibleColumns.emailSent && (
                    <td className="ue-col-status">{renderEmailBadge(emp.emailSent)}</td>
                  )}
                  {visibleColumns.profileStatus && (
                    <td className="ue-col-profile">
                      <div>
                        {renderProfileStatusBadge(statusMap[emp.id])}
                        {renderProgressBar(statusMap[emp.id])}
                      </div>
                    </td>
                  )}
                  {visibleColumns.lastEmailAt && (
                    <td className="ue-col-last-email truncate">
                      {emp.emailSentAt ? formatDateTime(emp.emailSentAt) : "-"}
                    </td>
                  )}
                  {visibleColumns.uploadedAt && (
                    <td className="ue-col-uploaded truncate">
                      {emp.uploadedAt
                        ? new Date(emp.uploadedAt).toLocaleString(undefined, {
                            year: 'numeric', month: 'short', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : "-"}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="empty-cell">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalElements={totalElements}
        onPageChange={handlePageChange}
        onPageSizeChange={(n) => { setPageSize(Number(n)); setCurrentPage(0); }}
      />

      {message && <div className="dashboard-message">{message}</div>}
    </div>
  );
}
 
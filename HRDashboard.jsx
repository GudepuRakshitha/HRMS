import React, { useState, useEffect, useMemo, useRef } from "react";
import HRDashboardLayout from "./HRDashboardLayout";
import AddEmployeeForm from "./AddEmployeeForm";
import HRAddApplicationForm from "./HRAddApplicationForm";

import filterIcon from "../../assets/icons/filter.svg";
import editIcon from "../../assets/icons/edit.svg";
import settingsIcon from "../../assets/icons/settings.svg";
import api from '../utils/api.jsx';

export default function HRDashboard() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // UI / controls
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [compactRows, setCompactRows] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "ascending",
  });

  // Selection & actions
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [inviteSummary, setInviteSummary] = useState([]);
  const [bulkAction, setBulkAction] = useState("");

  // ---- Badge helpers (use your existing CSS colors) ----
  const getStatusBadgeClass = (status) => {
    switch ((status || "").toLowerCase()) {
      // map to your color set
      case "active":
      case "offered":
        return "badge green";
      case "on leave":
      case "interviewed":
        return "badge blue";
      case "terminated":
      case "rejected":
        return "badge red";
      case "new":
        return "badge yellow";
      default:
        return "badge gray";
    }
  };

  const renderStatusBadge = (status) => (
    <span className={getStatusBadgeClass(status)}>{status || "-"}</span>
  );

  const renderMailBadge = (invited) =>
    invited ? (
      <span className="badge green">Mail Sent</span>
    ) : (
      <span className="badge red">Mail Not Sent</span>
    );

  // ---- Data ----
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
      };

      const { data: res } = await api.get('/employees', { params });
      setEmployees(res?.data || []);
      setSelected([]);
      setSelectAll(false);
    } catch (err) {
      setEmployees([]);
      setMessage("❌ Error fetching employee data.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterStatus, sortConfig]);

  // Inline single employee status update (used when editMode is on)
  const updateEmployeeStatus = async (id, status) => {
    try {
      await api.post('/employees/bulk-status', {
        employeeIds: [id],
        status,
      });
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );
      setMessage(`✅ Status updated to "${status}".`);
    } catch {
      setMessage("❌ Failed to update status.");
    }
  };

  // Sorting
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="sort-icon"></span>;
    return sortConfig.direction === "ascending" ? (
      <span className="sort-icon">▲</span>
    ) : (
      <span className="sort-icon">▼</span>
    );
  };

  // Selection
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

  // Invite / bulk actions
  const handleInvite = async () => {
    setMessage("");
    setInviteSummary([]);
    try {
      const ccList = ccEmails.split(",").map((e) => e.trim()).filter(Boolean);
      await api.post('/employees/invite', {
        employeeIds: selected,
        ccEmails: ccList,
      });
      setMessage("✅ Invites sent successfully!");
      const invited = employees.filter((emp) => selected.includes(emp.id));
      setInviteSummary(
        invited.map((emp) => ({
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
        }))
      );
      fetchEmployees();
    } catch {
      setMessage("❌ Failed to send invites.");
    }
  };

  const handleBulkAction = async (status) => {
    if (!status || selected.length === 0) return;
    setBulkAction(status);
    try {
      await api.post('/employees/bulk-status', {
        employeeIds: selected,
        status,
      });
      setMessage(`✅ Status updated to "${status}" for ${selected.length} employees.`);
      fetchEmployees();
    } catch {
      setMessage(`❌ Failed to update status to "${status}".`);
    } finally {
      setBulkAction("");
    }
  };

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 400);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("");
  };

  return (
    <HRDashboardLayout>
      <div className={`dashboard-container ${compactRows ? "table-compact" : ""}`}>
        <div className="dashboard-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ margin: 0 }}>HR Dashboard</h1>

          {/* Top-right toolbar */}
          <div className="table-toolbar" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="icon-button"
              title="Filter"
              onClick={() => setShowFilters((v) => !v)}
            >
              <img src={filterIcon} alt="Filter" style={{ width: 20, height: 20 }} />
            </button>

            <button
              type="button"
              className={`icon-button ${editMode ? "active" : ""}`}
              title={editMode ? "Exit Edit" : "Edit"}
              onClick={() => setEditMode((v) => !v)}
            >
              <img src={editIcon} alt="Edit" style={{ width: 20, height: 20 }} />
            </button>

            <button
              type="button"
              className="icon-button"
              title="Settings"
              onClick={() => setShowSettings(true)}
            >
              <img src={settingsIcon} alt="Settings" style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Add forms */}
        <AddEmployeeForm onEmployeeAdded={fetchEmployees} />
        <HRAddApplicationForm />

        {/* Filters */}
        {showFilters && (
          <div className="dashboard-controls">
            <input
              type="text"
              placeholder="Search by name or email..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Filter by All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
              <option value="New">New</option>
              <option value="Interviewed">Interviewed</option>
              <option value="Offered">Offered</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button className="action-button" type="button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        )}

        {/* Employee Table */}
        <div className="dashboard-list">
          <table className={`dashboard-table ${compactRows ? "is-compact" : ""}`}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th onClick={() => handleSort("name")} className="sortable">
                  Name {getSortIcon("name")}
                </th>
                <th onClick={() => handleSort("email")} className="sortable">
                  Email {getSortIcon("email")}
                </th>
                <th>Phone Num</th>
                <th onClick={() => handleSort("status")} className="sortable">
                  Status {getSortIcon("status")}
                </th>
                <th>Mail</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="loading-cell">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length > 0 ? (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className={selected.includes(emp.id) ? "selected-row" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(emp.id)}
                        onChange={() => handleSelect(emp.id)}
                      />
                    </td>
                    <td>{emp.name || "-"}</td>
                    <td>{emp.email}</td>
                    <td>{emp.phone || "-"}</td>

                    {/* Status cell: badge (view) or dropdown (edit) */}
                    <td>
                      {editMode ? (
                        <select
                          value={emp.status || ""}
                          onChange={(e) => updateEmployeeStatus(emp.id, e.target.value)}
                        >
                          <option value="Active">Active</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Terminated">Terminated</option>
                          <option value="New">New</option>
                          <option value="Interviewed">Interviewed</option>
                          <option value="Offered">Offered</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      ) : (
                        renderStatusBadge(emp.status)
                      )}
                    </td>

                    {/* Mail badge */}
                    <td>{renderMailBadge(Boolean(emp.invited))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="dashboard-actions">
          <div>
            <input
              type="text"
              placeholder="CC emails (comma separated)"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              disabled={selected.length === 0}
            />
            <button
              className="dashboard-invite-btn"
              onClick={handleInvite}
              disabled={selected.length === 0}
            >
              Invite Selected
            </button>
          </div>
          <select
            value={bulkAction}
            onChange={(e) => handleBulkAction(e.target.value)}
            disabled={selected.length === 0}
          >
            <option value="" disabled>
              -- Select Action --
            </option>
            <option value="Active">Set Active</option>
            <option value="On Leave">Set On Leave</option>
            <option value="Terminated">Set Terminated</option>
            <option value="New">Set New</option>
            <option value="Interviewed">Set Interviewed</option>
            <option value="Offered">Set Offered</option>
            <option value="Rejected">Set Rejected</option>
          </select>
        </div>

        {/* Messages */}
        {message && <div className="dashboard-message">{message}</div>}

        {/* Invite Summary */}
        {inviteSummary.length > 0 && (
          <div className="dashboard-invite-summary">
            <h4>Invited Employees:</h4>
            <ul>
              {inviteSummary.map((emp, idx) => (
                <li key={idx}>
                  <b>{emp.name || emp.email}</b> ({emp.email}) | Phone: {emp.phone || "-"}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Simple settings modal */}
        {showSettings && (
          <div
            className="settings-modal"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowSettings(false)}
          >
            <div
              style={{ background: "#fff", padding: 16, borderRadius: 8, minWidth: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0 }}>Table Settings</h3>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={compactRows}
                  onChange={(e) => setCompactRows(e.target.checked)}
                />
                Compact rows
              </label>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="action-button" onClick={() => setShowSettings(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HRDashboardLayout>
  );
}

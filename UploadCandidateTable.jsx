import React, { useState, useEffect, useCallback, useRef } from "react";
import './OnboardingTables.css';
import '../../styles/EnhancedTable.css';
import '../../styles/DarkThemeOverrides.css';
import PaginationBar from "../common/PaginationBar";
import "../../styles/Pagination.css";
import EnhancedTable from "./EnhancedTable";
import { getUsers, getProfileStatus, calculateProgressPercentage, getStatusColor } from "../../services/profileService";
import { candidateService } from "../../services/apiService";
import toast from "../../services/toastService";


export default function UploadCandidateTable({
  toolbarSearchQuery,
  headerControlsHidden = false,
  filterTrigger = 0,
  settingsTrigger = 0,
  resetTrigger = 0,
}) {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "uploadedAt", direction: "desc" });
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState("");
  // For now, fetch without pagination: use a large page size and hide controls
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusMap, setStatusMap] = useState({}); // userId → profile status

  const [filters, setFilters] = useState({ emailSent: "" });

  // Format date as: 25 Sept 2025, 09:53 am
  const formatDateTime = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(1, '0');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hh = String(hours).padStart(2, '0');
    return `${day} ${month} ${year}, ${hh}:${minutes} ${ampm}`;
  };

  // -------------------
  // Fetch candidates
  // -------------------
  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
        sortBy: sortConfig.key,
        direction: sortConfig.direction
      };
      // Do not force role/loginRole; rely on backend defaults to avoid over-filtering
      
      if (searchQuery) params.search = searchQuery;
      if (filters.emailSent) {
        if (filters.emailSent === "sent") {
          params.status = "true";
        } else if (filters.emailSent === "not-sent") {
          params.emailSentFilter = "not-sent";
        }
      }

      const data = await candidateService.getCandidates(params);
      const isPaginated = Array.isArray(data?.content);
      const rawList = isPaginated ? (data.content || []) : (Array.isArray(data) ? data : []);

      if (isPaginated) {
        // Trust backend paging and totals; do not filter further to keep counts matching
        const backendTotal = typeof data.totalElements === 'number' ? data.totalElements : rawList.length;
        const backendPages = typeof data.totalPages === 'number' ? data.totalPages : Math.max(1, Math.ceil(backendTotal / pageSize));
        // If current page is out of range after a filter or size change, clamp and refetch
        const validPage = Math.max(0, Math.min(currentPage, backendPages - 1));
        if (validPage !== currentPage) {
          setCurrentPage(validPage);
          setTotalElements(backendTotal);
          setTotalPages(backendPages);
          setIsLoading(false);
          return;
        }
        setCandidates(rawList);
        setTotalElements(backendTotal);
        setTotalPages(backendPages);
      } else {
        // Apply client-side pagination for plain arrays
        // Optional light guard: exclude obvious EMPLOYEE-only records
        const lightlyFiltered = rawList.filter((u) => {
          const role = String(u.role || u.loginRole || u.userType || '').toUpperCase();
          const isEmployee = role === 'EMPLOYEE';
          return !isEmployee;
        });
        const safeList = Array.isArray(lightlyFiltered) ? lightlyFiltered : [];
        const total = safeList.length;
        const pages = Math.max(1, Math.ceil(total / pageSize));
        const start = Math.min(currentPage, pages - 1) * pageSize;
        const pageSlice = safeList.slice(start, start + pageSize);
        setCandidates(pageSlice);
        setTotalElements(total);
        setTotalPages(pages);
      }
      setSelected([]);
      setSelectAll(false);

      // Fetch profile status for visible candidates (current page)
      const visible = isPaginated ? rawList : candidates;
      if (visible.length > 0) {
        const statusPromises = visible.map(candidate =>
          getProfileStatus(candidate.id)
            .then(status => ({ userId: candidate.id, status }))
            .catch(err => ({ userId: candidate.id, status: null }))
        );
        const statusResults = await Promise.all(statusPromises);
        const map = {};
        statusResults.forEach(s => { map[s.userId] = s.status; });
        setStatusMap(map);
      }
    } catch (err) {
      setCandidates([]);
      const errorMessage = err.message.includes("You don't have permission") 
        ? "You don't have permission to view this data."
        : "Error fetching candidates.";
      setMessage(`❌ ${errorMessage}`);
      toast.error(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortConfig, searchQuery, filters]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  // Sync search from sticky toolbar
  useEffect(() => {
    if (typeof toolbarSearchQuery === 'string') {
      setSearchQuery(toolbarSearchQuery);
      setCurrentPage(0);
    }
  }, [toolbarSearchQuery]);


  // -------------------
  // Sorting
  // -------------------
  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="sort-icon"></span>;
    return sortConfig.direction === "asc" ? <span className="sort-icon">▲</span> : <span className="sort-icon">▼</span>;
  };

  // -------------------
  // Selection
  // -------------------
  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    setSelected(checked ? candidates.map(c => c.id) : []);
  };

  const handleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  // -------------------
  // Send Emails
  // -------------------
  const handleSendEmails = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one candidate.");
      return;
    }
    
    const loadingToast = toast.loading("Sending emails...");
    setMessage("⏳ Sending emails...");
    
    try {
      const resp = await candidateService.sendCandidateEmails({ ids: selected });
      if (resp && Array.isArray(resp.updated) && resp.updated.length > 0) {
        const updatedMap = new Map(resp.updated.map(u => [u.id, u]));
        setCandidates(prev => prev.map(c => (
          updatedMap.has(c.id) ? { ...c, ...updatedMap.get(c.id) } : c
        )));
      }

      const updatedCount = Array.isArray(resp?.updated) ? resp.updated.length : 0;
      const failedCount = Array.isArray(resp?.failed) ? resp.failed.length : 0;
      const summary = failedCount > 0
        ? `Sent ${updatedCount}, Failed ${failedCount}`
        : (updatedCount > 0 ? `Successfully sent ${updatedCount} email${updatedCount > 1 ? 's' : ''}!` : 'No emails were sent.');
      setMessage(`✅ ${summary}`);
      toast.success(summary);

      if (failedCount > 0) {
        (resp.failed || []).slice(0, 10).forEach((f) => {
          const id = f?.id || f?.candidateId || f?.userId || 'unknown';
          const reason = f?.error || f?.message || 'Unknown error';
          toast.error(`Failed to send to ID ${id}: ${reason}`);
        });
      }

      toast.remove(loadingToast);
      // Refetch to ensure server state is reflected everywhere
      fetchCandidates();
    } catch (err) {
      if (err?.status === 404) {
        const m = (err?.data && (err.data.message || err.data.error)) || 'Resource not available';
        setMessage(`❌ ${m}`);
        toast.error(m);
        toast.remove(loadingToast);
        return;
      }
      const errorMessage = err.message || "Failed to send emails.";
      setMessage(`❌ ${errorMessage}`);
      toast.error(errorMessage);
      toast.remove(loadingToast);
      console.error(err);
    }
  };

  // -------------------
  // Pagination
  // -------------------
  const handlePageChange = (newPage) => {
    if (newPage < 0 || (totalPages && newPage >= totalPages)) return;
    setCurrentPage(newPage);
  };
  const handlePageSizeChange = (eOrNumber) => {
    const value = typeof eOrNumber === 'number' ? eOrNumber : Number(eOrNumber.target.value);
    setPageSize(value);
    setCurrentPage(0);
  };


  // -------------------
  // Email Badge renderer
  // -------------------
  const renderEmailBadge = (emailSent) => {
    return emailSent ? (
      <span className="badge badge-success">Mail Sent</span>
    ) : (
      <span className="badge badge-danger">Mail Not Sent</span>
    );
  };

  // -------------------
  // Profile Status Badge
  // -------------------
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
          background: 'var(--color-surface-hover)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)'
        }}>
          Loading...
        </span>
      );
    }

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
        background: 'var(--color-surface-hover)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)'
      }}>
        {displayText}
      </span>
    );
  };

  // -------------------
  // Progress Bar
  // -------------------
  const renderProgressBar = (status) => {
    if (!status) return null;
    
    const progressPercent = calculateProgressPercentage(status);
    
    return (
      <div style={{ width: '100%', marginTop: '4px' }}>
        <div style={{
          width: '100%',
          background: 'var(--color-surface-hover)',
          borderRadius: '4px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            background: progressPercent === 100 ? 'var(--color-success, #22c55e)' : 'var(--color-primary)',
            height: '100%',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }}>
          </div>
        </div>
        <small style={{ fontSize: '10px', color: 'var(--color-text-secondary, #94a3b8)' }}>
          {progressPercent}% Complete
        </small>
      </div>
    );
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'email',
      label: 'Email',
      visible: true,
      className: 'uc-col-email truncate',
      render: (value) => value || '-'
    },
    {
      key: 'firstName',
      label: 'First Name',
      visible: true,
      className: 'uc-col-firstName truncate',
      render: (value) => value || '-'
    },
    {
      key: 'lastName',
      label: 'Last Name',
      visible: true,
      className: 'uc-col-lastName truncate',
      render: (value) => value || '-'
    },
    {
      key: 'phoneNumber',
      label: 'Phone Number',
      visible: true,
      className: 'uc-col-phone',
      render: (value) => value || '-'
    },
    {
      key: 'profileStatus',
      label: 'Profile Status',
      visible: true,
      className: 'uc-col-profile',
      render: (value, row) => (
        <div>
          {renderProfileStatusBadge(statusMap[row.id])}
          {renderProgressBar(statusMap[row.id])}
        </div>
      )
    },
    {
      key: 'uploadedAt',
      label: 'Uploaded At',
      visible: true,
      className: 'uc-col-uploaded',
      render: (value, row) => formatDateTime(row?.createdAt || value)
    }
  ];

  // Define table filters
  const tableFilters = {
    profileStatus: {
      label: 'Profile Status',
      options: [
        { label: 'All', value: '' },
        { label: 'Loading', value: 'loading' },
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
      ]
    }
  };

  // Define table actions
  const tableActions = [];

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(0);
  };

  // Handle sort
  const handleSortChange = (key) => {
    handleSort(key);
  };

  // Handle row selection
  const handleRowSelect = (id) => {
    handleSelect(id);
  };

  // Handle select all
  const handleSelectAllRows = () => {
    const event = { target: { checked: !selectAll } };
    handleSelectAll(event);
  };

  return (
    <div className="upload-table-container">
      {/* Candidate table wrapper with explicit ID to force dark overrides */}
      <div id="candidate-table" className="enhanced-table-container">
        {(() => {
          // Apply client-side profile status filtering
          const statusKey = (filters.profileStatus || '').toLowerCase();
          const filtered = candidates.filter((c) => {
            if (!statusKey) return true;
            const s = statusMap[c.id];
            if (!s || !s.onboarding_status) {
              return statusKey === 'loading';
            }
            const norm = String(s.onboarding_status).toUpperCase();
            if (statusKey === 'completed') return norm === 'COMPLETED';
            if (statusKey === 'pending') return norm !== 'COMPLETED';
            return true;
          });
          return (
            <EnhancedTable
              data={filtered}
          columns={tableColumns}
          onSearch={handleSearch}
          onFilter={handleFilterChange}
          onSort={handleSortChange}
          searchPlaceholder="Search by ID, name, email..."
          filters={tableFilters}
          sortConfig={sortConfig}
          loading={isLoading}
          actions={tableActions}
          headerControlsHidden={headerControlsHidden}
          controlledSearchQuery={toolbarSearchQuery}
          triggerOpenFilters={filterTrigger}
          triggerOpenSettings={settingsTrigger}
          triggerReset={resetTrigger}
            />
          );
        })()}
      </div>

      {/* Pagination */}
      <div className="candidate-pagination">
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalElements={totalElements}
          onPageChange={handlePageChange}
          onPageSizeChange={(n) => handlePageSizeChange(n)}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      {message && <div className="dashboard-message">{message}</div>}
    </div>
  );
}

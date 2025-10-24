import React, { useState, useEffect, useRef } from 'react';
import filterIcon from "../../assets/icons/filter.svg";
import settingsIcon from "../../assets/icons/settings.svg";
import { departmentService, employeeService } from '../../services/apiService';
import EnhancedTable from './EnhancedTable';
import { validateForm, commonSchemas } from '../../utils/validation';
import toast from '../../services/toastService';
import api from '../../components/utils/api.jsx';

export default function AddEmployeeForm({ onEmployeeAdded }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [isStaticDepartments, setIsStaticDepartments] = useState(false);
  // Store department selection (id as value, name for display/payload role)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedDepartmentName, setSelectedDepartmentName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filter and settings state
  const [filters, setFilters] = useState({ status: '', role: 'EMPLOYEE' });
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    role: true,
  });

  // Selection state (not used for actions yet but required by EnhancedTable)
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleRowSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllRows = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelected(employees.map(e => e.id));
    } else {
      setSelected([]);
    }
  };

  // EnhancedTable column definitions (5 columns)
  const tableColumns = [
    { key: 'firstName', label: 'First Name', visible: visibleColumns.firstName, className: 'col-firstName truncate' },
    { key: 'lastName', label: 'Last Name', visible: visibleColumns.lastName, className: 'col-lastName truncate' },
    { key: 'email', label: 'Email', visible: visibleColumns.email, className: 'col-email truncate' },
    { key: 'phoneNumber', label: 'Phone Number', visible: visibleColumns.phoneNumber, className: 'col-phone' },
    {
      key: 'role',
      label: 'Role / Department',
      visible: visibleColumns.role,
      className: 'col-role',
      render: (value, row) => {
        const val = row.role || row.departmentName || '-';
        const bg = val === 'HR' ? '#6f42c1' : val === 'EMPLOYEE' ? '#007bff' : val === 'CANDIDATE' ? '#20c997' : val === 'EX_EMPLOYEE' ? '#6c757d' : '#5a6268';
        return (
          <span style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center',
            backgroundColor: bg,
            color: 'white'
          }}>
            {val}
          </span>
        );
      }
    },
  ];

  const filterRef = useRef(null);
  const settingsRef = useRef(null);

  // Fetch employees
  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    setEmployeeError('');
    try {
      const params = {
        page: currentPage,
        size: pageSize,
        sortBy: sortConfig.key,
        direction: sortConfig.direction,
        search: searchQuery
      };
      
      // Apply status filter if set
      if (filters.status) {
        params.status = filters.status === 'active' ? '1' : '0';
      }
      // Apply role filter if set (EMPLOYEE | HR | CANDIDATE | EX_EMPLOYEE)
      if (filters.role) {
        params.role = filters.role;
      }
  
      const data = await employeeService.getCurrentEmployees(params);
      // Support both paginated and plain array responses
      if (Array.isArray(data)) {
        setEmployees(data);
        setTotalElements(data.length);
        setTotalPages(1);
      } else {
        setEmployees(data.content || []);
        setTotalElements(data.totalElements || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch (err) {
      const errorMessage = err.message.includes("You don't have permission") 
        ? "You don't have permission to view this data."
        : `Failed to fetch employees: ${err.message}`;
      setEmployeeError(errorMessage);
      setEmployees([]);
      toast.error(errorMessage);
    } finally {
      setIsLoadingEmployees(false);
    }
  };
  

  // Fetch departments for dropdown
  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      const safeList = Array.isArray(data) ? data : [];
      if (safeList.length > 0) {
        setDepartments(safeList);
        // default select first department id + name
        const firstId = safeList[0]?.departmentId ?? safeList[0]?.id ?? '';
        const firstName = safeList[0]?.departmentName ?? '';
        setSelectedDepartmentId(firstId);
        setSelectedDepartmentName(firstName);
        setIsStaticDepartments(false);
      } else {
        // Fallback default department names when backend returns none
        const DEFAULT_DEPARTMENTS = [
          'Human Resources (HR)',
          'Software Development',
          'Quality Assurance (QA) / Testing',
          'IT Support / Helpdesk',
          'Network & Infrastructure',
          'Cybersecurity / Information Security',
          'Database Administration (DBA)',
          'DevOps / Cloud Operations',
          'Data Analytics / Business Intelligence',
          'Product Management / IT Project Management',
        ];
        const staticList = DEFAULT_DEPARTMENTS.map((name, idx) => ({ id: idx + 1, departmentName: name }));
        setDepartments(staticList);
        setIsStaticDepartments(true);
        setSelectedDepartmentId(staticList[0]?.id || 1);
        setSelectedDepartmentName(staticList[0]?.departmentName || "");
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      // Use fallback options so the dropdown is still usable
      const DEFAULT_DEPARTMENTS = [
        'Human Resources (HR)',
        'Software Development',
        'Quality Assurance (QA) / Testing',
        'IT Support / Helpdesk',
        'Network & Infrastructure',
        'Cybersecurity / Information Security',
        'Database Administration (DBA)',
        'DevOps / Cloud Operations',
        'Data Analytics / Business Intelligence',
        'Product Management / IT Project Management',
      ];
      const staticList = DEFAULT_DEPARTMENTS.map((name, idx) => ({ id: idx + 1, departmentName: name }));
      setDepartments(staticList);
      setIsStaticDepartments(true);
      setSelectedDepartmentId(staticList[0]?.id || 1);
      setSelectedDepartmentName(staticList[0]?.departmentName || "");
      toast.error('Failed to load departments. Using default list.');
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  // Close filter/settings when clicking outside
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validate form data
    const formData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      designation,
      dateOfJoining,
      role,
      departmentId: selectedDepartmentId
    };
    
    const { isValid, errors } = validateForm(formData, commonSchemas.employee);
    
    if (!isValid) {
      const errorMessages = Object.values(errors).join('\n');
      setMessage(`❌ Please fix the following errors:\n${errorMessages}`);
      toast.error('Please fix form validation errors');
      setLoading(false);
      return;
    }
    
    const loadingToast = toast.loading('Adding employee...');
    try {
      // Build payload per requirement
      const payload = {
        firstName,
        lastName,
        email,
        phoneNumber,
        designation,
        department: selectedDepartmentName,
        joiningDate: dateOfJoining || null,
      };
      // username and password are required by backend; using email as username and fixed password per spec
      payload.username = email;
      payload.password = 'test1234';
      // Always include loginRole (camelCase). Normalize EX_EMPLOYEE -> EXEMPLOYEE per accepted codes
      const normalizedRole = (role || 'EMPLOYEE') === 'EX_EMPLOYEE' ? 'EXEMPLOYEE' : (role || 'EMPLOYEE');
      payload.loginRole = normalizedRole;

      // POST to /api/employees/add (baseURL already includes /api)
      const response = await api.post('/employees/add', payload);
      // Success (expect 201)
  if (response && (response.status === 201 || response.status === 200)) {
        // Try to send invitation email to the newly added employee if backend returned an ID
        let emailNote = '';
        try {
          const newId = response?.data?.id || response?.data?.employeeId || response?.data?.userId;
          if (newId) {
            const emailResp = await employeeService.sendEmployeeEmails({ ids: [newId] });
            const sentCount = Array.isArray(emailResp?.updated) ? emailResp.updated.length : 0;
            if (sentCount > 0) {
              emailNote = 'Invitation email sent.';
            } else {
              emailNote = 'Invitation email queued.';
            }
          } else {
            emailNote = 'Invitation email scheduled.';
          }
        } catch (e) {
          emailNote = `Invitation email could not be sent (${e?.message || 'unknown error'}).`;
        }

          try { console.log('AddEmployeeForm - raw response:', response); } catch (e) {}
          const backendMessage = response?.data?.message ?? response?.message ?? response?.data?.data?.message;
          const finalMsg = backendMessage || `✅ Employee added successfully. ${emailNote}`;
          try { console.log('AddEmployeeForm - backendMessage:', backendMessage, 'finalMsg:', finalMsg); } catch (e) {}
          setMessage(finalMsg);
          toast.success(finalMsg);
          try { alert(finalMsg); } catch (e) {}

          if (onEmployeeAdded) {
            try { console.debug('AddEmployeeForm: invoking onEmployeeAdded with', finalMsg); } catch (e) {}
            onEmployeeAdded(finalMsg);
          }

          try { window.dispatchEvent(new CustomEvent('employeeAdded', { detail: { message: finalMsg } })); } catch (e) {}
          try { sessionStorage.setItem('lastEmployeeMessage', finalMsg); } catch (e) {}

          const created = response?.data?.employee || response?.data;
          if (created && created.id) {
            setEmployees(prev => {
              const exists = prev.some(r => String(r.id) === String(created.id));
              if (exists) return prev.map(r => (String(r.id) === String(created.id) ? { ...r, ...created } : r));
              return [created, ...prev];
            });
          }
      } else {
        const fallbackMsg = response?.data?.message || '✅ Employee added (request completed)';
  setMessage(fallbackMsg);
  toast.success(fallbackMsg);
  try { alert(fallbackMsg); } catch (e) {}
        if (onEmployeeAdded) {
          try { console.debug('AddEmployeeForm: invoking onEmployeeAdded with', fallbackMsg); } catch (e) {}
          onEmployeeAdded(fallbackMsg);
        }
      }
      
      toast.remove(loadingToast);

      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setDesignation('');
      setDateOfJoining('');
      setRole('EMPLOYEE');

      fetchEmployees();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (status === 400) {
        const msg = serverMsg || 'Validation failed';
        setMessage(`❌ ${msg}`);
        toast.warning(msg);
      } else if (status === 409) {
        const msg = serverMsg || 'Email already exists';
        setMessage(`❌ ${msg}`);
        toast.error(msg);
      } else {
        const msg = serverMsg || err.message || 'Something went wrong';
        setMessage(`❌ ${msg}`);
        toast.error(msg);
      }
      toast.remove(loadingToast);
    } finally {
      setLoading(false);
    }
  };

  const getProcessedEmployees = () => {
    let filteredEmployees = [...employees];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredEmployees = filteredEmployees.filter(emp =>
        (emp.firstName?.toLowerCase().includes(query)) ||
        (emp.lastName?.toLowerCase().includes(query)) ||
        (emp.email?.toLowerCase().includes(query)) ||
        (emp.designation?.toLowerCase().includes(query)) ||
        (emp.phoneNumber?.includes(query))
      );
    }
    
    // Apply status filter
    if (filters.status) {
      filteredEmployees = filteredEmployees.filter(emp => {
        if (filters.status === 'active') return emp.status === 1;
        if (filters.status === 'inactive') return emp.status === 0;
        return true;
      });
    }
    
    // Apply sorting
    if (sortConfig.key) {
      filteredEmployees.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }
    
    const startIndex = currentPage * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  };

  useEffect(() => {
    let filteredEmployees = [...employees];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.firstName?.toLowerCase().includes(query) ||
        emp.lastName?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.designation?.toLowerCase().includes(query) ||
        emp.phoneNumber?.includes(query)
      );
    }
    
    // Apply status filter
    if (filters.status) {
      filteredEmployees = filteredEmployees.filter(emp => {
        if (filters.status === 'active') return emp.status === 1;
        if (filters.status === 'inactive') return emp.status === 0;
        return true;
      });
    }

    setTotalElements(filteredEmployees.length);
    setTotalPages(Math.ceil(filteredEmployees.length / pageSize));
  }, [employees, searchQuery, pageSize, filters]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="sort-icon"></span>;
    return sortConfig.direction === 'asc' ? <span className="sort-icon">▲</span> : <span className="sort-icon">▼</span>;
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(0);
  };

  // Status badge renderer
  const renderStatusBadge = (status) => {
    if (status === 1) {
      return (
        <span style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600',
          textAlign: 'center',
          backgroundColor: '#28a745',
          color: 'white'
        }}>
          Active
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: '#dc3545',
        color: 'white'
      }}>
        Inactive
      </span>
    );
  };

  return (
    <div className="add-employee-layout">
      {/* Two-column layout: form (left) + simple table (right) */}
      <div
        className="one-column-pane"
        style={{
          display: 'block',
          marginBottom: 16,
        }}
      >
        {/* Full-width themed container */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-elevation)',
          width: '100%',
          margin: 0
        }}>
          <form
            className="dashboard-form manual-add-form"
            onSubmit={handleSubmit}
            style={{
              width: '100%',
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--spacing-md)'
            }}
          >

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 2 }}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e5e7', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 2 }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e5e7', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Employee Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e5e7', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e5e7', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Designation</label>
              <input
                type="text"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e5e7', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Date of Joining</label>
              <input
                type="date"
                value={dateOfJoining}
                onChange={e => setDateOfJoining(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e5e7', borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="role" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Assign Role</label>
              <select id="role" name="loginrole" value={role} onChange={e => setRole(e.target.value)} required style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e5e7', borderRadius: 6 }}>
                <option value="HR">HR</option>
                <option value="CANDIDATE">Candidate</option>
                <option value="ADMIN">Admin</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="EX_EMPLOYEE">Ex-Employee/Alumni</option>
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="department" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 4 }}>Department</label>
              <select
                id="department"
                value={String(selectedDepartmentId)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDepartmentId(val);
                  const found = departments.find(d => String(d?.id ?? d?.departmentId) === String(val));
                  setSelectedDepartmentName(found?.departmentName ?? '');
                }}
                required
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e5e7', borderRadius: 6 }}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => {
                  const keyVal = dept?.id ?? dept?.departmentId;
                  const label = dept?.departmentName ?? '';
                  return (
                    <option key={keyVal} value={String(keyVal)}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: 'var(--spacing-md)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              {loading ? 'Adding...' : 'Add Employee'}
            </button>
            {message && (
              <div data-testid="add-employee-message" className="dashboard-message" style={{ marginTop: 12, padding: 10, background: '#052e16', color: '#d1fae5', borderRadius: 6, fontWeight: 700 }}>
                {message}
              </div>
            )}
            </div>
          </form>
        </div>

        {/* Current Employees table temporarily disabled
        <div className="employee-table-container" style={{ margin: 0, background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #e5e5e7', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Current Employees</h3>
          {employeeError && <div className="dashboard-message" style={{background: '#ffebee', color: '#c62828'}}>{employeeError}</div>}

          <EnhancedTable
            data={getProcessedEmployees()}
            columns={tableColumns}
            onSearch={(val) => setSearchQuery(val)}
            onFilter={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
            onSort={(config) => setSortConfig(config)}
            searchPlaceholder="Search employees..."
            filters={{ status: filters.status, role: filters.role }}
            sortConfig={sortConfig}
            loading={isLoadingEmployees}
            selectedRows={selected}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAllRows}
          />
        </div>
        */}
      </div>
    </div>
  );
}

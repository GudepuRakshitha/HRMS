import React, { useState, useEffect, useCallback } from 'react';
import EnhancedTable from './EnhancedTable';
import EmailComposeModal from './EmailComposeModal';
import { getProfileStatus, calculateProgressPercentage, getStatusColor } from '../../services/profileService';
import { employeeService, candidateService, emailManagementService } from '../../services/apiService';
import toast from '../../services/toastService';


const EmailManagementPanel = () => {
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'hr' | 'alumni' | 'candidates'
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [emailType, setEmailType] = useState('');
  const [dynamicFields, setDynamicFields] = useState({});
  const [emailBody, setEmailBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [sortField, setSortField] = useState('uploadedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterText, setFilterText] = useState('');
  const [visibleColumns, setVisibleColumns] = useState({
    select: true,
    name: true,
    email: true,
    designation: true,
    status: true,
    emailStatus: true,
    profileStatus: true,
    lastEmailDate: true
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState(null);
  
  // Real data state
  const [employees, setEmployees] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [hrGroup, setHrGroup] = useState([]);
  const [alumniGroup, setAlumniGroup] = useState([]);
  const [fetchError, setFetchError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState({ status: '', emailSent: '' });
  const [statusMap, setStatusMap] = useState({}); // userId → profile status
  const [failedSendDetails, setFailedSendDetails] = useState([]); // [{id, error}]

  // Helper: whether current tab is any employee-type tab
  const isEmployeeTab = activeTab !== 'candidates';

  // Fetch employees from API (legacy path)
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
        sortBy: sortField,
        direction: sortDirection
      };
      
      if (filterText) params.search = filterText;
      if (filters.emailSent && filters.emailSent !== '') params.emailSent = filters.emailSent;
      // Role filter by active tab: Employees, HR, Alumni
      if (activeTab === 'employees') params.role = 'EMPLOYEE';
      if (activeTab === 'hr') params.role = 'HR';
      if (activeTab === 'alumni') params.role = 'EX_EMPLOYEE';

      const data = await employeeService.getEmployees(params);
      
      // Transform data to match expected format
      const transformedEmployees = (data.content || []).map(emp => ({
        id: emp.id,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
        email: emp.email,
        designation: emp.designation || 'N/A',
        status: emp.status || 'Active',
        emailStatus: emp.emailSent ? 'Sent' : 'Not Sent',
        // Prefer precise timestamp from backend if available
        lastEmailDate: emp.emailSentAt || emp.lastEmailDate || (emp.emailSent ? emp.uploadedAt : null),
        role: emp.role || emp.loginRole || (activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'hr' ? 'HR' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : ''),
        firstName: emp.firstName,
        lastName: emp.lastName,
        phoneNumber: emp.phoneNumber,
        uploadedAt: emp.uploadedAt,
        emailSent: emp.emailSent
      }));
      
      setEmployees(transformedEmployees);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);

      // Fetch profile status for all employees
      if (transformedEmployees.length > 0) {
        const statusPromises = transformedEmployees.map(employee =>
          getProfileStatus(employee.id)
            .then(status => ({ userId: employee.id, status }))
            .catch(err => ({ userId: employee.id, status: null }))
        );
        const statusResults = await Promise.all(statusPromises);
        const map = {};
        statusResults.forEach(s => { map[s.userId] = s.status; });
        setStatusMap(prevMap => ({ ...prevMap, ...map }));
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      const errorMessage = err.message.includes("You don't have permission") 
        ? "You don't have permission to view this data."
        : 'Failed to fetch employees';
      toast.error(errorMessage);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortField, sortDirection, filterText, filters, activeTab]);

  // Fetch candidates from API (legacy path)
  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
        sortBy: sortField,
        direction: sortDirection
      };
      
      if (filterText) params.search = filterText;
      if (filters.emailSent && filters.emailSent !== '') {
        if (filters.emailSent === 'sent') {
          params.status = 'true';
        } else if (filters.emailSent === 'not-sent') {
          params.emailSentFilter = 'not-sent';
        }
      }

      const data = await candidateService.getCandidates(params);
      
      // Transform data to match expected format
      const transformedCandidates = (data.content || []).map(candidate => ({
        id: candidate.id,
        name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email,
        email: candidate.email,
        jobTitle: candidate.jobTitle || 'N/A',
        designation: candidate.jobTitle || 'N/A',
        status: candidate.status || 'Applied',
        emailStatus: candidate.emailSent ? 'Sent' : 'Not Sent',
        lastEmailDate: candidate.emailSentAt || candidate.lastEmailDate || (candidate.emailSent ? candidate.uploadedAt : null),
        role: candidate.role || 'CANDIDATE',
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phoneNumber: candidate.phoneNumber,
        uploadedAt: candidate.uploadedAt,
        emailSent: candidate.emailSent
      }));
      
      setCandidates(transformedCandidates);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);

      // Fetch profile status for all candidates
      if (transformedCandidates.length > 0) {
        const statusPromises = transformedCandidates.map(candidate =>
          getProfileStatus(candidate.id)
            .then(status => ({ userId: candidate.id, status }))
            .catch(err => ({ userId: candidate.id, status: null }))
        );
        const statusResults = await Promise.all(statusPromises);
        const map = {};
        statusResults.forEach(s => { map[s.userId] = s.status; });
        setStatusMap(prevMap => ({ ...prevMap, ...map }));
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      toast.error('Failed to fetch candidates');
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortField, sortDirection, filterText, filters]);

  // New: Fetch only the active group's recipients via backend per-group endpoint
  const fetchRecipientGroups = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const list = await emailManagementService.getGroupFromBackend(activeTab);
      const roleLabel = activeTab === 'hr' ? 'HR' : activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : 'CANDIDATE';
      const mapToRow = (u) => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        role: roleLabel,
        // Prefer backend-provided flags if available
        emailStatus: u.emailSent ? 'Sent' : 'Not Sent',
        lastEmailDate: u.emailSentAt || u.lastEmailDate || (u.emailSent ? u.uploadedAt : null),
        emailSent: !!u.emailSent,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
      });

      const rows = (list || []).map(mapToRow);

      if (activeTab === 'hr') setHrGroup(rows);
      if (activeTab === 'employees') setEmployees(rows);
      if (activeTab === 'candidates') setCandidates(rows);
      if (activeTab === 'alumni') setAlumniGroup(rows);

      setTotalPages(1);
      setTotalElements(rows.length);
    } catch (err) {
      console.error('Error fetching recipient groups:', err);
      setFetchError(err.message || 'Failed to fetch recipient groups');
      toast.error(err.message || 'Failed to fetch recipient groups');
      if (activeTab === 'hr') setHrGroup([]);
      if (activeTab === 'employees') setEmployees([]);
      if (activeTab === 'candidates') setCandidates([]);
      if (activeTab === 'alumni') setAlumniGroup([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Fetch data when tab changes - use new grouped fetch
  useEffect(() => {
    fetchRecipientGroups();
  }, [activeTab, fetchRecipientGroups]);

  // Email templates
  const emailTemplates = {
    employee: {
      onboarding: {
        subject: 'Welcome to AEPL - Onboarding Instructions',
        body: `Dear {{name}},

Welcome to AEPL! We're excited to have you join our team.

Please access your onboarding portal using the link below:
Portal Link: {{portalLink}}

If you have any questions, please don't hesitate to reach out.

Best regards,
HR Team
AEPL`
      },
      meeting: {
        subject: 'Meeting Invitation - {{meetingTitle}}',
        body: `Dear {{name}},

You are invited to attend the following meeting:

Date: {{date}}
Time: {{time}}
Venue/Platform: {{venue}}

Please confirm your attendance.

Best regards,
HR Team
AEPL`
      },
      document: {
        subject: 'Document Submission Reminder',
        body: `Dear {{name}},

This is a reminder to submit the required document:

Document: {{documentName}}
Submission Deadline: {{submissionDate}}
Document Link: {{documentLink}}

Please ensure timely submission.

Best regards,
HR Team
AEPL`
      },
      announcement: {
        subject: 'Company Announcement',
        body: `Dear {{name}},

We have an important company update to share:

{{announcementContent}}

Link: {{link}}

Thank you for your attention.

Best regards,
Management Team
AEPL`
      }
    },
    candidate: {
      invitation: {
        subject: 'Welcome to AEPL - Your Account Details',
        body: `Dear {{name}},

Welcome to AEPL! We're excited to have you join our recruitment process.

Your login credentials for the HRMS portal are:
Email: {{email}}
Password: test1234

Please login to complete your profile and application process:
Login Link: http://localhost:5173/login

For security reasons, please change your password after your first login.

If you have any questions, please don't hesitate to contact us.

Best regards,
HR Team
AEPL`
      },
      confirmation: {
        subject: 'Application Confirmation - {{jobTitle}}',
        body: `Dear {{name}},

Thank you for your application for the position of {{jobTitle}}.

Your application reference number is: {{reference}}

We will review your application and contact you soon.

Best regards,
Recruitment Team
AEPL`
      },
      interview: {
        subject: 'Interview Invitation - {{jobTitle}}',
        body: `Dear {{name}},

Congratulations! You have been shortlisted for the position of {{jobTitle}}.

Interview Details:
Date: {{date}}
Time: {{time}}
Venue/Platform: {{venue}}

Please confirm your availability.

Best regards,
Recruitment Team
AEPL`
      },
      assessment: {
        subject: 'Assessment Invitation - {{jobTitle}}',
        body: `Dear {{name}},

You are invited to complete an assessment for the position of {{jobTitle}}.

Assessment Link: {{assessmentLink}}
Deadline: {{deadline}}

Please complete the assessment before the deadline.

Best regards,
Recruitment Team
AEPL`
      },
      shortlist: {
        subject: 'Application Status Update - {{jobTitle}}',
        body: `Dear {{name}},

Thank you for your interest in the position of {{jobTitle}}.

{{statusMessage}}

{{feedback}}

Best regards,
Recruitment Team
AEPL`
      },
      offer: {
        subject: 'Job Offer - {{jobTitle}}',
        body: `Dear {{name}},

Congratulations! We are pleased to offer you the position of {{jobTitle}}.

Joining Details:
Date: {{joiningDate}}
Venue: {{venue}}
Required Documents: {{documents}}

Please confirm your acceptance.

Best regards,
HR Team
AEPL`
      }
    }
  };

  // Dynamic field configurations
  const fieldConfigurations = {
    employee: {
      onboarding: [
        { name: 'portalLink', label: 'Portal Link', type: 'url', required: true }
      ],
      meeting: [
        { name: 'meetingTitle', label: 'Meeting Title', type: 'text', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'time', label: 'Time', type: 'time', required: true },
        { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
      ],
      document: [
        { name: 'documentName', label: 'Document Name', type: 'text', required: true },
        { name: 'documentLink', label: 'Document Link', type: 'url', required: false },
        { name: 'submissionDate', label: 'Submission Date', type: 'date', required: true }
      ],
      announcement: [
        { name: 'announcementContent', label: 'Announcement Content', type: 'textarea', required: true },
        { name: 'link', label: 'Link', type: 'url', required: false }
      ]
    },
    candidate: {
      invitation: [
        // No additional fields needed - email and name are automatically included
      ],
      confirmation: [
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
        { name: 'reference', label: 'Reference Number', type: 'text', required: true }
      ],
      interview: [
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'time', label: 'Time', type: 'time', required: true },
        { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
      ],
      assessment: [
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
        { name: 'assessmentLink', label: 'Assessment Link', type: 'url', required: true },
        { name: 'deadline', label: 'Deadline', type: 'datetime-local', required: true }
      ],
      shortlist: [
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
        { name: 'statusMessage', label: 'Status Message', type: 'textarea', required: true },
        { name: 'feedback', label: 'Feedback (Optional)', type: 'textarea', required: false }
      ],
      offer: [
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
        { name: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
        { name: 'venue', label: 'Venue', type: 'text', required: true },
        { name: 'documents', label: 'Required Documents', type: 'textarea', required: true }
      ]
    }
  };

  const getCurrentData = () => {
    if (activeTab === 'hr') return hrGroup;
    if (activeTab === 'employees') return employees;
    if (activeTab === 'candidates') return candidates;
    if (activeTab === 'alumni') return alumniGroup;
    return [];
  };

  // Return the template object for current tab/type, or null
  const getCurrentTemplate = () => {
    const groupKey = isEmployeeTab ? 'employee' : 'candidate';
    const t = emailTemplates?.[groupKey]?.[emailType];
    return t || null;
  };

  // Patch rows helper using backend response.updated
  const patchRowsWithUpdated = (updated = []) => {
    if (!Array.isArray(updated) || updated.length === 0) return;
    const uMap = new Map(updated.map(u => [u.id, u]));
    const patch = (row) => {
      if (!uMap.has(row.id)) return row;
      const u = uMap.get(row.id) || {};
      const emailSent = u.emailSent === true ? true : (row.emailSent === true);
      return {
        ...row,
        ...u,
        emailSent,
        emailStatus: emailSent ? 'Sent' : (row.emailStatus || 'Not Sent'),
        lastEmailDate: emailSent ? (u.lastEmailDate || new Date().toISOString()) : (row.lastEmailDate || null)
      };
    };
    if (activeTab === 'hr') setHrGroup(prev => prev.map(patch));
    if (activeTab === 'employees') setEmployees(prev => prev.map(patch));
    if (activeTab === 'candidates') setCandidates(prev => prev.map(patch));
    if (activeTab === 'alumni') setAlumniGroup(prev => prev.map(patch));
  };

  const handleRecipientToggle = (person) => {
    setSelectedRecipients(prev => {
      const isSelected = prev.some(r => r.id === person.id);
      if (isSelected) {
        return prev.filter(r => r.id !== person.id);
      } else {
        return [...prev, person];
      }
    });
  };

  const handleSelectAll = () => {
    const currentData = getCurrentData();
    if (selectedRecipients.length === currentData.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients([...currentData]);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleColumnVisibility = (column) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getEmailStatusBadge = (status) => {
    const statusClasses = {
      'Sent': 'email-sent',
      'Delivered': 'email-delivered', 
      'Opened': 'email-opened',
      'Not Sent': 'email-not-sent',
      'Failed': 'email-failed',
      'Bounced': 'email-bounced'
    };
    
    return (
      <span className={`email-status-badge ${statusClasses[status] || 'email-default'}`} style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
        background: status === 'Sent' ? '#e3f2fd' : '#f5f5f5',
        color: status === 'Sent' ? '#1976d2' : '#757575',
        border: '1px solid transparent'
      }}>
        {status}
      </span>
    );
  };

  // Profile Status Badge
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

  // Progress Bar
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

  const handleDynamicFieldChange = (fieldName, value) => {
    setDynamicFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const replacePlaceholders = (text, fields, recipient) => {
    let result = text;
    Object.entries(fields).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
    });
    
    // Replace name placeholder with recipient name
    result = result.replace(/{{name}}/g, recipient?.name || '[name]');
    // Replace email placeholder with recipient email
    result = result.replace(/{{email}}/g, recipient?.email || '[email]');
    
    return result;
  };

  const getEmailTypeOptions = () => {
    if (isEmployeeTab) {
      return [
        { value: 'onboarding', label: 'Onboarding / Welcome' },
        { value: 'meeting', label: 'Meeting / Training / 1:1' },
        { value: 'document', label: 'Document / Policy Reminder' },
        { value: 'announcement', label: 'Company Announcements / Survey' }
      ];
    } else {
      return [
        { value: 'invitation', label: 'Candidate Invitation / Welcome' },
        { value: 'confirmation', label: 'Application Confirmation' },
        { value: 'interview', label: 'Interview Invitation / Reminder' },
        { value: 'assessment', label: 'Assessment / Test Invitation' },
        { value: 'shortlist', label: 'Shortlist / Rejection' },
        { value: 'offer', label: 'Offer / Joining Instructions' }
      ];
    }
  };

  const getCurrentFields = () => {
    return fieldConfigurations[isEmployeeTab ? 'employee' : 'candidate']?.[emailType] || [];
  };

  const handleSendEmail = async () => {
    if (selectedRecipients.length === 0 || !emailType) {
      toast.error('Please select recipients and email type');
      return;
    }

    const fields = getCurrentFields();
    const requiredFields = fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !dynamicFields[field.name]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsLoading(true);
    toast.loading('Sending emails...', { id: 'sending' });
    
    try {
      const selectedIds = selectedRecipients.map(recipient => recipient.id);
      const emailData = {
        ids: selectedIds,
        emailType: emailType,
        dynamicFields: dynamicFields,
        customBody: emailBody !== emailTemplates[activeTab === 'employees' ? 'employee' : 'candidate'][emailType]?.body ? emailBody : null
      };
      
      // Send email using the appropriate service
      let resp;
      if (isEmployeeTab) {
        resp = await employeeService.sendEmployeeEmails(emailData);
      } else {
        resp = await candidateService.sendCandidateEmails(emailData);
      }

      // Backend might return explicit failure shape
      if (resp && resp.status === 'failed') {
        const msg = resp.message || 'Failed to send email for some recipients.';
        setFailedSendDetails(Array.isArray(resp.failed) ? resp.failed : []);
        toast.error(msg, { id: 'sending' });
        return;
      }

      // Apply updates only from backend `updated` array
      if (resp && Array.isArray(resp.updated) && resp.updated.length > 0) {
        patchRowsWithUpdated(resp.updated);
      }

      // Summary toast including partial failures if provided
      const updatedCount = Array.isArray(resp?.updated) ? resp.updated.length : 0;
      const failedCount = Array.isArray(resp?.failed) ? resp.failed.length : 0;
      const summary = failedCount > 0
        ? `Sent ${updatedCount}, Failed ${failedCount}`
        : (updatedCount > 0 ? `Successfully sent ${updatedCount} email${updatedCount > 1 ? 's' : ''}!` : 'No emails were sent.');

      toast.success(summary, { 
        id: 'sending',
        duration: 4000 
      });

      // If there are failures, show separate error toast and store details
      if (failedCount > 0) {
        const failedList = Array.isArray(resp.failed) ? resp.failed : [];
        toast.error('❌ Failed to send email for some recipients. See details below.');
        // Per-entry toast (limited to 10 to avoid spam)
        failedList.slice(0, 10).forEach((f) => {
          const id = f?.id || f?.userId || f?.employeeId || f?.candidateId || 'unknown';
          const reason = f?.error || f?.message || 'Unknown error';
          toast.error(`Failed to send to ID ${id}: ${reason}`);
        });
        setFailedSendDetails(failedList);
      } else {
        setFailedSendDetails([]);
      }
      
      // Reset form and refresh data
      setSelectedRecipients([]);
      setEmailType('');
      setDynamicFields({});
      setEmailBody('');
      setShowEmailComposer(false);
      
      // Refresh the data to update email status
      if (activeTab === 'employees') {
        fetchEmployees();
      } else {
        fetchCandidates();
      }
      
    } catch (error) {
      if (error?.status === 404) {
        const m = (error?.data && (error.data.message || error.data.error)) || 'Meeting not available';
        toast.error(m, { id: 'sending' });
      } else {
        const m = error?.message || 'Failed to send emails. Please try again.';
        toast.error(m, { id: 'sending' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewEmail = (recipient) => {
    if (!emailType) {
      toast.error('Please select an email type first');
      return;
    }
    setPreviewRecipient(recipient);
    setShowPreview(true);
  };

  // Enhanced table helper functions
  const getTableColumns = () => {
    // Always show a simple, professional 5-column set
    return [
      { key: 'name', label: 'Name', visible: true, className: 'em-col-name truncate', render: (v) => v || '-' },
      { key: 'email', label: 'Email', visible: true, className: 'em-col-email truncate', render: (v) => v || '-' },
      { key: 'role', label: 'Role', visible: true, className: 'em-col-role', render: (v) => v || '-' },
      { key: 'emailStatus', label: 'Email Status', visible: true, className: 'em-col-status', render: (v) => getEmailStatusBadge(v) },
      { key: 'lastEmailDate', label: 'Last Email', visible: false, className: 'em-col-last', render: (v) => formatDate(v) },
    ];
  };

  const getTableFilters = () => {
    // Only return email status filter for all tabs
    return {
      emailSent: {
        label: 'Email Status',
        options: [
          { label: 'All', value: '' },
          { label: 'Sent', value: activeTab === 'employees' ? 'true' : 'sent' },
          { label: 'Not Sent', value: activeTab === 'employees' ? 'false' : 'not-sent' }
        ]
      }
    };
  };

  const getTableActions = () => {
    const actions = [];
    
    if (selectedRecipients.length > 0) {
      actions.push({
        label: `Compose Email (${selectedRecipients.length})`,
        icon: '📧',
        onClick: () => setShowEmailComposer(true),
        variant: 'primary',
        size: 'sm'
      });
      
      if (emailType) {
        actions.push({
          label: 'Preview',
          icon: '👁️',
          onClick: () => setShowPreview(true),
          variant: 'secondary',
          size: 'sm'
        });
      }

      if (activeTab === 'candidates') {
        actions.push({
          label: 'Resend Invitation',
          icon: '🔁',
          onClick: async () => {
            setIsLoading(true);
            try {
              // Send one-by-one to ensure names are included per candidate
              for (const rec of selectedRecipients) {
                await candidateService.resendInvitation({
                  emails: [rec.email],
                  firstName: rec.firstName || (rec.name?.split(' ')[0] || ''),
                  lastName: rec.lastName || (rec.name?.split(' ').slice(1).join(' ') || ''),
                  password: 'test1234',
                  loginLink: 'http://localhost:5173/login',
                  description: 'Welcome to AEPL',
                });
              }
              toast.success(`Resent invitation to ${selectedRecipients.length} candidate${selectedRecipients.length > 1 ? 's' : ''}`);
            } catch (err) {
              console.error('Failed to resend invitations:', err);
              toast.error(err.message || 'Failed to resend invitations');
            } finally {
              setIsLoading(false);
            }
          },
          variant: 'primary',
          size: 'sm'
        });
      }
    }
    
    return actions;
  };

  const handleSearch = (query) => {
    setFilterText(query);
    setCurrentPage(0); // Reset to first page when search changes
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(0); // Reset to first page when filters change
  };

  const handleSortChange = (key) => {
    const direction = sortField === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(key);
    setSortDirection(direction);
    setCurrentPage(0); // Reset to first page when sorting changes
  };

  const handleRowSelect = (id) => {
    const person = getCurrentData().find(p => p.id === id);
    if (person) {
      handleRecipientToggle(person);
    }
  };

  const handleSelectAllRows = () => {
    handleSelectAll();
  };

  // Update email template when email type changes
  useEffect(() => {
    if (emailType) {
      const template = getCurrentTemplate();
      if (!template) {
        toast.error('Template not available for this selection');
      } else {
        // Pre-fill body using the first selected recipient if present
        const recipient = selectedRecipients[0] || null;
        const filled = replacePlaceholders(template.body || '', dynamicFields, recipient);
        setEmailBody(filled);
      }

      // Reset dynamic fields for the selected template
      const fields = getCurrentFields();
      const initialFields = {};
      fields.forEach(field => {
        initialFields[field.name] = '';
      });
      setDynamicFields(initialFields);
    }
  }, [emailType, activeTab]);

  return (
    <div className="email-management-panel">


      {Array.isArray(failedSendDetails) && failedSendDetails.length > 0 && (
        <div style={{ background: '#fff3f3', border: '1px solid #f5c2c7', color: '#842029', padding: 10, borderRadius: 6, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Failed to send email for {failedSendDetails.length} recipient(s)</strong>
            <button onClick={() => setFailedSendDetails([])} style={{ background: 'transparent', border: 'none', color: '#842029', cursor: 'pointer' }}>Dismiss</button>
          </div>
          <ul style={{ margin: '8px 0 0 18px' }}>
            {failedSendDetails.slice(0, 20).map((f, idx) => (
              <li key={idx}>
                ID: {String(f.id || f.userId || f.employeeId || f.candidateId || 'unknown')} — {String(f.error || f.message || 'Unknown error')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation - Boxed like Employee Management */}
      <div
        className="tab-navigation"
        style={{
          background: 'white',
          border: '1px solid #e5e5e7',
          borderRadius: 8,
          padding: 10,
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}
      >
        <button
          className={`tab-button ${activeTab === 'hr' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('hr');
            setSelectedRecipients([]);
            setEmailType('');
            setShowEmailComposer(false);
            setCurrentPage(0);
          }}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            borderRadius: 6,
            background: activeTab === 'hr' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : 'var(--color-surface)',
            color: activeTab === 'hr' ? 'var(--color-primary)' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderLeft: activeTab === 'hr' ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
            fontWeight: activeTab === 'hr' ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          HR
        </button>
        <button
          className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('employees');
            setSelectedRecipients([]);
            setEmailType('');
            setShowEmailComposer(false);
            setCurrentPage(0);
          }}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            borderRadius: 6,
            background: activeTab === 'employees' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : 'var(--color-surface)',
            color: activeTab === 'employees' ? 'var(--color-primary)' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderLeft: activeTab === 'employees' ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
            fontWeight: activeTab === 'employees' ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          Employees
        </button>
        <button
          className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('candidates');
            setSelectedRecipients([]);
            setEmailType('');
            setShowEmailComposer(false);
            setCurrentPage(0);
          }}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            borderRadius: 6,
            background: activeTab === 'candidates' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : 'var(--color-surface)',
            color: activeTab === 'candidates' ? 'var(--color-primary)' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderLeft: activeTab === 'candidates' ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
            fontWeight: activeTab === 'candidates' ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          Candidates
        </button>
        <button
          className={`tab-button ${activeTab === 'alumni' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('alumni');
            setSelectedRecipients([]);
            setEmailType('');
            setShowEmailComposer(false);
            setCurrentPage(0);
          }}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            borderRadius: 6,
            background: activeTab === 'alumni' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : 'var(--color-surface)',
            color: activeTab === 'alumni' ? 'var(--color-primary)' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderLeft: activeTab === 'alumni' ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
            fontWeight: activeTab === 'alumni' ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          Alumni
        </button>
      </div>

      {/* Enhanced Recipients Table */}
      {fetchError && (
        <div className="dashboard-message" style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', marginBottom: 10, padding: 10, borderRadius: 6 }}>
          {fetchError}
        </div>
      )}
      <EnhancedTable
        data={getCurrentData()}
        columns={getTableColumns()}
        onSearch={handleSearch}
        onFilter={handleFilterChange}
        onSort={handleSortChange}
        searchPlaceholder="Search by ID, name, email..."
        filters={getTableFilters()}
        sortConfig={{ key: sortField, direction: sortDirection }}
        loading={isLoading}
        selectedRows={selectedRecipients.map(r => r.id)}
        onRowSelect={handleRowSelect}
        onSelectAll={handleSelectAllRows}
        actions={getTableActions()}
      />

      {/* Pagination */}
      <div className="pagination-controls" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <select 
          className="page-size-select" 
          value={pageSize} 
          onChange={(e) => {
            setPageSize(parseInt(e.target.value));
            setCurrentPage(0);
          }}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setCurrentPage(currentPage - 1)} 
            disabled={currentPage === 0}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: currentPage === 0 ? '#f5f5f5' : 'white', cursor: currentPage === 0 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span>Page {currentPage + 1} of {totalPages} ({totalElements} total)</span>
          <button 
            onClick={() => setCurrentPage(currentPage + 1)} 
            disabled={currentPage >= totalPages - 1}
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd', background: currentPage >= totalPages - 1 ? '#f5f5f5' : 'white', cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Compose Email Modal */}
      <EmailComposeModal
        open={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        to={selectedRecipients.map(r => r.email).filter(Boolean).join(', ')}
        subject={(() => {
          const t = getCurrentTemplate();
          const recip = selectedRecipients[0] || previewRecipient;
          return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
        })()}
        message={emailBody}
        typeOptions={getEmailTypeOptions()}
        emailType={emailType}
        onChangeEmailType={(val) => setEmailType(val)}
        fields={getCurrentFields()}
        dynamicFields={dynamicFields}
        onChangeField={handleDynamicFieldChange}
        onSend={({ to, subject, message }) => {
          setEmailBody(message || '');
          if (!emailType) { toast.error('Please select an email type'); return; }
          if (selectedRecipients.length === 0) { toast.error('Please select at least one recipient'); return; }
          handleSendEmail();
          setShowEmailComposer(false);
        }}
      />

      {/* Email Preview Modal */}
      {showPreview && (
        <div className="email-composer-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Email Preview</h3>
              <button
                className="close-btn"
                onClick={() => setShowPreview(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {emailType && selectedRecipients.length > 0 ? (
                <div className="preview-container">
                  <div className="preview-recipient-selector">
                    <label>Preview for:</label>
                    <select
                      value={previewRecipient?.id || selectedRecipients[0]?.id}
                      onChange={(e) => {
                        const recipient = selectedRecipients.find(r => r.id === parseInt(e.target.value));
                        setPreviewRecipient(recipient);
                      }}
                      className="form-select"
                    >
                      {selectedRecipients.map(recipient => (
                        <option key={recipient.id} value={recipient.id}>
                          {recipient.name} ({recipient.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="email-preview-content">
                    <div className="preview-field">
                      <strong>To:</strong> {(previewRecipient || selectedRecipients[0])?.email}
                    </div>
                    <div className="preview-field">
                      <strong>Subject:</strong> {(() => {
                        const t = getCurrentTemplate();
                        const recip = previewRecipient || selectedRecipients[0] || null;
                        return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
                      })()}
                    </div>
                    <div className="preview-field">
                      <strong>Body:</strong>
                      <div className="preview-body-content">
                        {replacePlaceholders(emailBody, dynamicFields, previewRecipient || selectedRecipients[0])}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="preview-empty">
                  <p>Please select recipients and email type to preview</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowPreview(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Composer Modal */}
      {showEmailComposer && (
        <div className="email-composer-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Compose Email to {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? 's' : ''}</h3>
              <button
                className="close-btn"
                onClick={() => setShowEmailComposer(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Email Type Selection */}
              <div className="form-group">
                <label>Email Type *</label>
                <select
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value)}
                  className="form-select"
                >
                  <option value="">Choose email type...</option>
                  {getEmailTypeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Fields */}
              {emailType && (
                <div className="dynamic-fields">
                  <h4>Email Details</h4>
                  {getCurrentFields().map(field => (
                    <div key={field.name} className="form-group">
                      <label>
                        {field.label} {field.required && <span className="required">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={dynamicFields[field.name] || ''}
                          onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          rows={3}
                          className="form-textarea"
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={dynamicFields[field.name] || ''}
                          onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="form-input"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Email Preview */}
              {emailType && (
                <div className="email-preview">
                  <h4>Email Preview</h4>
                  <div className="preview-subject">
                    <strong>Subject:</strong> {(() => {
                      const t = getCurrentTemplate();
                      const recip = selectedRecipients[0] || null;
                      return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
                    })()}
                  </div>
                  <div className="preview-body">
                    <label>Email Body:</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={10}
                      className="email-body-textarea"
                    />
                  </div>
                  <div className="preview-note">
                    <small>
                      📝 Placeholders like {`{{name}}`} will be replaced with actual values for each recipient.
                    </small>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowEmailComposer(false)}
              >
                Cancel
              </button>
              <button
                className={`send-btn ${isLoading ? 'loading' : ''}`}
                onClick={handleSendEmail}
                disabled={isLoading || !emailType}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending...
                  </>
                ) : (
                  `📤 Send to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailManagementPanel;



// // import React, { useState, useEffect, useCallback } from 'react';
// // import EnhancedTable from './EnhancedTable';
// // import EmailComposeModal from './EmailComposeModal';
// // import { getProfileStatus, calculateProgressPercentage, getStatusColor } from '../../services/profileService';
// import PaginationBar from '../common/PaginationBar';
// import '../../styles/Pagination.css';
// // import { employeeService, candidateService, emailManagementService } from '../../services/apiService';
// // import toast from '../../services/toastService';


// // const EmailManagementPanel = () => {
// //   const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'hr' | 'alumni' | 'candidates'
// //   const [selectedRecipients, setSelectedRecipients] = useState([]);
// //   const [emailType, setEmailType] = useState('');
// //   const [dynamicFields, setDynamicFields] = useState({});
// //   const [emailBody, setEmailBody] = useState('');
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [showEmailComposer, setShowEmailComposer] = useState(false);
// //   const [sortField, setSortField] = useState('uploadedAt');
// //   const [sortDirection, setSortDirection] = useState('desc');
// //   const [filterText, setFilterText] = useState('');
// //   const [visibleColumns, setVisibleColumns] = useState({
// //     select: true,
// //     name: true,
// //     email: true,
// //     designation: true,
// //     status: true,
// //     emailStatus: true,
// //     profileStatus: true,
// //     lastEmailDate: true
// //   });
// //   const [showPreview, setShowPreview] = useState(false);
// //   const [previewRecipient, setPreviewRecipient] = useState(null);
  
// //   // Real data state
// //   const [employees, setEmployees] = useState([]);
// //   const [candidates, setCandidates] = useState([]);
// //   const [hrGroup, setHrGroup] = useState([]);
// //   const [alumniGroup, setAlumniGroup] = useState([]);
// //   const [fetchError, setFetchError] = useState('');
// //   const [currentPage, setCurrentPage] = useState(0);
// //   const [pageSize, setPageSize] = useState(10);
// //   const [totalPages, setTotalPages] = useState(0);
// //   const [totalElements, setTotalElements] = useState(0);
// //   const [filters, setFilters] = useState({ status: '', emailSent: '' });
// //   const [statusMap, setStatusMap] = useState({}); // userId → profile status
// //   const [failedSendDetails, setFailedSendDetails] = useState([]); // [{id, error}]

// //   // Helper: whether current tab is any employee-type tab
// //   const isEmployeeTab = activeTab !== 'candidates';

// //   // Fetch employees from API (legacy path)
// //   const fetchEmployees = useCallback(async () => {
// //     setIsLoading(true);
// //     try {
// //       const params = {
// //         page: currentPage,
// //         size: pageSize,
// //         sortBy: sortField,
// //         direction: sortDirection
// //       };
      
// //       if (filterText) params.search = filterText;
// //       if (filters.status) params.status = filters.status;
// //       if (filters.emailSent) params.emailSent = filters.emailSent;
// //       // Role filter by active tab: Employees, HR, Alumni
// //       if (activeTab === 'employees') params.role = 'EMPLOYEE';
// //       if (activeTab === 'hr') params.role = 'HR';
// //       if (activeTab === 'alumni') params.role = 'EX_EMPLOYEE';

// //       const data = await employeeService.getEmployees(params);
      
// //       // Transform data to match expected format
// //       const transformedEmployees = (data.content || []).map(emp => ({
// //         id: emp.id,
// //         name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
// //         email: emp.email,
// //         designation: emp.designation || 'N/A',
// //         status: emp.status || 'Active',
// //         emailStatus: emp.emailSent ? 'Sent' : 'Not Sent',
// //         // Prefer precise timestamp from backend if available
// //         lastEmailDate: emp.emailSentAt || emp.lastEmailDate || (emp.emailSent ? emp.uploadedAt : null),
// //         role: emp.role || emp.loginRole || (activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'hr' ? 'HR' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : ''),
// //         firstName: emp.firstName,
// //         lastName: emp.lastName,
// //         phoneNumber: emp.phoneNumber,
// //         uploadedAt: emp.uploadedAt,
// //         emailSent: emp.emailSent
// //       }));
      
// //       setEmployees(transformedEmployees);
// //       setTotalPages(data.totalPages || 0);
// //       setTotalElements(data.totalElements || 0);

// //       // Fetch profile status for all employees
// //       if (transformedEmployees.length > 0) {
// //         const statusPromises = transformedEmployees.map(employee =>
// //           getProfileStatus(employee.id)
// //             .then(status => ({ userId: employee.id, status }))
// //             .catch(err => ({ userId: employee.id, status: null }))
// //         );
// //         const statusResults = await Promise.all(statusPromises);
// //         const map = {};
// //         statusResults.forEach(s => { map[s.userId] = s.status; });
// //         setStatusMap(prevMap => ({ ...prevMap, ...map }));
// //       }
// //     } catch (err) {
// //       console.error('Error fetching employees:', err);
// //       const errorMessage = err.message.includes("You don't have permission") 
// //         ? "You don't have permission to view this data."
// //         : 'Failed to fetch employees';
// //       toast.error(errorMessage);
// //       setEmployees([]);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters, activeTab]);

// //   // Fetch candidates from API (legacy path)
// //   const fetchCandidates = useCallback(async () => {
// //     setIsLoading(true);
// //     try {
// //       const params = {
// //         page: currentPage,
// //         size: pageSize,
// //         sortBy: sortField,
// //         direction: sortDirection
// //       };
      
// //       if (filterText) params.search = filterText;
// //       if (filters.emailSent) {
// //         if (filters.emailSent === 'sent') {
// //           params.status = 'true';
// //         } else if (filters.emailSent === 'not-sent') {
// //           params.emailSentFilter = 'not-sent';
// //         }
// //       }

// //       const data = await candidateService.getCandidates(params);
      
// //       // Transform data to match expected format
// //       const transformedCandidates = (data.content || []).map(candidate => ({
// //         id: candidate.id,
// //         name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email,
// //         email: candidate.email,
// //         jobTitle: candidate.jobTitle || 'N/A',
// //         designation: candidate.jobTitle || 'N/A',
// //         status: candidate.status || 'Applied',
// //         emailStatus: candidate.emailSent ? 'Sent' : 'Not Sent',
// //         lastEmailDate: candidate.emailSentAt || candidate.lastEmailDate || (candidate.emailSent ? candidate.uploadedAt : null),
// //         role: candidate.role || 'CANDIDATE',
// //         firstName: candidate.firstName,
// //         lastName: candidate.lastName,
// //         phoneNumber: candidate.phoneNumber,
// //         uploadedAt: candidate.uploadedAt,
// //         emailSent: candidate.emailSent
// //       }));
      
// //       setCandidates(transformedCandidates);
// //       setTotalPages(data.totalPages || 0);
// //       setTotalElements(data.totalElements || 0);

// //       // Fetch profile status for all candidates
// //       if (transformedCandidates.length > 0) {
// //         const statusPromises = transformedCandidates.map(candidate =>
// //           getProfileStatus(candidate.id)
// //             .then(status => ({ userId: candidate.id, status }))
// //             .catch(err => ({ userId: candidate.id, status: null }))
// //         );
// //         const statusResults = await Promise.all(statusPromises);
// //         const map = {};
// //         statusResults.forEach(s => { map[s.userId] = s.status; });
// //         setStatusMap(prevMap => ({ ...prevMap, ...map }));
// //       }
// //     } catch (err) {
// //       console.error('Error fetching candidates:', err);
// //       toast.error('Failed to fetch candidates');
// //       setCandidates([]);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters]);

// //   // New: Fetch only the active group's recipients via backend per-group endpoint
// //   const fetchRecipientGroups = useCallback(async () => {
// //     setIsLoading(true);
// //     setFetchError('');
// //     try {
// //       const list = await emailManagementService.getGroupFromBackend(activeTab);
// //       const roleLabel = activeTab === 'hr' ? 'HR' : activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : 'CANDIDATE';
// //       const mapToRow = (u) => ({
// //         id: u.id,
// //         name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
// //         email: u.email,
// //         role: roleLabel,
// //         emailStatus: 'Not Sent',
// //         lastEmailDate: null,
// //         firstName: u.firstName || '',
// //         lastName: u.lastName || '',
// //       });

// //       const rows = (list || []).map(mapToRow);

// //       if (activeTab === 'hr') setHrGroup(rows);
// //       if (activeTab === 'employees') setEmployees(rows);
// //       if (activeTab === 'candidates') setCandidates(rows);
// //       if (activeTab === 'alumni') setAlumniGroup(rows);

// //       setTotalPages(1);
// //       setTotalElements(rows.length);
// //     } catch (err) {
// //       console.error('Error fetching recipient groups:', err);
// //       setFetchError(err.message || 'Failed to fetch recipient groups');
// //       toast.error(err.message || 'Failed to fetch recipient groups');
// //       if (activeTab === 'hr') setHrGroup([]);
// //       if (activeTab === 'employees') setEmployees([]);
// //       if (activeTab === 'candidates') setCandidates([]);
// //       if (activeTab === 'alumni') setAlumniGroup([]);
// //       setTotalPages(0);
// //       setTotalElements(0);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   }, [activeTab]);

// //   // Fetch data when tab changes - use new grouped fetch
// //   useEffect(() => {
// //     fetchRecipientGroups();
// //   }, [activeTab, fetchRecipientGroups]);

// //   // Email templates
// //   const emailTemplates = {
// //     employee: {
// //       onboarding: {
// //         subject: 'Welcome to AEPL - Onboarding Instructions',
// //         body: `Dear {{name}},

// // Welcome to AEPL! We're excited to have you join our team.

// // Please access your onboarding portal using the link below:
// // Portal Link: {{portalLink}}

// // If you have any questions, please don't hesitate to reach out.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       meeting: {
// //         subject: 'Meeting Invitation - {{meetingTitle}}',
// //         body: `Dear {{name}},

// // You are invited to attend the following meeting:

// // Date: {{date}}
// // Time: {{time}}
// // Venue/Platform: {{venue}}

// // Please confirm your attendance.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       document: {
// //         subject: 'Document Submission Reminder',
// //         body: `Dear {{name}},

// // This is a reminder to submit the required document:

// // Document: {{documentName}}
// // Submission Deadline: {{submissionDate}}
// // Document Link: {{documentLink}}

// // Please ensure timely submission.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       announcement: {
// //         subject: 'Company Announcement',
// //         body: `Dear {{name}},

// // We have an important company update to share:

// // {{announcementContent}}

// // Link: {{link}}

// // Thank you for your attention.

// // Best regards,
// // Management Team
// // AEPL`
// //       }
// //     },
// //     candidate: {
// //       invitation: {
// //         subject: 'Welcome to AEPL - Your Account Details',
// //         body: `Dear {{name}},

// // Welcome to AEPL! We're excited to have you join our recruitment process.

// // Your login credentials for the HRMS portal are:
// // Email: {{email}}
// // Password: test1234

// // Please login to complete your profile and application process:
// // Login Link: http://localhost:5173/login

// // For security reasons, please change your password after your first login.

// // If you have any questions, please don't hesitate to contact us.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       confirmation: {
// //         subject: 'Application Confirmation - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Thank you for your application for the position of {{jobTitle}}.

// // Your application reference number is: {{reference}}

// // We will review your application and contact you soon.

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       interview: {
// //         subject: 'Interview Invitation - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Congratulations! You have been shortlisted for the position of {{jobTitle}}.

// // Interview Details:
// // Date: {{date}}
// // Time: {{time}}
// // Venue/Platform: {{venue}}

// // Please confirm your availability.

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       assessment: {
// //         subject: 'Assessment Invitation - {{jobTitle}}',
// //         body: `Dear {{name}},

// // You are invited to complete an assessment for the position of {{jobTitle}}.

// // Assessment Link: {{assessmentLink}}
// // Deadline: {{deadline}}

// // Please complete the assessment before the deadline.

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       shortlist: {
// //         subject: 'Application Status Update - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Thank you for your interest in the position of {{jobTitle}}.

// // {{statusMessage}}

// // {{feedback}}

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       offer: {
// //         subject: 'Job Offer - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Congratulations! We are pleased to offer you the position of {{jobTitle}}.

// // Joining Details:
// // Date: {{joiningDate}}
// // Venue: {{venue}}
// // Required Documents: {{documents}}

// // Please confirm your acceptance.

// // Best regards,
// // HR Team
// // AEPL`
// //       }
// //     }
// //   };

// //   // Dynamic field configurations
// //   const fieldConfigurations = {
// //     employee: {
// //       onboarding: [
// //         { name: 'portalLink', label: 'Portal Link', type: 'url', required: true }
// //       ],
// //       meeting: [
// //         { name: 'meetingTitle', label: 'Meeting Title', type: 'text', required: true },
// //         { name: 'date', label: 'Date', type: 'date', required: true },
// //         { name: 'time', label: 'Time', type: 'time', required: true },
// //         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
// //       ],
// //       document: [
// //         { name: 'documentName', label: 'Document Name', type: 'text', required: true },
// //         { name: 'documentLink', label: 'Document Link', type: 'url', required: false },
// //         { name: 'submissionDate', label: 'Submission Date', type: 'date', required: true }
// //       ],
// //       announcement: [
// //         { name: 'announcementContent', label: 'Announcement Content', type: 'textarea', required: true },
// //         { name: 'link', label: 'Link', type: 'url', required: false }
// //       ]
// //     },
// //     candidate: {
// //       invitation: [
// //         // No additional fields needed - email and name are automatically included
// //       ],
// //       confirmation: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'reference', label: 'Reference Number', type: 'text', required: true }
// //       ],
// //       interview: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'date', label: 'Date', type: 'date', required: true },
// //         { name: 'time', label: 'Time', type: 'time', required: true },
// //         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
// //       ],
// //       assessment: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'assessmentLink', label: 'Assessment Link', type: 'url', required: true },
// //         { name: 'deadline', label: 'Deadline', type: 'datetime-local', required: true }
// //       ],
// //       shortlist: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'statusMessage', label: 'Status Message', type: 'textarea', required: true },
// //         { name: 'feedback', label: 'Feedback (Optional)', type: 'textarea', required: false }
// //       ],
// //       offer: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
// //         { name: 'venue', label: 'Venue', type: 'text', required: true },
// //         { name: 'documents', label: 'Required Documents', type: 'textarea', required: true }
// //       ]
// //     }
// //   };

// //   const getCurrentData = () => {
// //     if (activeTab === 'hr') return hrGroup;
// //     if (activeTab === 'employees') return employees;
// //     if (activeTab === 'candidates') return candidates;
// //     if (activeTab === 'alumni') return alumniGroup;
// //     return [];
// //   };

// //   // Return the template object for current tab/type, or null
// //   const getCurrentTemplate = () => {
// //     const groupKey = isEmployeeTab ? 'employee' : 'candidate';
// //     const t = emailTemplates?.[groupKey]?.[emailType];
// //     return t || null;
// //   };

// //   // Patch rows helper using backend response.updated
// //   const patchRowsWithUpdated = (updated = []) => {
// //     if (!Array.isArray(updated) || updated.length === 0) return;
// //     const uMap = new Map(updated.map(u => [u.id, u]));
// //     const patch = (row) => {
// //       if (!uMap.has(row.id)) return row;
// //       const u = uMap.get(row.id) || {};
// //       const emailSent = u.emailSent === true ? true : (row.emailSent === true);
// //       return {
// //         ...row,
// //         ...u,
// //         emailSent,
// //         emailStatus: emailSent ? 'Sent' : (row.emailStatus || 'Not Sent'),
// //         lastEmailDate: emailSent ? (u.lastEmailDate || new Date().toISOString()) : (row.lastEmailDate || null)
// //       };
// //     };
// //     if (activeTab === 'hr') setHrGroup(prev => prev.map(patch));
// //     if (activeTab === 'employees') setEmployees(prev => prev.map(patch));
// //     if (activeTab === 'candidates') setCandidates(prev => prev.map(patch));
// //     if (activeTab === 'alumni') setAlumniGroup(prev => prev.map(patch));
// //   };

// //   const handleRecipientToggle = (person) => {
// //     setSelectedRecipients(prev => {
// //       const isSelected = prev.some(r => r.id === person.id);
// //       if (isSelected) {
// //         return prev.filter(r => r.id !== person.id);
// //       } else {
// //         return [...prev, person];
// //       }
// //     });
// //   };

// //   const handleSelectAll = () => {
// //     const currentData = getCurrentData();
// //     if (selectedRecipients.length === currentData.length) {
// //       setSelectedRecipients([]);
// //     } else {
// //       setSelectedRecipients([...currentData]);
// //     }
// //   };

// //   const handleSort = (field) => {
// //     if (sortField === field) {
// //       setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
// //     } else {
// //       setSortField(field);
// //       setSortDirection('asc');
// //     }
// //   };

// //   const toggleColumnVisibility = (column) => {
// //     setVisibleColumns(prev => ({
// //       ...prev,
// //       [column]: !prev[column]
// //     }));
// //   };

// //   const formatDate = (dateString) => {
// //     if (!dateString) return 'Never';
// //     const d = new Date(dateString);
// //     if (isNaN(d.getTime())) return 'Never';
// //     return d.toLocaleString(undefined, {
// //       year: 'numeric', month: 'short', day: '2-digit',
// //       hour: '2-digit', minute: '2-digit'
// //     });
// //   };

// //   const getEmailStatusBadge = (status) => {
// //     const statusClasses = {
// //       'Sent': 'email-sent',
// //       'Delivered': 'email-delivered', 
// //       'Opened': 'email-opened',
// //       'Not Sent': 'email-not-sent',
// //       'Failed': 'email-failed',
// //       'Bounced': 'email-bounced'
// //     };
    
// //     return (
// //       <span className={`email-status-badge ${statusClasses[status] || 'email-default'}`}>
// //         {status}
// //       </span>
// //     );
// //   };

// //   // Profile Status Badge
// //   const renderProfileStatusBadge = (status) => {
// //     if (!status) {
// //       return (
// //         <span style={{
// //           display: 'inline-block',
// //           padding: '4px 10px',
// //           borderRadius: '12px',
// //           fontSize: '12px',
// //           fontWeight: '600',
// //           textAlign: 'center',
// //           backgroundColor: '#6c757d',
// //           color: 'white'
// //         }}>
// //           Loading...
// //         </span>
// //       );
// //     }

// //     const backgroundColor = getStatusColor(status.onboarding_status);
// //     const displayText = status.onboarding_status ? 
// //       status.onboarding_status.replace('_', ' ').toUpperCase() : 'NOT STARTED';

// //     return (
// //       <span style={{
// //         display: 'inline-block',
// //         padding: '4px 10px',
// //         borderRadius: '12px',
// //         fontSize: '12px',
// //         fontWeight: '600',
// //         textAlign: 'center',
// //         backgroundColor: backgroundColor,
// //         color: 'white'
// //       }}>
// //         {displayText}
// //       </span>
// //     );
// //   };

// //   // Progress Bar
// //   const renderProgressBar = (status) => {
// //     if (!status) return null;
    
// //     const progressPercent = calculateProgressPercentage(status);
    
// //     return (
// //       <div style={{ width: '100%', marginTop: '4px' }}>
// //         <div style={{
// //           width: '100%',
// //           backgroundColor: '#e9ecef',
// //           borderRadius: '4px',
// //           height: '8px',
// //           overflow: 'hidden'
// //         }}>
// //           <div style={{
// //             width: `${progressPercent}%`,
// //             backgroundColor: progressPercent === 100 ? '#28a745' : '#007bff',
// //             height: '100%',
// //             borderRadius: '4px',
// //             transition: 'width 0.3s ease'
// //           }}>
// //           </div>
// //         </div>
// //         <small style={{ fontSize: '10px', color: '#6c757d' }}>
// //           {progressPercent}% Complete
// //         </small>
// //       </div>
// //     );
// //   };

// //   const handleDynamicFieldChange = (fieldName, value) => {
// //     setDynamicFields(prev => ({
// //       ...prev,
// //       [fieldName]: value
// //     }));
// //   };

// //   const replacePlaceholders = (text, fields, recipient) => {
// //     let result = text;
// //     Object.entries(fields).forEach(([key, value]) => {
// //       const placeholder = `{{${key}}}`;
// //       result = result.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
// //     });
    
// //     // Replace name placeholder with recipient name
// //     result = result.replace(/{{name}}/g, recipient?.name || '[name]');
// //     // Replace email placeholder with recipient email
// //     result = result.replace(/{{email}}/g, recipient?.email || '[email]');
    
// //     return result;
// //   };

// //   const getEmailTypeOptions = () => {
// //     if (isEmployeeTab) {
// //       return [
// //         { value: 'onboarding', label: 'Onboarding / Welcome' },
// //         { value: 'meeting', label: 'Meeting / Training / 1:1' },
// //         { value: 'document', label: 'Document / Policy Reminder' },
// //         { value: 'announcement', label: 'Company Announcements / Survey' }
// //       ];
// //     } else {
// //       return [
// //         { value: 'invitation', label: 'Candidate Invitation / Welcome' },
// //         { value: 'confirmation', label: 'Application Confirmation' },
// //         { value: 'interview', label: 'Interview Invitation / Reminder' },
// //         { value: 'assessment', label: 'Assessment / Test Invitation' },
// //         { value: 'shortlist', label: 'Shortlist / Rejection' },
// //         { value: 'offer', label: 'Offer / Joining Instructions' }
// //       ];
// //     }
// //   };

// //   const getCurrentFields = () => {
// //     return fieldConfigurations[isEmployeeTab ? 'employee' : 'candidate']?.[emailType] || [];
// //   };

// //   const handleSendEmail = async () => {
// //     if (selectedRecipients.length === 0 || !emailType) {
// //       toast.error('Please select recipients and email type');
// //       return;
// //     }

// //     const fields = getCurrentFields();
// //     const requiredFields = fields.filter(field => field.required);
// //     const missingFields = requiredFields.filter(field => !dynamicFields[field.name]);
    
// //     if (missingFields.length > 0) {
// //       toast.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
// //       return;
// //     }

// //     setIsLoading(true);
// //     toast.loading('Sending emails...', { id: 'sending' });
    
// //     try {
// //       const selectedIds = selectedRecipients.map(recipient => recipient.id);
// //       const emailData = {
// //         ids: selectedIds,
// //         emailType: emailType,
// //         dynamicFields: dynamicFields,
// //         customBody: emailBody !== emailTemplates[activeTab === 'employees' ? 'employee' : 'candidate'][emailType]?.body ? emailBody : null
// //       };
      
// //       // Send email using the appropriate service
// //       let resp;
// //       if (isEmployeeTab) {
// //         resp = await employeeService.sendEmployeeEmails(emailData);
// //       } else {
// //         resp = await candidateService.sendCandidateEmails(emailData);
// //       }

// //       // Backend might return explicit failure shape
// //       if (resp && resp.status === 'failed') {
// //         const msg = resp.message || 'Failed to send email for some recipients.';
// //         setFailedSendDetails(Array.isArray(resp.failed) ? resp.failed : []);
// //         toast.error(msg, { id: 'sending' });
// //         return;
// //       }

// //       // Apply updates only from backend `updated` array
// //       if (resp && Array.isArray(resp.updated) && resp.updated.length > 0) {
// //         patchRowsWithUpdated(resp.updated);
// //       }

// //       // Summary toast including partial failures if provided
// //       const updatedCount = Array.isArray(resp?.updated) ? resp.updated.length : 0;
// //       const failedCount = Array.isArray(resp?.failed) ? resp.failed.length : 0;
// //       const summary = failedCount > 0
// //         ? `Sent ${updatedCount}, Failed ${failedCount}`
// //         : (updatedCount > 0 ? `Successfully sent ${updatedCount} email${updatedCount > 1 ? 's' : ''}!` : 'No emails were sent.');

// //       toast.success(summary, { 
// //         id: 'sending',
// //         duration: 4000 
// //       });

// //       // If there are failures, show separate error toast and store details
// //       if (failedCount > 0) {
// //         const failedList = Array.isArray(resp.failed) ? resp.failed : [];
// //         toast.error('❌ Failed to send email for some recipients. See details below.');
// //         // Per-entry toast (limited to 10 to avoid spam)
// //         failedList.slice(0, 10).forEach((f) => {
// //           const id = f?.id || f?.userId || f?.employeeId || f?.candidateId || 'unknown';
// //           const reason = f?.error || f?.message || 'Unknown error';
// //           toast.error(`Failed to send to ID ${id}: ${reason}`);
// //         });
// //         setFailedSendDetails(failedList);
// //       } else {
// //         setFailedSendDetails([]);
// //       }
      
// //       // Reset form and refresh data
// //       setSelectedRecipients([]);
// //       setEmailType('');
// //       setDynamicFields({});
// //       setEmailBody('');
// //       setShowEmailComposer(false);
      
// //       // Refresh the data to update email status
// //       if (activeTab === 'employees') {
// //         fetchEmployees();
// //       } else {
// //         fetchCandidates();
// //       }
      
// //     } catch (error) {
// //       if (error?.status === 404) {
// //         const m = (error?.data && (error.data.message || error.data.error)) || 'Meeting not available';
// //         toast.error(m, { id: 'sending' });
// //       } else {
// //         const m = error?.message || 'Failed to send emails. Please try again.';
// //         toast.error(m, { id: 'sending' });
// //       }
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handlePreviewEmail = (recipient) => {
// //     if (!emailType) {
// //       toast.error('Please select an email type first');
// //       return;
// //     }
// //     setPreviewRecipient(recipient);
// //     setShowPreview(true);
// //   };

// //   // Enhanced table helper functions
// //   const getTableColumns = () => {
// //     // Always show a simple, professional 5-column set
// //     return [
// //       { key: 'name', label: 'Name', visible: true, className: 'em-col-name truncate', render: (v) => v || '-' },
// //       { key: 'email', label: 'Email', visible: true, className: 'em-col-email truncate', render: (v) => v || '-' },
// //       { key: 'role', label: 'Role', visible: true, className: 'em-col-role', render: (v) => v || '-' },
// //       { key: 'emailStatus', label: 'Email Status', visible: false, className: 'em-col-status', render: (v) => getEmailStatusBadge(v) },
// //       { key: 'lastEmailDate', label: 'Last Email', visible: false, className: 'em-col-last', render: (v) => formatDate(v) },
// //     ];
// //   };

// //   const getTableFilters = () => {
// //     if (activeTab === 'employees') {
// //       return {
// //         status: {
// //           label: 'Status',
// //           options: [
// //             { label: 'All', value: '' },
// //             { label: 'Active', value: 'Active' },
// //             { label: 'On Leave', value: 'On Leave' },
// //             { label: 'Terminated', value: 'Terminated' },
// //             { label: 'Rejected', value: 'Rejected' },
// //             { label: 'New', value: 'New' },
// //             { label: 'Interviewed', value: 'Interviewed' },
// //             { label: 'Offered', value: 'Offered' }
// //           ]
// //         },
// //         emailSent: {
// //           label: 'Email Status',
// //           options: [
// //             { label: 'All', value: '' },
// //             { label: 'Sent', value: 'true' },
// //             { label: 'Not Sent', value: 'false' }
// //           ]
// //         }
// //       };
// //     } else {
// //       return {
// //         emailSent: {
// //           label: 'Email Status',
// //           options: [
// //             { label: 'All', value: '' },
// //             { label: 'Sent', value: 'sent' },
// //             { label: 'Not Sent', value: 'not-sent' }
// //           ]
// //         }
// //       };
// //     }
// //   };

// //   const getTableActions = () => {
// //     const actions = [];
    
// //     if (selectedRecipients.length > 0) {
// //       actions.push({
// //         label: `Compose Email (${selectedRecipients.length})`,
// //         icon: '📧',
// //         onClick: () => setShowEmailComposer(true),
// //         variant: 'primary',
// //         size: 'sm'
// //       });
      
// //       if (emailType) {
// //         actions.push({
// //           label: 'Preview',
// //           icon: '👁️',
// //           onClick: () => setShowPreview(true),
// //           variant: 'secondary',
// //           size: 'sm'
// //         });
// //       }

// //       if (activeTab === 'candidates') {
// //         actions.push({
// //           label: 'Resend Invitation',
// //           icon: '🔁',
// //           onClick: async () => {
// //             setIsLoading(true);
// //             try {
// //               // Send one-by-one to ensure names are included per candidate
// //               for (const rec of selectedRecipients) {
// //                 await candidateService.resendInvitation({
// //                   emails: [rec.email],
// //                   firstName: rec.firstName || (rec.name?.split(' ')[0] || ''),
// //                   lastName: rec.lastName || (rec.name?.split(' ').slice(1).join(' ') || ''),
// //                   password: 'test1234',
// //                   loginLink: 'http://localhost:5173/login',
// //                   description: 'Welcome to AEPL',
// //                 });
// //               }
// //               toast.success(`Resent invitation to ${selectedRecipients.length} candidate${selectedRecipients.length > 1 ? 's' : ''}`);
// //             } catch (err) {
// //               console.error('Failed to resend invitations:', err);
// //               toast.error(err.message || 'Failed to resend invitations');
// //             } finally {
// //               setIsLoading(false);
// //             }
// //           },
// //           variant: 'primary',
// //           size: 'sm'
// //         });
// //       }
// //     }
    
// //     return actions;
// //   };

// //   const handleSearch = (query) => {
// //     setFilterText(query);
// //     setCurrentPage(0); // Reset to first page when search changes
// //   };

// //   const handleFilterChange = (newFilters) => {
// //     setFilters(newFilters);
// //     setCurrentPage(0); // Reset to first page when filters change
// //   };

// //   const handleSortChange = (key) => {
// //     const direction = sortField === key && sortDirection === 'asc' ? 'desc' : 'asc';
// //     setSortField(key);
// //     setSortDirection(direction);
// //     setCurrentPage(0); // Reset to first page when sorting changes
// //   };

// //   const handleRowSelect = (id) => {
// //     const person = getCurrentData().find(p => p.id === id);
// //     if (person) {
// //       handleRecipientToggle(person);
// //     }
// //   };

// //   const handleSelectAllRows = () => {
// //     handleSelectAll();
// //   };

// //   // Update email template when email type changes
// //   useEffect(() => {
// //     if (emailType) {
// //       const template = getCurrentTemplate();
// //       if (!template) {
// //         toast.error('Template not available for this selection');
// //       } else {
// //         // Pre-fill body using the first selected recipient if present
// //         const recipient = selectedRecipients[0] || null;
// //         const filled = replacePlaceholders(template.body || '', dynamicFields, recipient);
// //         setEmailBody(filled);
// //       }

// //       // Reset dynamic fields for the selected template
// //       const fields = getCurrentFields();
// //       const initialFields = {};
// //       fields.forEach(field => {
// //         initialFields[field.name] = '';
// //       });
// //       setDynamicFields(initialFields);
// //     }
// //   }, [emailType, activeTab]);

// //   return (
// //     <div className="email-management-panel">


// //       {Array.isArray(failedSendDetails) && failedSendDetails.length > 0 && (
// //         <div style={{ background: '#fff3f3', border: '1px solid #f5c2c7', color: '#842029', padding: 10, borderRadius: 6, marginBottom: 12 }}>
// //           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //             <strong>Failed to send email for {failedSendDetails.length} recipient(s)</strong>
// //             <button onClick={() => setFailedSendDetails([])} style={{ background: 'transparent', border: 'none', color: '#842029', cursor: 'pointer' }}>Dismiss</button>
// //           </div>
// //           <ul style={{ margin: '8px 0 0 18px' }}>
// //             {failedSendDetails.slice(0, 20).map((f, idx) => (
// //               <li key={idx}>
// //                 ID: {String(f.id || f.userId || f.employeeId || f.candidateId || 'unknown')} — {String(f.error || f.message || 'Unknown error')}
// //               </li>
// //             ))}
// //           </ul>
// //         </div>
// //       )}

// //       {/* Tab Navigation - Boxed like Employee Management */}
// //       <div
// //         className="tab-navigation"
// //         style={{
// //           background: 'var(--color-surface)',
// //           border: '1px solid var(--color-border)',
// //           borderRadius: 8,
// //           padding: 10,
// //           marginBottom: 16,
// //           display: 'flex',
// //           gap: 10,
// //           justifyContent: 'center',
// //           flexWrap: 'wrap'
// //         }}
// //       >
// //         <button
// //           className={`tab-button ${activeTab === 'hr' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('hr');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'hr' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'hr' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'hr' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           HR
// //         </button>
// //         <button
// //           className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('employees');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'employees' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'employees' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'employees' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           Employees
// //         </button>
// //         <button
// //           className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('candidates');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'candidates' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'candidates' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'candidates' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           Candidates
// //         </button>
// //         <button
// //           className={`tab-button ${activeTab === 'alumni' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('alumni');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'alumni' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'alumni' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'alumni' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           Alumni
// //         </button>
// //       </div>

// //       {/* Enhanced Recipients Table */}
// //       {fetchError && (
// //         <div className="dashboard-message" style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', marginBottom: 10, padding: 10, borderRadius: 6 }}>
// //           {fetchError}
// //         </div>
// //       )}
// //       <EnhancedTable
// //         data={getCurrentData()}
// //         columns={getTableColumns()}
// //         onSearch={handleSearch}
// //         onFilter={handleFilterChange}
// //         onSort={handleSortChange}
// //         searchPlaceholder="Search by ID, name, email..."
// //         filters={getTableFilters()}
// //         sortConfig={{ key: sortField, direction: sortDirection }}
// //         loading={isLoading}
// //         selectedRows={selectedRecipients.map(r => r.id)}
// //         onRowSelect={handleRowSelect}
// //         onSelectAll={handleSelectAllRows}
// //         actions={getTableActions()}
// //       />

// //       {/* Pagination */}
// //       <div className="pagination-controls" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
// //         <select 
// //           className="page-size-select" 
// //           value={pageSize} 
// //           onChange={(e) => {
// //             setPageSize(parseInt(e.target.value));
// //             setCurrentPage(0);
// //           }}
// //           style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
// //         >
// //           <option value={10}>10 per page</option>
// //           <option value={20}>20 per page</option>
// //           <option value={50}>50 per page</option>
// //         </select>
        
// //         <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
// //           <button 
// //             onClick={() => setCurrentPage(currentPage - 1)} 
// //             disabled={currentPage === 0}
// //             style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', opacity: currentPage === 0 ? 0.6 : 1, cursor: currentPage === 0 ? 'not-allowed' : 'pointer' }}
// //           >
// //             Previous
// //           </button>
// //           <span>Page {currentPage + 1} of {totalPages} ({totalElements} total)</span>
// //           <button 
// //             onClick={() => setCurrentPage(currentPage + 1)} 
// //             disabled={currentPage >= totalPages - 1}
// //             style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', opacity: currentPage >= totalPages - 1 ? 0.6 : 1, cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
// //           >
// //             Next
// //           </button>
// //         </div>
// //       </div>

// //       {/* Compose Email Modal */}
// //       <EmailComposeModal
// //         open={showEmailComposer}
// //         onClose={() => setShowEmailComposer(false)}
// //         to={selectedRecipients.map(r => r.email).filter(Boolean).join(', ')}
// //         subject={(() => {
// //           const t = getCurrentTemplate();
// //           const recip = selectedRecipients[0] || previewRecipient;
// //           return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
// //         })()}
// //         message={emailBody}
// //         typeOptions={getEmailTypeOptions()}
// //         emailType={emailType}
// //         onChangeEmailType={(val) => setEmailType(val)}
// //         fields={getCurrentFields()}
// //         dynamicFields={dynamicFields}
// //         onChangeField={handleDynamicFieldChange}
// //         onSend={({ to, subject, message }) => {
// //           setEmailBody(message || '');
// //           if (!emailType) { toast.error('Please select an email type'); return; }
// //           if (selectedRecipients.length === 0) { toast.error('Please select at least one recipient'); return; }
// //           handleSendEmail();
// //           setShowEmailComposer(false);
// //         }}
// //       />

// //       {/* Email Preview Modal */}
// //       {showPreview && (
// //         <div className="email-composer-modal">
// //           <div className="modal-content">
// //             <div className="modal-header">
// //               <h3>Email Preview</h3>
// //               <button
// //                 className="close-btn"
// //                 onClick={() => setShowPreview(false)}
// //               >
// //                 ✕
// //               </button>
// //             </div>
// //             <div className="modal-body">
// //               {emailType && selectedRecipients.length > 0 ? (
// //                 <div className="preview-container">
// //                   <div className="preview-recipient-selector">
// //                     <label>Preview for:</label>
// //                     <select
// //                       value={previewRecipient?.id || selectedRecipients[0]?.id}
// //                       onChange={(e) => {
// //                         const recipient = selectedRecipients.find(r => r.id === parseInt(e.target.value));
// //                         setPreviewRecipient(recipient);
// //                       }}
// //                       className="form-select"
// //                     >
// //                       {selectedRecipients.map(recipient => (
// //                         <option key={recipient.id} value={recipient.id}>
// //                           {recipient.name} ({recipient.email})
// //                         </option>
// //                       ))}
// //                     </select>
// //                   </div>
                  
// //                   <div className="email-preview-content">
// //                     <div className="preview-field">
// //                       <strong>To:</strong> {(previewRecipient || selectedRecipients[0])?.email}
// //                     </div>
// //                     <div className="preview-field">
// //                       <strong>Subject:</strong> {(() => {
// //                         const t = getCurrentTemplate();
// //                         const recip = previewRecipient || selectedRecipients[0] || null;
// //                         return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
// //                       })()}
// //                     </div>
// //                     <div className="preview-field">
// //                       <strong>Body:</strong>
// //                       <div className="preview-body-content">
// //                         {replacePlaceholders(emailBody, dynamicFields, previewRecipient || selectedRecipients[0])}
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </div>
// //               ) : (
// //                 <div className="preview-empty">
// //                   <p>Please select recipients and email type to preview</p>
// //                 </div>
// //               )}
// //             </div>
// //             <div className="modal-footer">
// //               <button
// //                 className="cancel-btn"
// //                 onClick={() => setShowPreview(false)}
// //               >
// //                 Close
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Email Composer Modal */}
// //       {showEmailComposer && (
// //         <div className="email-composer-modal">
// //           <div className="modal-content">
// //             <div className="modal-header">
// //               <h3>Compose Email to {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? 's' : ''}</h3>
// //               <button
// //                 className="close-btn"
// //                 onClick={() => setShowEmailComposer(false)}
// //               >
// //                 ✕
// //               </button>
// //             </div>

// //             <div className="modal-body">
// //               {/* Email Type Selection */}
// //               <div className="form-group">
// //                 <label>Email Type *</label>
// //                 <select
// //                   value={emailType}
// //                   onChange={(e) => setEmailType(e.target.value)}
// //                   className="form-select"
// //                 >
// //                   <option value="">Choose email type...</option>
// //                   {getEmailTypeOptions().map(option => (
// //                     <option key={option.value} value={option.value}>
// //                       {option.label}
// //                     </option>
// //                   ))}
// //                 </select>
// //               </div>

// //               {/* Dynamic Fields */}
// //               {emailType && (
// //                 <div className="dynamic-fields">
// //                   <h4>Email Details</h4>
// //                   {getCurrentFields().map(field => (
// //                     <div key={field.name} className="form-group">
// //                       <label>
// //                         {field.label} {field.required && <span className="required">*</span>}
// //                       </label>
// //                       {field.type === 'textarea' ? (
// //                         <textarea
// //                           value={dynamicFields[field.name] || ''}
// //                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
// //                           placeholder={`Enter ${field.label.toLowerCase()}`}
// //                           rows={3}
// //                           className="form-textarea"
// //                         />
// //                       ) : (
// //                         <input
// //                           type={field.type}
// //                           value={dynamicFields[field.name] || ''}
// //                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
// //                           placeholder={`Enter ${field.label.toLowerCase()}`}
// //                           className="form-input"
// //                         />
// //                       )}
// //                     </div>
// //                   ))}
// //                 </div>
// //               )}

// //               {/* Email Preview */}
// //               {emailType && (
// //                 <div className="email-preview">
// //                   <h4>Email Preview</h4>
// //                   <div className="preview-subject">
// //                     <strong>Subject:</strong> {(() => {
// //                       const t = getCurrentTemplate();
// //                       const recip = selectedRecipients[0] || null;
// //                       return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
// //                     })()}
// //                   </div>
// //                   <div className="preview-body">
// //                     <label>Email Body:</label>
// //                     <textarea
// //                       value={emailBody}
// //                       onChange={(e) => setEmailBody(e.target.value)}
// //                       rows={10}
// //                       className="email-body-textarea"
// //                     />
// //                   </div>
// //                   <div className="preview-note">
// //                     <small>
// //                       📝 Placeholders like {`{{name}}`} will be replaced with actual values for each recipient.
// //                     </small>
// //                   </div>
// //                 </div>
// //               )}
// //             </div>

// //             <div className="modal-footer">
// //               <button
// //                 className="cancel-btn"
// //                 onClick={() => setShowEmailComposer(false)}
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 className={`send-btn ${isLoading ? 'loading' : ''}`}
// //                 onClick={handleSendEmail}
// //                 disabled={isLoading || !emailType}
// //               >
// //                 {isLoading ? (
// //                   <>
// //                     <span className="loading-spinner"></span>
// //                     Sending...
// //                   </>
// //                 ) : (
// //                   `📤 Send to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`
// //                 )}
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default EmailManagementPanel;


// import React, { useState, useEffect, useCallback } from 'react';
// import EnhancedTable from './EnhancedTable';
// import EmailComposeModal from './EmailComposeModal';
// import { getProfileStatus, calculateProgressPercentage, getStatusColor } from '../../services/profileService';
// import searchIcon from '../../assets/icons/search.svg';
// import filterIcon from '../../assets/icons/filter.svg';
// import settingsIcon from '../../assets/icons/settings.svg';
// import { employeeService, candidateService, emailManagementService } from '../../services/apiService';
// import toast from '../../services/toastService';


// const EmailManagementPanel = () => {
//   const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'hr' | 'alumni' | 'candidates'
//   const [selectedRecipients, setSelectedRecipients] = useState([]);
//   const [emailType, setEmailType] = useState('');
//   const [dynamicFields, setDynamicFields] = useState({});
//   const [emailBody, setEmailBody] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [showEmailComposer, setShowEmailComposer] = useState(false);
//   const [sortField, setSortField] = useState('uploadedAt');
//   const [sortDirection, setSortDirection] = useState('desc');
//   const [filterText, setFilterText] = useState('');
//   // External toolbar triggers for EnhancedTable (moved inside component)
//   const [filterTrig, setFilterTrig] = useState(0);
//   const [settingsTrig, setSettingsTrig] = useState(0);
//   const [resetTrig, setResetTrig] = useState(0);
//   const [visibleColumns, setVisibleColumns] = useState({
//     select: true,
//     name: true,
//     email: true,
//     designation: true,
//     status: true,
//     emailStatus: true,
//     profileStatus: true,
//     lastEmailDate: true
//   });
//   const [showPreview, setShowPreview] = useState(false);
//   const [previewRecipient, setPreviewRecipient] = useState(null);
  
//   // Real data state
//   const [employees, setEmployees] = useState([]);
//   const [candidates, setCandidates] = useState([]);
//   const [hrGroup, setHrGroup] = useState([]);
//   const [alumniGroup, setAlumniGroup] = useState([]);
//   const [fetchError, setFetchError] = useState('');
//   const [currentPage, setCurrentPage] = useState(0);
//   const [pageSize, setPageSize] = useState(10);
//   const [totalPages, setTotalPages] = useState(0);
//   const [totalElements, setTotalElements] = useState(0);
//   const [filters, setFilters] = useState({ status: '', emailSent: '', profileStatus: '' });
//   const [statusMap, setStatusMap] = useState({}); // userId → profile status
//   const [failedSendDetails, setFailedSendDetails] = useState([]); // [{id, error}]

//   // Helper: whether current tab is any employee-type tab
//   const isEmployeeTab = activeTab !== 'candidates';

//   // Fetch employees from API (legacy path)
//   const fetchEmployees = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       const params = {
//         page: currentPage,
//         size: pageSize,
//         sortBy: sortField,
//         direction: sortDirection
//       };
      
//       if (filterText) params.search = filterText;
//       if (filters.status) params.status = filters.status;
//       if (filters.emailSent) params.emailSent = filters.emailSent;
//       // Role filter by active tab: Employees, HR, Alumni
//       if (activeTab === 'employees') params.role = 'EMPLOYEE';
//       if (activeTab === 'hr') params.role = 'HR';
//       if (activeTab === 'alumni') params.role = 'EX_EMPLOYEE';

//       const data = await employeeService.getEmployees(params);
      
//       // Transform data to match expected format
//       const transformedEmployees = (data.content || []).map(emp => ({
//         id: emp.id,
//         name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
//         email: emp.email,
//         designation: emp.designation || 'N/A',
//         status: emp.status || 'Active',
//         emailStatus: emp.emailSent ? 'Sent' : 'Not Sent',
//         // Prefer precise timestamp from backend if available
//         lastEmailDate: emp.emailSentAt || emp.lastEmailDate || (emp.emailSent ? emp.uploadedAt : null),
//         role: emp.role || emp.loginRole || (activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'hr' ? 'HR' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : ''),
//         firstName: emp.firstName,
//         lastName: emp.lastName,
//         phoneNumber: emp.phoneNumber,
//         uploadedAt: emp.uploadedAt,
//         emailSent: emp.emailSent
//       }));
      
//       setEmployees(transformedEmployees);
//       setTotalPages(data.totalPages || 0);
//       setTotalElements(data.totalElements || 0);

//       // Fetch profile status for all employees
//       if (transformedEmployees.length > 0) {
//         const statusPromises = transformedEmployees.map(employee =>
//           getProfileStatus(employee.id)
//             .then(status => ({ userId: employee.id, status }))
//             .catch(err => ({ userId: employee.id, status: null }))
//         );
//         const statusResults = await Promise.all(statusPromises);
//         const map = {};
//         statusResults.forEach(s => { map[s.userId] = s.status; });
//         setStatusMap(prevMap => ({ ...prevMap, ...map }));
//       }
//     } catch (err) {
//       console.error('Error fetching employees:', err);
//       const errorMessage = err.message.includes("You don't have permission") 
//         ? "You don't have permission to view this data."
//         : 'Failed to fetch employees';
//       toast.error(errorMessage);
//       setEmployees([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters, activeTab]);

//   // Fetch candidates from API (legacy path)
//   const fetchCandidates = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       const params = {
//         page: currentPage,
//         size: pageSize,
//         sortBy: sortField,
//         direction: sortDirection
//       };
      
//       if (filterText) params.search = filterText;
//       if (filters.emailSent) {
//         if (filters.emailSent === 'sent') {
//           params.status = 'true';
//         } else if (filters.emailSent === 'not-sent') {
//           params.emailSentFilter = 'not-sent';
//         }
//       }

//       const data = await candidateService.getCandidates(params);
      
//       // Transform data to match expected format
//       const transformedCandidates = (data.content || []).map(candidate => ({
//         id: candidate.id,
//         name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email,
//         email: candidate.email,
//         jobTitle: candidate.jobTitle || 'N/A',
//         designation: candidate.jobTitle || 'N/A',
//         status: candidate.status || 'Applied',
//         emailStatus: candidate.emailSent ? 'Sent' : 'Not Sent',
//         lastEmailDate: candidate.emailSentAt || candidate.lastEmailDate || (candidate.emailSent ? candidate.uploadedAt : null),
//         role: candidate.role || 'CANDIDATE',
//         firstName: candidate.firstName,
//         lastName: candidate.lastName,
//         phoneNumber: candidate.phoneNumber,
//         uploadedAt: candidate.uploadedAt,
//         emailSent: candidate.emailSent
//       }));
      
//       setCandidates(transformedCandidates);
//       setTotalPages(data.totalPages || 0);
//       setTotalElements(data.totalElements || 0);

//       // Fetch profile status for all candidates
//       if (transformedCandidates.length > 0) {
//         const statusPromises = transformedCandidates.map(candidate =>
//           getProfileStatus(candidate.id)
//             .then(status => ({ userId: candidate.id, status }))
//             .catch(err => ({ userId: candidate.id, status: null }))
//         );
//         const statusResults = await Promise.all(statusPromises);
//         const map = {};
//         statusResults.forEach(s => { map[s.userId] = s.status; });
//         setStatusMap(prevMap => ({ ...prevMap, ...map }));
//       }
//     } catch (err) {
//       console.error('Error fetching candidates:', err);
//       toast.error('Failed to fetch candidates');
//       setCandidates([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters]);

//   // New: Fetch only the active group's recipients via backend per-group endpoint
//   const fetchRecipientGroups = useCallback(async () => {
//     setIsLoading(true);
//     setFetchError('');
//     try {
//       const list = await emailManagementService.getGroupFromBackend(activeTab);
//       const roleLabel = activeTab === 'hr' ? 'HR' : activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : 'CANDIDATE';
//       const mapToRow = (u) => ({
//         id: u.id,
//         name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
//         email: u.email,
//         role: roleLabel,
//         // Prefer backend-provided flags if available
//         emailStatus: u.emailSent ? 'Sent' : 'Not Sent',
//         lastEmailDate: u.emailSentAt || u.lastEmailDate || (u.emailSent ? u.uploadedAt : null),
//         emailSent: !!u.emailSent,
//         firstName: u.firstName || '',
//         lastName: u.lastName || '',
//       });

//       const rows = (list || []).map(mapToRow);

//       if (activeTab === 'hr') setHrGroup(rows);
//       if (activeTab === 'employees') setEmployees(rows);
//       if (activeTab === 'candidates') setCandidates(rows);
//       if (activeTab === 'alumni') setAlumniGroup(rows);

//       setTotalPages(1);
//       setTotalElements(rows.length);
//     } catch (err) {
//       console.error('Error fetching recipient groups:', err);
//       setFetchError(err.message || 'Failed to fetch recipient groups');
//       toast.error(err.message || 'Failed to fetch recipient groups');
//       if (activeTab === 'hr') setHrGroup([]);
//       if (activeTab === 'employees') setEmployees([]);
//       if (activeTab === 'candidates') setCandidates([]);
//       if (activeTab === 'alumni') setAlumniGroup([]);
//       setTotalPages(0);
//       setTotalElements(0);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [activeTab]);

//   // Fetch data when tab changes - use new grouped fetch
//   useEffect(() => {
//     fetchRecipientGroups();
//   }, [activeTab, fetchRecipientGroups]);

//   // Email templates
//   const emailTemplates = {
//     employee: {
//       onboarding: {
//         subject: 'Welcome to AEPL - Onboarding Instructions',
//         body: `Dear {{name}},

// Welcome to AEPL! We're excited to have you join our team.

// Please access your onboarding portal using the link below:
// Portal Link: {{portalLink}}

// If you have any questions, please don't hesitate to reach out.

// Best regards,
// HR Team
// AEPL`
//       },
//       meeting: {
//         subject: 'Meeting Invitation - {{meetingTitle}}',
//         body: `Dear {{name}},

// You are invited to attend the following meeting:

// Date: {{date}}
// Time: {{time}}
// Venue/Platform: {{venue}}

// Please confirm your attendance.

// Best regards,
// HR Team
// AEPL`
//       },
//       document: {
//         subject: 'Document Submission Reminder',
//         body: `Dear {{name}},

// This is a reminder to submit the required document:

// Document: {{documentName}}
// Submission Deadline: {{submissionDate}}
// Document Link: {{documentLink}}

// Please ensure timely submission.

// Best regards,
// HR Team
// AEPL`
//       },
//       announcement: {
//         subject: 'Company Announcement',
//         body: `Dear {{name}},

// We have an important company update to share:

// {{announcementContent}}

// Link: {{link}}

// Thank you for your attention.

// Best regards,
// Management Team
// AEPL`
//       }
//     },
//     candidate: {
//       invitation: {
//         subject: 'Welcome to AEPL - Your Account Details',
//         body: `Dear {{name}},

// Welcome to AEPL! We're excited to have you join our recruitment process.

// Your login credentials for the HRMS portal are:
// Email: {{email}}
// Password: test1234

// Please login to complete your profile and application process:
// Login Link: http://localhost:5173/login

// For security reasons, please change your password after your first login.

// If you have any questions, please don't hesitate to contact us.

// Best regards,
// HR Team
// AEPL`
//       },
//       confirmation: {
//         subject: 'Application Confirmation - {{jobTitle}}',
//         body: `Dear {{name}},

// Thank you for your application for the position of {{jobTitle}}.

// Your application reference number is: {{reference}}

// We will review your application and contact you soon.

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       interview: {
//         subject: 'Interview Invitation - {{jobTitle}}',
//         body: `Dear {{name}},

// Congratulations! You have been shortlisted for the position of {{jobTitle}}.

// Interview Details:
// Date: {{date}}
// Time: {{time}}
// Venue/Platform: {{venue}}

// Please confirm your availability.

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       assessment: {
//         subject: 'Assessment Invitation - {{jobTitle}}',
//         body: `Dear {{name}},

// You are invited to complete an assessment for the position of {{jobTitle}}.

// Assessment Link: {{assessmentLink}}
// Deadline: {{deadline}}

// Please complete the assessment before the deadline.

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       shortlist: {
//         subject: 'Application Status Update - {{jobTitle}}',
//         body: `Dear {{name}},

// Thank you for your interest in the position of {{jobTitle}}.

// {{statusMessage}}

// {{feedback}}

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       offer: {
//         subject: 'Job Offer - {{jobTitle}}',
//         body: `Dear {{name}},

// Congratulations! We are pleased to offer you the position of {{jobTitle}}.

// Joining Details:
// Date: {{joiningDate}}
// Venue: {{venue}}
// Required Documents: {{documents}}

// Please confirm your acceptance.

// Best regards,
// HR Team
// AEPL`
//       }
//     }
//   };

//   // Dynamic field configurations
//   const fieldConfigurations = {
//     employee: {
//       onboarding: [
//         { name: 'portalLink', label: 'Portal Link', type: 'url', required: true }
//       ],
//       meeting: [
//         { name: 'meetingTitle', label: 'Meeting Title', type: 'text', required: true },
//         { name: 'date', label: 'Date', type: 'date', required: true },
//         { name: 'time', label: 'Time', type: 'time', required: true },
//         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
//       ],
//       document: [
//         { name: 'documentName', label: 'Document Name', type: 'text', required: true },
//         { name: 'documentLink', label: 'Document Link', type: 'url', required: false },
//         { name: 'submissionDate', label: 'Submission Date', type: 'date', required: true }
//       ],
//       announcement: [
//         { name: 'announcementContent', label: 'Announcement Content', type: 'textarea', required: true },
//         { name: 'link', label: 'Link', type: 'url', required: false }
//       ]
//     },
//     candidate: {
//       invitation: [
//         // No additional fields needed - email and name are automatically included
//       ],
//       confirmation: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'reference', label: 'Reference Number', type: 'text', required: true }
//       ],
//       interview: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'date', label: 'Date', type: 'date', required: true },
//         { name: 'time', label: 'Time', type: 'time', required: true },
//         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
//       ],
//       assessment: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'assessmentLink', label: 'Assessment Link', type: 'url', required: true },
//         { name: 'deadline', label: 'Deadline', type: 'datetime-local', required: true }
//       ],
//       shortlist: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'statusMessage', label: 'Status Message', type: 'textarea', required: true },
//         { name: 'feedback', label: 'Feedback (Optional)', type: 'textarea', required: false }
//       ],
//       offer: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
//         { name: 'venue', label: 'Venue', type: 'text', required: true },
//         { name: 'documents', label: 'Required Documents', type: 'textarea', required: true }
//       ]
//     }
//   };

//   const getCurrentData = () => {
//     if (activeTab === 'hr') return hrGroup;
//     if (activeTab === 'employees') return employees;
//     if (activeTab === 'candidates') return candidates;
//     if (activeTab === 'alumni') return alumniGroup;
//     return [];
//   };

//   // Return the template object for current tab/type, or null
//   const getCurrentTemplate = () => {
//     const groupKey = isEmployeeTab ? 'employee' : 'candidate';
//     const t = emailTemplates?.[groupKey]?.[emailType];
//     return t || null;
//   };

//   // Patch rows helper using backend response.updated
//   const patchRowsWithUpdated = (updated = []) => {
//     if (!Array.isArray(updated) || updated.length === 0) return;
//     const uMap = new Map(updated.map(u => [u.id, u]));
//     const patch = (row) => {
//       if (!uMap.has(row.id)) return row;
//       const u = uMap.get(row.id) || {};
//       const emailSent = u.emailSent === true ? true : (row.emailSent === true);
//       return {
//         ...row,
//         ...u,
//         emailSent,
//         emailStatus: emailSent ? 'Sent' : (row.emailStatus || 'Not Sent'),
//         lastEmailDate: emailSent ? (u.lastEmailDate || new Date().toISOString()) : (row.lastEmailDate || null)
//       };
//     };
//     if (activeTab === 'hr') setHrGroup(prev => prev.map(patch));
//     if (activeTab === 'employees') setEmployees(prev => prev.map(patch));
//     if (activeTab === 'candidates') setCandidates(prev => prev.map(patch));
//     if (activeTab === 'alumni') setAlumniGroup(prev => prev.map(patch));
//   };

//   const handleRecipientToggle = (person) => {
//     setSelectedRecipients(prev => {
//       const isSelected = prev.some(r => r.id === person.id);
//       if (isSelected) {
//         return prev.filter(r => r.id !== person.id);
//       } else {
//         return [...prev, person];
//       }
//     });
//   };

//   const handleSelectAll = () => {
//     const currentData = getCurrentData();
//     if (selectedRecipients.length === currentData.length) {
//       setSelectedRecipients([]);
//     } else {
//       setSelectedRecipients([...currentData]);
//     }
//   };

//   const handleSort = (field) => {
//     if (sortField === field) {
//       setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortField(field);
//       setSortDirection('asc');
//     }
//   };

//   const toggleColumnVisibility = (column) => {
//     setVisibleColumns(prev => ({
//       ...prev,
//       [column]: !prev[column]
//     }));
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'Never';
//     const d = new Date(dateString);
//     if (isNaN(d.getTime())) return 'Never';
//     return d.toLocaleString(undefined, {
//       year: 'numeric', month: 'short', day: '2-digit',
//       hour: '2-digit', minute: '2-digit'
//     });
//   };

//   const getEmailStatusBadge = (status) => {
//     const statusClasses = {
//       'Sent': 'email-sent',
//       'Delivered': 'email-delivered', 
//       'Opened': 'email-opened',
//       'Not Sent': 'email-not-sent',
//       'Failed': 'email-failed',
//       'Bounced': 'email-bounced'
//     };
    
//     return (
//       <span className={`email-status-badge ${statusClasses[status] || 'email-default'}`}>
//         {status}
//       </span>
//     );
//   };

//   // Profile Status Badge
//   const renderProfileStatusBadge = (status) => {
//     if (!status) {
//       return (
//         <span style={{
//           display: 'inline-block',
//           padding: '4px 10px',
//           borderRadius: '12px',
//           fontSize: '12px',
//           fontWeight: '600',
//           textAlign: 'center',
//           backgroundColor: '#6c757d',
//           color: 'white'
//         }}>
//           Loading...
//         </span>
//       );
//     }

//     const backgroundColor = getStatusColor(status.onboarding_status);
//     const displayText = status.onboarding_status ? 
//       status.onboarding_status.replace('_', ' ').toUpperCase() : 'NOT STARTED';

//     return (
//       <span style={{
//         display: 'inline-block',
//         padding: '4px 10px',
//         borderRadius: '12px',
//         fontSize: '12px',
//         fontWeight: '600',
//         textAlign: 'center',
//         backgroundColor: backgroundColor,
//         color: 'white'
//       }}>
//         {displayText}
//       </span>
//     );
//   };

//   // Progress Bar
//   const renderProgressBar = (status) => {
//     if (!status) return null;
    
//     const progressPercent = calculateProgressPercentage(status);
    
//     return (
//       <div style={{ width: '100%', marginTop: '4px' }}>
//         <div style={{
//           width: '100%',
//           backgroundColor: '#e9ecef',
//           borderRadius: '4px',
//           height: '8px',
//           overflow: 'hidden'
//         }}>
//           <div style={{
//             width: `${progressPercent}%`,
//             backgroundColor: progressPercent === 100 ? '#28a745' : '#007bff',
//             height: '100%',
//             borderRadius: '4px',
//             transition: 'width 0.3s ease'
//           }}>
//           </div>
//         </div>
//         <small style={{ fontSize: '10px', color: '#6c757d' }}>
//           {progressPercent}% Complete
//         </small>
//       </div>
//     );
//   };

//   const handleDynamicFieldChange = (fieldName, value) => {
//     setDynamicFields(prev => ({
//       ...prev,
//       [fieldName]: value
//     }));
//   };

//   const replacePlaceholders = (text, fields, recipient) => {
//     let result = text;
//     Object.entries(fields).forEach(([key, value]) => {
//       const placeholder = `{{${key}}}`;
//       result = result.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
//     });
    
//     // Replace name placeholder with recipient name
//     result = result.replace(/{{name}}/g, recipient?.name || '[name]');
//     // Replace email placeholder with recipient email
//     result = result.replace(/{{email}}/g, recipient?.email || '[email]');
    
//     return result;
//   };

//   const getEmailTypeOptions = () => {
//     if (isEmployeeTab) {
//       return [
//         { value: 'onboarding', label: 'Onboarding / Welcome' },
//         { value: 'meeting', label: 'Meeting / Training / 1:1' },
//         { value: 'document', label: 'Document / Policy Reminder' },
//         { value: 'announcement', label: 'Company Announcements / Survey' }
//       ];
//     } else {
//       return [
//         { value: 'invitation', label: 'Candidate Invitation / Welcome' },
//         { value: 'confirmation', label: 'Application Confirmation' },
//         { value: 'interview', label: 'Interview Invitation / Reminder' },
//         { value: 'assessment', label: 'Assessment / Test Invitation' },
//         { value: 'shortlist', label: 'Shortlist / Rejection' },
//         { value: 'offer', label: 'Offer / Joining Instructions' }
//       ];
//     }
//   };

//   const getCurrentFields = () => {
//     return fieldConfigurations[isEmployeeTab ? 'employee' : 'candidate']?.[emailType] || [];
//   };

//   const handleSendEmail = async () => {
//     if (selectedRecipients.length === 0 || !emailType) {
//       toast.error('Please select recipients and email type');
//       return;
//     }

//     const fields = getCurrentFields();
//     const requiredFields = fields.filter(field => field.required);
//     const missingFields = requiredFields.filter(field => !dynamicFields[field.name]);
    
//     if (missingFields.length > 0) {
//       toast.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
//       return;
//     }

//     setIsLoading(true);
//     toast.loading('Sending emails...', { id: 'sending' });
    
//     try {
//       const selectedIds = selectedRecipients.map(recipient => recipient.id);
//       const emailData = {
//         ids: selectedIds,
//         emailType: emailType,
//         dynamicFields: dynamicFields,
//         customBody: emailBody !== emailTemplates[activeTab === 'employees' ? 'employee' : 'candidate'][emailType]?.body ? emailBody : null
//       };
      
//       // Send email using the appropriate service
//       let resp;
//       if (isEmployeeTab) {
//         resp = await employeeService.sendEmployeeEmails(emailData);
//       } else {
//         resp = await candidateService.sendCandidateEmails(emailData);
//       }

//       // Backend might return explicit failure shape
//       if (resp && resp.status === 'failed') {
//         const msg = resp.message || 'Failed to send email for some recipients.';
//         setFailedSendDetails(Array.isArray(resp.failed) ? resp.failed : []);
//         toast.error(msg, { id: 'sending' });
//         return;
//       }

//       // Apply updates only from backend `updated` array
//       if (resp && Array.isArray(resp.updated) && resp.updated.length > 0) {
//         patchRowsWithUpdated(resp.updated);
//       }

//       // Summary toast including partial failures if provided
//       const updatedCount = Array.isArray(resp?.updated) ? resp.updated.length : 0;
//       const failedCount = Array.isArray(resp?.failed) ? resp.failed.length : 0;
//       const summary = failedCount > 0
//         ? `Sent ${updatedCount}, Failed ${failedCount}`
//         : (updatedCount > 0 ? `Successfully sent ${updatedCount} email${updatedCount > 1 ? 's' : ''}!` : 'No emails were sent.');

//       toast.success(summary, { 
//         id: 'sending',
//         duration: 4000 
//       });

//       // If there are failures, show separate error toast and store details
//       if (failedCount > 0) {
//         const failedList = Array.isArray(resp.failed) ? resp.failed : [];
//         toast.error('❌ Failed to send email for some recipients. See details below.');
//         // Per-entry toast (limited to 10 to avoid spam)
//         failedList.slice(0, 10).forEach((f) => {
//           const id = f?.id || f?.userId || f?.employeeId || f?.candidateId || 'unknown';
//           const reason = f?.error || f?.message || 'Unknown error';
//           toast.error(`Failed to send to ID ${id}: ${reason}`);
//         });
//         setFailedSendDetails(failedList);
//       } else {
//         setFailedSendDetails([]);
//       }
      
//       // Reset form and refresh data
//       setSelectedRecipients([]);
//       setEmailType('');
//       setDynamicFields({});
//       setEmailBody('');
//       setShowEmailComposer(false);
      
//       // Refresh the data to update email status
//       if (activeTab === 'employees') {
//         fetchEmployees();
//       } else {
//         fetchCandidates();
//       }
      
//     } catch (error) {
//       if (error?.status === 404) {
//         const m = (error?.data && (error.data.message || error.data.error)) || 'Meeting not available';
//         toast.error(m, { id: 'sending' });
//       } else {
//         const m = error?.message || 'Failed to send emails. Please try again.';
//         toast.error(m, { id: 'sending' });
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handlePreviewEmail = (recipient) => {
//     if (!emailType) {
//       toast.error('Please select an email type first');
//       return;
//     }
//     setPreviewRecipient(recipient);
//     setShowPreview(true);
//   };

//   // Enhanced table helper functions
//   const getTableColumns = () => {
//     // Always show a simple, professional 5-column set
//     return [
//       { key: 'name', label: 'Name', visible: true, className: 'em-col-name truncate', render: (v) => v || '-' },
//       { key: 'email', label: 'Email', visible: true, className: 'em-col-email truncate', render: (v) => v || '-' },
//       { key: 'role', label: 'Role', visible: true, className: 'em-col-role', render: (v) => v || '-' },
//       { key: 'emailStatus', label: 'Email Status', visible: false, className: 'em-col-status', render: (v) => getEmailStatusBadge(v) },
//       { key: 'lastEmailDate', label: 'Last Email', visible: false, className: 'em-col-last', render: (v) => formatDate(v) },
//     ];
//   };

//   const getTableFilters = () => {
//     if (activeTab === 'employees') {
//       return {
//         status: {
//           label: 'Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Active', value: 'Active' },
//             { label: 'On Leave', value: 'On Leave' },
//             { label: 'Terminated', value: 'Terminated' },
//             { label: 'Rejected', value: 'Rejected' },
//             { label: 'New', value: 'New' },
//             { label: 'Interviewed', value: 'Interviewed' },
//             { label: 'Offered', value: 'Offered' }
//           ]
//         },
//         profileStatus: {
//           label: 'Profile Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Loading', value: 'loading' },
//             { label: 'Pending', value: 'pending' },
//             { label: 'Completed', value: 'completed' }
//           ]
//         },
//         emailSent: {
//           label: 'Email Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Sent', value: 'true' },
//             { label: 'Not Sent', value: 'false' }
//           ]
//         }
//       };
//     } else {
//       return {
//         emailSent: {
//           label: 'Email Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Sent', value: 'sent' },
//             { label: 'Not Sent', value: 'not-sent' }
//           ]
//         }
//       };
//     }
//   };

//   const getTableActions = () => {
//     const actions = [];
    
//     if (selectedRecipients.length > 0) {
//       actions.push({
//         label: `Compose Email (${selectedRecipients.length})`,
//         icon: '📧',
//         onClick: () => setShowEmailComposer(true),
//         variant: 'primary',
//         size: 'sm'
//       });
      
//       if (emailType) {
//         actions.push({
//           label: 'Preview',
//           icon: '👁️',
//           onClick: () => setShowPreview(true),
//           variant: 'secondary',
//           size: 'sm'
//         });
//       }

//       if (activeTab === 'candidates') {
//         actions.push({
//           label: 'Resend Invitation',
//           icon: '🔁',
//           onClick: async () => {
//             setIsLoading(true);
//             try {
//               // Send one-by-one to ensure names are included per candidate
//               for (const rec of selectedRecipients) {
//                 await candidateService.resendInvitation({
//                   emails: [rec.email],
//                   firstName: rec.firstName || (rec.name?.split(' ')[0] || ''),
//                   lastName: rec.lastName || (rec.name?.split(' ').slice(1).join(' ') || ''),
//                   password: 'test1234',
//                   loginLink: 'http://localhost:5173/login',
//                   description: 'Welcome to AEPL',
//                 });
//               }
//               toast.success(`Resent invitation to ${selectedRecipients.length} candidate${selectedRecipients.length > 1 ? 's' : ''}`);
//             } catch (err) {
//               console.error('Failed to resend invitations:', err);
//               toast.error(err.message || 'Failed to resend invitations');
//             } finally {
//               setIsLoading(false);
//             }
//           },
//           variant: 'primary',
//           size: 'sm'
//         });
//       }
//     }
    
//     return actions;
//   };

//   const handleSearch = (query) => {
//     setFilterText(query);
//     setCurrentPage(0); // Reset to first page when search changes
//   };

//   const handleFilterChange = (newFilters) => {
//     const defaults = { status: '', emailSent: '', profileStatus: '' };
//     setFilters({ ...defaults, ...(newFilters || {}) });
//     setCurrentPage(0); // Reset to first page when filters change
//   };

//   const handleSortChange = (key) => {
//     const direction = sortField === key && sortDirection === 'asc' ? 'desc' : 'asc';
//     setSortField(key);
//     setSortDirection(direction);
//     setCurrentPage(0); // Reset to first page when sorting changes
//   };

//   const handleRowSelect = (id) => {
//     const person = getCurrentData().find(p => p.id === id);
//     if (person) {
//       handleRecipientToggle(person);
//     }
//   };

//   const handleSelectAllRows = () => {
//     handleSelectAll();
//   };

//   // Update email template when email type changes
//   useEffect(() => {
//     if (emailType) {
//       const template = getCurrentTemplate();
//       if (!template) {
//         toast.error('Template not available for this selection');
//       } else {
//         // Pre-fill body using the first selected recipient if present
//         const recipient = selectedRecipients[0] || null;
//         const filled = replacePlaceholders(template.body || '', dynamicFields, recipient);
//         setEmailBody(filled);
//       }

//       // Reset dynamic fields for the selected template
//       const fields = getCurrentFields();
//       const initialFields = {};
//       fields.forEach(field => {
//         initialFields[field.name] = '';
//       });
//       setDynamicFields(initialFields);
//     }
//   }, [emailType, activeTab]);

//   return (
//     <div className="email-management-panel">


//       {Array.isArray(failedSendDetails) && failedSendDetails.length > 0 && (
//         <div style={{ background: '#fff3f3', border: '1px solid #f5c2c7', color: '#842029', padding: 10, borderRadius: 6, marginBottom: 12 }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//             <strong>Failed to send email for {failedSendDetails.length} recipient(s)</strong>
//             <button onClick={() => setFailedSendDetails([])} style={{ background: 'transparent', border: 'none', color: '#842029', cursor: 'pointer' }}>Dismiss</button>
//           </div>
//           <ul style={{ margin: '8px 0 0 18px' }}>
//             {failedSendDetails.slice(0, 20).map((f, idx) => (
//               <li key={idx}>
//                 ID: {String(f.id || f.userId || f.employeeId || f.candidateId || 'unknown')} — {String(f.error || f.message || 'Unknown error')}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       {/* Unified paper: Tabs + Controls + Table */}
//       <div
//         className="email-paper"
//         style={{ border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)', padding: 10 }}
//       >
//         {/* Tabs Row */}
//         <div
//           className="tab-navigation"
//           style={{
//             background: 'transparent',
//             border: 'none',
//             borderRadius: 8,
//             padding: 8,
//             marginBottom: 8,
//             display: 'flex',
//             gap: 10,
//             justifyContent: 'center',
//             flexWrap: 'wrap'
//           }}
//         >
//         <button
//           className={`tab-button ${activeTab === 'hr' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('hr');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'hr' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'hr' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           HR
//         </button>
//         <button
//           className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('employees');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'employees' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'employees' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           Employees
//         </button>
//         <button
//           className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('candidates');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'candidates' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'candidates' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           Candidates
//         </button>
//         <button
//           className={`tab-button ${activeTab === 'alumni' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('alumni');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'alumni' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'alumni' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           Alumni
//         </button>
//         </div>

//         {/* Top toolbar removed to rely on EnhancedTable's built-in header controls */}

//       {/* Enhanced Recipients Table */}
//       {fetchError && (
//         <div className="dashboard-message" style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', marginBottom: 10, padding: 10, borderRadius: 6 }}>
//           {fetchError}
//         </div>
//       )}
//       {(() => {
//         let rows = getCurrentData();
//         // Apply client-side profile status filtering when requested
//         const statusKey = (filters.profileStatus || '').toLowerCase();
//         if (statusKey) {
//           rows = rows.filter((r) => {
//             const s = statusMap[r.id];
//             if (!s || !s.onboarding_status) {
//               return statusKey === 'loading';
//             }
//             const norm = String(s.onboarding_status).toUpperCase();
//             if (statusKey === 'completed') return norm === 'COMPLETED';
//             if (statusKey === 'pending') return norm !== 'COMPLETED';
//             return true;
//           });
//         }
//   const clientPaginate = (totalPages === 0 || totalPages === 1) && rows.length > pageSize && totalElements <= rows.length;
//         const start = Math.max(0, currentPage) * pageSize;
//         const end = start + pageSize;
//         const displayRows = clientPaginate ? rows.slice(start, end) : rows;
//         const displayTotalPages = clientPaginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : totalPages;
//         return (
//           <div id="email-table" className="enhanced-table-container">
//             <EnhancedTable
//               data={displayRows}
//           columns={getTableColumns()}
//           onSearch={handleSearch}
//           onFilter={handleFilterChange}
//           onSort={handleSortChange}
//           searchPlaceholder="Search by ID, name, email..."
//           filters={getTableFilters()}
//           sortConfig={{ key: sortField, direction: sortDirection }}
//           loading={isLoading}
//           selectedRows={selectedRecipients.map(r => r.id)}
//           onRowSelect={handleRowSelect}
//           onSelectAll={handleSelectAllRows}
//           actions={getTableActions()}
//           headerControlsHidden={false}
//           controlledSearchQuery={filterText}
//           triggerOpenFilters={filterTrig}
//           triggerOpenSettings={settingsTrig}
//           triggerReset={resetTrig}
//             />

//             {/* Pagination - same component and styling as EmployeeList */}
//             <PaginationBar
//               currentPage={Math.min(currentPage, Math.max(0, displayTotalPages - 1))}
//               totalPages={displayTotalPages}
//               pageSize={pageSize}
//               totalElements={clientPaginate ? rows.length : totalElements}
//               onPageChange={(p) => setCurrentPage(p)}
//               onPageSizeChange={(n) => { setPageSize(Number(n)); setCurrentPage(0); }}
//               pageSizeOptions={[10, 20, 50]}
//             />
//           </div>
//         );
//       })()}

//       {/* Pagination moved next to table to mirror EmployeeList layout */}

//       </div>{/* end email-paper */}

//       {/* Compose Email Modal */}
//       <EmailComposeModal
//         open={showEmailComposer}
//         onClose={() => setShowEmailComposer(false)}
//         to={selectedRecipients.map(r => r.email).filter(Boolean).join(', ')}
//         subject={(() => {
//           const t = getCurrentTemplate();
//           const recip = selectedRecipients[0] || previewRecipient;
//           return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
//         })()}
//         message={emailBody}
//         typeOptions={getEmailTypeOptions()}
//         emailType={emailType}
//         onChangeEmailType={(val) => setEmailType(val)}
//         fields={getCurrentFields()}
//         dynamicFields={dynamicFields}
//         onChangeField={handleDynamicFieldChange}
//         onSend={({ to, subject, message }) => {
//           setEmailBody(message || '');
//           if (!emailType) { toast.error('Please select an email type'); return; }
//           if (selectedRecipients.length === 0) { toast.error('Please select at least one recipient'); return; }
//           handleSendEmail();
//           setShowEmailComposer(false);
//         }}
//       />

//       {/* Email Preview Modal */}
//       {showPreview && (
//         <div className="email-composer-modal">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3>Email Preview</h3>
//               <button
//                 className="close-btn"
//                 onClick={() => setShowPreview(false)}
//               >
//                 ✕
//               </button>
//             </div>
//             <div className="modal-body">
//               {emailType && selectedRecipients.length > 0 ? (
//                 <div className="preview-container">
//                   <div className="preview-recipient-selector">
//                     <label>Preview for:</label>
//                     <select
//                       value={previewRecipient?.id || selectedRecipients[0]?.id}
//                       onChange={(e) => {
//                         const recipient = selectedRecipients.find(r => r.id === parseInt(e.target.value));
//                         setPreviewRecipient(recipient);
//                       }}
//                       className="form-select"
//                     >
//                       {selectedRecipients.map(recipient => (
//                         <option key={recipient.id} value={recipient.id}>
//                           {recipient.name} ({recipient.email})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
                  
//                   <div className="email-preview-content">
//                     <div className="preview-field">
//                       <strong>To:</strong> {(previewRecipient || selectedRecipients[0])?.email}
//                     </div>
//                     <div className="preview-field">
//                       <strong>Subject:</strong> {(() => {
//                         const t = getCurrentTemplate();
//                         const recip = previewRecipient || selectedRecipients[0] || null;
//                         return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
//                       })()}
//                     </div>
//                     <div className="preview-field">
//                       <strong>Body:</strong>
//                       <div className="preview-body-content">
//                         {replacePlaceholders(emailBody, dynamicFields, previewRecipient || selectedRecipients[0])}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="preview-empty">
//                   <p>Please select recipients and email type to preview</p>
//                 </div>
//               )}
//             </div>
//             <div className="modal-footer">
//               <button
//                 className="cancel-btn"
//                 onClick={() => setShowPreview(false)}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Email Composer Modal */}
//       {showEmailComposer && (
//         <div className="email-composer-modal">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3>Compose Email to {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? 's' : ''}</h3>
//               <button
//                 className="close-btn"
//                 onClick={() => setShowEmailComposer(false)}
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="modal-body">
//               {/* Email Type Selection */}
//               <div className="form-group">
//                 <label>Email Type *</label>
//                 <select
//                   value={emailType}
//                   onChange={(e) => setEmailType(e.target.value)}
//                   className="form-select"
//                 >
//                   <option value="">Choose email type...</option>
//                   {getEmailTypeOptions().map(option => (
//                     <option key={option.value} value={option.value}>
//                       {option.label}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Dynamic Fields */}
//               {emailType && (
//                 <div className="dynamic-fields">
//                   <h4>Email Details</h4>
//                   {getCurrentFields().map(field => (
//                     <div key={field.name} className="form-group">
//                       <label>
//                         {field.label} {field.required && <span className="required">*</span>}
//                       </label>
//                       {field.type === 'textarea' ? (
//                         <textarea
//                           value={dynamicFields[field.name] || ''}
//                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
//                           placeholder={`Enter ${field.label.toLowerCase()}`}
//                           rows={3}
//                           className="form-textarea"
//                         />
//                       ) : (
//                         <input
//                           type={field.type}
//                           value={dynamicFields[field.name] || ''}
//                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
//                           placeholder={`Enter ${field.label.toLowerCase()}`}
//                           className="form-input"
//                         />
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Email Preview */}
//               {emailType && (
//                 <div className="email-preview">
//                   <h4>Email Preview</h4>
//                   <div className="preview-subject">
//                     <strong>Subject:</strong> {(() => {
//                       const t = getCurrentTemplate();
//                       const recip = selectedRecipients[0] || null;
//                       return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
//                     })()}
//                   </div>
//                   <div className="preview-body">
//                     <label>Email Body:</label>
//                     <textarea
//                       value={emailBody}
//                       onChange={(e) => setEmailBody(e.target.value)}
//                       rows={10}
//                       className="email-body-textarea"
//                     />
//                   </div>
//                   <div className="preview-note">
//                     <small>
//                       📝 Placeholders like {`{{name}}`} will be replaced with actual values for each recipient.
//                     </small>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="modal-footer">
//               <button
//                 className="cancel-btn"
//                 onClick={() => setShowEmailComposer(false)}
//               >
//                 Cancel
//               </button>
//               <button
//                 className={`send-btn ${isLoading ? 'loading' : ''}`}
//                 onClick={handleSendEmail}
//                 disabled={isLoading || !emailType}
//               >
//                 {isLoading ? (
//                   <>
//                     <span className="loading-spinner"></span>
//                     Sending...
//                   </>
//                 ) : (
//                   `📤 Send to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default EmailManagementPanel;

// // import React, { useState, useEffect, useCallback } from 'react';
// // import EnhancedTable from './EnhancedTable';
// // import EmailComposeModal from './EmailComposeModal';
// // import { getProfileStatus, calculateProgressPercentage, getStatusColor } from '../../services/profileService';
// import PaginationBar from '../common/PaginationBar';
// import '../../styles/Pagination.css';
// // import { employeeService, candidateService, emailManagementService } from '../../services/apiService';
// // import toast from '../../services/toastService';


// // const EmailManagementPanel = () => {
// //   const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'hr' | 'alumni' | 'candidates'
// //   const [selectedRecipients, setSelectedRecipients] = useState([]);
// //   const [emailType, setEmailType] = useState('');
// //   const [dynamicFields, setDynamicFields] = useState({});
// //   const [emailBody, setEmailBody] = useState('');
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [showEmailComposer, setShowEmailComposer] = useState(false);
// //   const [sortField, setSortField] = useState('uploadedAt');
// //   const [sortDirection, setSortDirection] = useState('desc');
// //   const [filterText, setFilterText] = useState('');
// //   const [visibleColumns, setVisibleColumns] = useState({
// //     select: true,
// //     name: true,
// //     email: true,
// //     designation: true,
// //     status: true,
// //     emailStatus: true,
// //     profileStatus: true,
// //     lastEmailDate: true
// //   });
// //   const [showPreview, setShowPreview] = useState(false);
// //   const [previewRecipient, setPreviewRecipient] = useState(null);
  
// //   // Real data state
// //   const [employees, setEmployees] = useState([]);
// //   const [candidates, setCandidates] = useState([]);
// //   const [hrGroup, setHrGroup] = useState([]);
// //   const [alumniGroup, setAlumniGroup] = useState([]);
// //   const [fetchError, setFetchError] = useState('');
// //   const [currentPage, setCurrentPage] = useState(0);
// //   const [pageSize, setPageSize] = useState(10);
// //   const [totalPages, setTotalPages] = useState(0);
// //   const [totalElements, setTotalElements] = useState(0);
// //   const [filters, setFilters] = useState({ status: '', emailSent: '' });
// //   const [statusMap, setStatusMap] = useState({}); // userId → profile status
// //   const [failedSendDetails, setFailedSendDetails] = useState([]); // [{id, error}]

// //   // Helper: whether current tab is any employee-type tab
// //   const isEmployeeTab = activeTab !== 'candidates';

// //   // Fetch employees from API (legacy path)
// //   const fetchEmployees = useCallback(async () => {
// //     setIsLoading(true);
// //     try {
// //       const params = {
// //         page: currentPage,
// //         size: pageSize,
// //         sortBy: sortField,
// //         direction: sortDirection
// //       };
      
// //       if (filterText) params.search = filterText;
// //       if (filters.status) params.status = filters.status;
// //       if (filters.emailSent) params.emailSent = filters.emailSent;
// //       // Role filter by active tab: Employees, HR, Alumni
// //       if (activeTab === 'employees') params.role = 'EMPLOYEE';
// //       if (activeTab === 'hr') params.role = 'HR';
// //       if (activeTab === 'alumni') params.role = 'EX_EMPLOYEE';

// //       const data = await employeeService.getEmployees(params);
      
// //       // Transform data to match expected format
// //       const transformedEmployees = (data.content || []).map(emp => ({
// //         id: emp.id,
// //         name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
// //         email: emp.email,
// //         designation: emp.designation || 'N/A',
// //         status: emp.status || 'Active',
// //         emailStatus: emp.emailSent ? 'Sent' : 'Not Sent',
// //         // Prefer precise timestamp from backend if available
// //         lastEmailDate: emp.emailSentAt || emp.lastEmailDate || (emp.emailSent ? emp.uploadedAt : null),
// //         role: emp.role || emp.loginRole || (activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'hr' ? 'HR' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : ''),
// //         firstName: emp.firstName,
// //         lastName: emp.lastName,
// //         phoneNumber: emp.phoneNumber,
// //         uploadedAt: emp.uploadedAt,
// //         emailSent: emp.emailSent
// //       }));
      
// //       setEmployees(transformedEmployees);
// //       setTotalPages(data.totalPages || 0);
// //       setTotalElements(data.totalElements || 0);

// //       // Fetch profile status for all employees
// //       if (transformedEmployees.length > 0) {
// //         const statusPromises = transformedEmployees.map(employee =>
// //           getProfileStatus(employee.id)
// //             .then(status => ({ userId: employee.id, status }))
// //             .catch(err => ({ userId: employee.id, status: null }))
// //         );
// //         const statusResults = await Promise.all(statusPromises);
// //         const map = {};
// //         statusResults.forEach(s => { map[s.userId] = s.status; });
// //         setStatusMap(prevMap => ({ ...prevMap, ...map }));
// //       }
// //     } catch (err) {
// //       console.error('Error fetching employees:', err);
// //       const errorMessage = err.message.includes("You don't have permission") 
// //         ? "You don't have permission to view this data."
// //         : 'Failed to fetch employees';
// //       toast.error(errorMessage);
// //       setEmployees([]);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters, activeTab]);

// //   // Fetch candidates from API (legacy path)
// //   const fetchCandidates = useCallback(async () => {
// //     setIsLoading(true);
// //     try {
// //       const params = {
// //         page: currentPage,
// //         size: pageSize,
// //         sortBy: sortField,
// //         direction: sortDirection
// //       };
      
// //       if (filterText) params.search = filterText;
// //       if (filters.emailSent) {
// //         if (filters.emailSent === 'sent') {
// //           params.status = 'true';
// //         } else if (filters.emailSent === 'not-sent') {
// //           params.emailSentFilter = 'not-sent';
// //         }
// //       }

// //       const data = await candidateService.getCandidates(params);
      
// //       // Transform data to match expected format
// //       const transformedCandidates = (data.content || []).map(candidate => ({
// //         id: candidate.id,
// //         name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email,
// //         email: candidate.email,
// //         jobTitle: candidate.jobTitle || 'N/A',
// //         designation: candidate.jobTitle || 'N/A',
// //         status: candidate.status || 'Applied',
// //         emailStatus: candidate.emailSent ? 'Sent' : 'Not Sent',
// //         lastEmailDate: candidate.emailSentAt || candidate.lastEmailDate || (candidate.emailSent ? candidate.uploadedAt : null),
// //         role: candidate.role || 'CANDIDATE',
// //         firstName: candidate.firstName,
// //         lastName: candidate.lastName,
// //         phoneNumber: candidate.phoneNumber,
// //         uploadedAt: candidate.uploadedAt,
// //         emailSent: candidate.emailSent
// //       }));
      
// //       setCandidates(transformedCandidates);
// //       setTotalPages(data.totalPages || 0);
// //       setTotalElements(data.totalElements || 0);

// //       // Fetch profile status for all candidates
// //       if (transformedCandidates.length > 0) {
// //         const statusPromises = transformedCandidates.map(candidate =>
// //           getProfileStatus(candidate.id)
// //             .then(status => ({ userId: candidate.id, status }))
// //             .catch(err => ({ userId: candidate.id, status: null }))
// //         );
// //         const statusResults = await Promise.all(statusPromises);
// //         const map = {};
// //         statusResults.forEach(s => { map[s.userId] = s.status; });
// //         setStatusMap(prevMap => ({ ...prevMap, ...map }));
// //       }
// //     } catch (err) {
// //       console.error('Error fetching candidates:', err);
// //       toast.error('Failed to fetch candidates');
// //       setCandidates([]);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters]);

// //   // New: Fetch only the active group's recipients via backend per-group endpoint
// //   const fetchRecipientGroups = useCallback(async () => {
// //     setIsLoading(true);
// //     setFetchError('');
// //     try {
// //       const list = await emailManagementService.getGroupFromBackend(activeTab);
// //       const roleLabel = activeTab === 'hr' ? 'HR' : activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : 'CANDIDATE';
// //       const mapToRow = (u) => ({
// //         id: u.id,
// //         name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
// //         email: u.email,
// //         role: roleLabel,
// //         emailStatus: 'Not Sent',
// //         lastEmailDate: null,
// //         firstName: u.firstName || '',
// //         lastName: u.lastName || '',
// //       });

// //       const rows = (list || []).map(mapToRow);

// //       if (activeTab === 'hr') setHrGroup(rows);
// //       if (activeTab === 'employees') setEmployees(rows);
// //       if (activeTab === 'candidates') setCandidates(rows);
// //       if (activeTab === 'alumni') setAlumniGroup(rows);

// //       setTotalPages(1);
// //       setTotalElements(rows.length);
// //     } catch (err) {
// //       console.error('Error fetching recipient groups:', err);
// //       setFetchError(err.message || 'Failed to fetch recipient groups');
// //       toast.error(err.message || 'Failed to fetch recipient groups');
// //       if (activeTab === 'hr') setHrGroup([]);
// //       if (activeTab === 'employees') setEmployees([]);
// //       if (activeTab === 'candidates') setCandidates([]);
// //       if (activeTab === 'alumni') setAlumniGroup([]);
// //       setTotalPages(0);
// //       setTotalElements(0);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   }, [activeTab]);

// //   // Fetch data when tab changes - use new grouped fetch
// //   useEffect(() => {
// //     fetchRecipientGroups();
// //   }, [activeTab, fetchRecipientGroups]);

// //   // Email templates
// //   const emailTemplates = {
// //     employee: {
// //       onboarding: {
// //         subject: 'Welcome to AEPL - Onboarding Instructions',
// //         body: `Dear {{name}},

// // Welcome to AEPL! We're excited to have you join our team.

// // Please access your onboarding portal using the link below:
// // Portal Link: {{portalLink}}

// // If you have any questions, please don't hesitate to reach out.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       meeting: {
// //         subject: 'Meeting Invitation - {{meetingTitle}}',
// //         body: `Dear {{name}},

// // You are invited to attend the following meeting:

// // Date: {{date}}
// // Time: {{time}}
// // Venue/Platform: {{venue}}

// // Please confirm your attendance.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       document: {
// //         subject: 'Document Submission Reminder',
// //         body: `Dear {{name}},

// // This is a reminder to submit the required document:

// // Document: {{documentName}}
// // Submission Deadline: {{submissionDate}}
// // Document Link: {{documentLink}}

// // Please ensure timely submission.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       announcement: {
// //         subject: 'Company Announcement',
// //         body: `Dear {{name}},

// // We have an important company update to share:

// // {{announcementContent}}

// // Link: {{link}}

// // Thank you for your attention.

// // Best regards,
// // Management Team
// // AEPL`
// //       }
// //     },
// //     candidate: {
// //       invitation: {
// //         subject: 'Welcome to AEPL - Your Account Details',
// //         body: `Dear {{name}},

// // Welcome to AEPL! We're excited to have you join our recruitment process.

// // Your login credentials for the HRMS portal are:
// // Email: {{email}}
// // Password: test1234

// // Please login to complete your profile and application process:
// // Login Link: http://localhost:5173/login

// // For security reasons, please change your password after your first login.

// // If you have any questions, please don't hesitate to contact us.

// // Best regards,
// // HR Team
// // AEPL`
// //       },
// //       confirmation: {
// //         subject: 'Application Confirmation - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Thank you for your application for the position of {{jobTitle}}.

// // Your application reference number is: {{reference}}

// // We will review your application and contact you soon.

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       interview: {
// //         subject: 'Interview Invitation - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Congratulations! You have been shortlisted for the position of {{jobTitle}}.

// // Interview Details:
// // Date: {{date}}
// // Time: {{time}}
// // Venue/Platform: {{venue}}

// // Please confirm your availability.

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       assessment: {
// //         subject: 'Assessment Invitation - {{jobTitle}}',
// //         body: `Dear {{name}},

// // You are invited to complete an assessment for the position of {{jobTitle}}.

// // Assessment Link: {{assessmentLink}}
// // Deadline: {{deadline}}

// // Please complete the assessment before the deadline.

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       shortlist: {
// //         subject: 'Application Status Update - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Thank you for your interest in the position of {{jobTitle}}.

// // {{statusMessage}}

// // {{feedback}}

// // Best regards,
// // Recruitment Team
// // AEPL`
// //       },
// //       offer: {
// //         subject: 'Job Offer - {{jobTitle}}',
// //         body: `Dear {{name}},

// // Congratulations! We are pleased to offer you the position of {{jobTitle}}.

// // Joining Details:
// // Date: {{joiningDate}}
// // Venue: {{venue}}
// // Required Documents: {{documents}}

// // Please confirm your acceptance.

// // Best regards,
// // HR Team
// // AEPL`
// //       }
// //     }
// //   };

// //   // Dynamic field configurations
// //   const fieldConfigurations = {
// //     employee: {
// //       onboarding: [
// //         { name: 'portalLink', label: 'Portal Link', type: 'url', required: true }
// //       ],
// //       meeting: [
// //         { name: 'meetingTitle', label: 'Meeting Title', type: 'text', required: true },
// //         { name: 'date', label: 'Date', type: 'date', required: true },
// //         { name: 'time', label: 'Time', type: 'time', required: true },
// //         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
// //       ],
// //       document: [
// //         { name: 'documentName', label: 'Document Name', type: 'text', required: true },
// //         { name: 'documentLink', label: 'Document Link', type: 'url', required: false },
// //         { name: 'submissionDate', label: 'Submission Date', type: 'date', required: true }
// //       ],
// //       announcement: [
// //         { name: 'announcementContent', label: 'Announcement Content', type: 'textarea', required: true },
// //         { name: 'link', label: 'Link', type: 'url', required: false }
// //       ]
// //     },
// //     candidate: {
// //       invitation: [
// //         // No additional fields needed - email and name are automatically included
// //       ],
// //       confirmation: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'reference', label: 'Reference Number', type: 'text', required: true }
// //       ],
// //       interview: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'date', label: 'Date', type: 'date', required: true },
// //         { name: 'time', label: 'Time', type: 'time', required: true },
// //         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
// //       ],
// //       assessment: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'assessmentLink', label: 'Assessment Link', type: 'url', required: true },
// //         { name: 'deadline', label: 'Deadline', type: 'datetime-local', required: true }
// //       ],
// //       shortlist: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'statusMessage', label: 'Status Message', type: 'textarea', required: true },
// //         { name: 'feedback', label: 'Feedback (Optional)', type: 'textarea', required: false }
// //       ],
// //       offer: [
// //         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
// //         { name: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
// //         { name: 'venue', label: 'Venue', type: 'text', required: true },
// //         { name: 'documents', label: 'Required Documents', type: 'textarea', required: true }
// //       ]
// //     }
// //   };

// //   const getCurrentData = () => {
// //     if (activeTab === 'hr') return hrGroup;
// //     if (activeTab === 'employees') return employees;
// //     if (activeTab === 'candidates') return candidates;
// //     if (activeTab === 'alumni') return alumniGroup;
// //     return [];
// //   };

// //   // Return the template object for current tab/type, or null
// //   const getCurrentTemplate = () => {
// //     const groupKey = isEmployeeTab ? 'employee' : 'candidate';
// //     const t = emailTemplates?.[groupKey]?.[emailType];
// //     return t || null;
// //   };

// //   // Patch rows helper using backend response.updated
// //   const patchRowsWithUpdated = (updated = []) => {
// //     if (!Array.isArray(updated) || updated.length === 0) return;
// //     const uMap = new Map(updated.map(u => [u.id, u]));
// //     const patch = (row) => {
// //       if (!uMap.has(row.id)) return row;
// //       const u = uMap.get(row.id) || {};
// //       const emailSent = u.emailSent === true ? true : (row.emailSent === true);
// //       return {
// //         ...row,
// //         ...u,
// //         emailSent,
// //         emailStatus: emailSent ? 'Sent' : (row.emailStatus || 'Not Sent'),
// //         lastEmailDate: emailSent ? (u.lastEmailDate || new Date().toISOString()) : (row.lastEmailDate || null)
// //       };
// //     };
// //     if (activeTab === 'hr') setHrGroup(prev => prev.map(patch));
// //     if (activeTab === 'employees') setEmployees(prev => prev.map(patch));
// //     if (activeTab === 'candidates') setCandidates(prev => prev.map(patch));
// //     if (activeTab === 'alumni') setAlumniGroup(prev => prev.map(patch));
// //   };

// //   const handleRecipientToggle = (person) => {
// //     setSelectedRecipients(prev => {
// //       const isSelected = prev.some(r => r.id === person.id);
// //       if (isSelected) {
// //         return prev.filter(r => r.id !== person.id);
// //       } else {
// //         return [...prev, person];
// //       }
// //     });
// //   };

// //   const handleSelectAll = () => {
// //     const currentData = getCurrentData();
// //     if (selectedRecipients.length === currentData.length) {
// //       setSelectedRecipients([]);
// //     } else {
// //       setSelectedRecipients([...currentData]);
// //     }
// //   };

// //   const handleSort = (field) => {
// //     if (sortField === field) {
// //       setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
// //     } else {
// //       setSortField(field);
// //       setSortDirection('asc');
// //     }
// //   };

// //   const toggleColumnVisibility = (column) => {
// //     setVisibleColumns(prev => ({
// //       ...prev,
// //       [column]: !prev[column]
// //     }));
// //   };

// //   const formatDate = (dateString) => {
// //     if (!dateString) return 'Never';
// //     const d = new Date(dateString);
// //     if (isNaN(d.getTime())) return 'Never';
// //     return d.toLocaleString(undefined, {
// //       year: 'numeric', month: 'short', day: '2-digit',
// //       hour: '2-digit', minute: '2-digit'
// //     });
// //   };

// //   const getEmailStatusBadge = (status) => {
// //     const statusClasses = {
// //       'Sent': 'email-sent',
// //       'Delivered': 'email-delivered', 
// //       'Opened': 'email-opened',
// //       'Not Sent': 'email-not-sent',
// //       'Failed': 'email-failed',
// //       'Bounced': 'email-bounced'
// //     };
    
// //     return (
// //       <span className={`email-status-badge ${statusClasses[status] || 'email-default'}`}>
// //         {status}
// //       </span>
// //     );
// //   };

// //   // Profile Status Badge
// //   const renderProfileStatusBadge = (status) => {
// //     if (!status) {
// //       return (
// //         <span style={{
// //           display: 'inline-block',
// //           padding: '4px 10px',
// //           borderRadius: '12px',
// //           fontSize: '12px',
// //           fontWeight: '600',
// //           textAlign: 'center',
// //           backgroundColor: '#6c757d',
// //           color: 'white'
// //         }}>
// //           Loading...
// //         </span>
// //       );
// //     }

// //     const backgroundColor = getStatusColor(status.onboarding_status);
// //     const displayText = status.onboarding_status ? 
// //       status.onboarding_status.replace('_', ' ').toUpperCase() : 'NOT STARTED';

// //     return (
// //       <span style={{
// //         display: 'inline-block',
// //         padding: '4px 10px',
// //         borderRadius: '12px',
// //         fontSize: '12px',
// //         fontWeight: '600',
// //         textAlign: 'center',
// //         backgroundColor: backgroundColor,
// //         color: 'white'
// //       }}>
// //         {displayText}
// //       </span>
// //     );
// //   };

// //   // Progress Bar
// //   const renderProgressBar = (status) => {
// //     if (!status) return null;
    
// //     const progressPercent = calculateProgressPercentage(status);
    
// //     return (
// //       <div style={{ width: '100%', marginTop: '4px' }}>
// //         <div style={{
// //           width: '100%',
// //           backgroundColor: '#e9ecef',
// //           borderRadius: '4px',
// //           height: '8px',
// //           overflow: 'hidden'
// //         }}>
// //           <div style={{
// //             width: `${progressPercent}%`,
// //             backgroundColor: progressPercent === 100 ? '#28a745' : '#007bff',
// //             height: '100%',
// //             borderRadius: '4px',
// //             transition: 'width 0.3s ease'
// //           }}>
// //           </div>
// //         </div>
// //         <small style={{ fontSize: '10px', color: '#6c757d' }}>
// //           {progressPercent}% Complete
// //         </small>
// //       </div>
// //     );
// //   };

// //   const handleDynamicFieldChange = (fieldName, value) => {
// //     setDynamicFields(prev => ({
// //       ...prev,
// //       [fieldName]: value
// //     }));
// //   };

// //   const replacePlaceholders = (text, fields, recipient) => {
// //     let result = text;
// //     Object.entries(fields).forEach(([key, value]) => {
// //       const placeholder = `{{${key}}}`;
// //       result = result.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
// //     });
    
// //     // Replace name placeholder with recipient name
// //     result = result.replace(/{{name}}/g, recipient?.name || '[name]');
// //     // Replace email placeholder with recipient email
// //     result = result.replace(/{{email}}/g, recipient?.email || '[email]');
    
// //     return result;
// //   };

// //   const getEmailTypeOptions = () => {
// //     if (isEmployeeTab) {
// //       return [
// //         { value: 'onboarding', label: 'Onboarding / Welcome' },
// //         { value: 'meeting', label: 'Meeting / Training / 1:1' },
// //         { value: 'document', label: 'Document / Policy Reminder' },
// //         { value: 'announcement', label: 'Company Announcements / Survey' }
// //       ];
// //     } else {
// //       return [
// //         { value: 'invitation', label: 'Candidate Invitation / Welcome' },
// //         { value: 'confirmation', label: 'Application Confirmation' },
// //         { value: 'interview', label: 'Interview Invitation / Reminder' },
// //         { value: 'assessment', label: 'Assessment / Test Invitation' },
// //         { value: 'shortlist', label: 'Shortlist / Rejection' },
// //         { value: 'offer', label: 'Offer / Joining Instructions' }
// //       ];
// //     }
// //   };

// //   const getCurrentFields = () => {
// //     return fieldConfigurations[isEmployeeTab ? 'employee' : 'candidate']?.[emailType] || [];
// //   };

// //   const handleSendEmail = async () => {
// //     if (selectedRecipients.length === 0 || !emailType) {
// //       toast.error('Please select recipients and email type');
// //       return;
// //     }

// //     const fields = getCurrentFields();
// //     const requiredFields = fields.filter(field => field.required);
// //     const missingFields = requiredFields.filter(field => !dynamicFields[field.name]);
    
// //     if (missingFields.length > 0) {
// //       toast.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
// //       return;
// //     }

// //     setIsLoading(true);
// //     toast.loading('Sending emails...', { id: 'sending' });
    
// //     try {
// //       const selectedIds = selectedRecipients.map(recipient => recipient.id);
// //       const emailData = {
// //         ids: selectedIds,
// //         emailType: emailType,
// //         dynamicFields: dynamicFields,
// //         customBody: emailBody !== emailTemplates[activeTab === 'employees' ? 'employee' : 'candidate'][emailType]?.body ? emailBody : null
// //       };
      
// //       // Send email using the appropriate service
// //       let resp;
// //       if (isEmployeeTab) {
// //         resp = await employeeService.sendEmployeeEmails(emailData);
// //       } else {
// //         resp = await candidateService.sendCandidateEmails(emailData);
// //       }

// //       // Backend might return explicit failure shape
// //       if (resp && resp.status === 'failed') {
// //         const msg = resp.message || 'Failed to send email for some recipients.';
// //         setFailedSendDetails(Array.isArray(resp.failed) ? resp.failed : []);
// //         toast.error(msg, { id: 'sending' });
// //         return;
// //       }

// //       // Apply updates only from backend `updated` array
// //       if (resp && Array.isArray(resp.updated) && resp.updated.length > 0) {
// //         patchRowsWithUpdated(resp.updated);
// //       }

// //       // Summary toast including partial failures if provided
// //       const updatedCount = Array.isArray(resp?.updated) ? resp.updated.length : 0;
// //       const failedCount = Array.isArray(resp?.failed) ? resp.failed.length : 0;
// //       const summary = failedCount > 0
// //         ? `Sent ${updatedCount}, Failed ${failedCount}`
// //         : (updatedCount > 0 ? `Successfully sent ${updatedCount} email${updatedCount > 1 ? 's' : ''}!` : 'No emails were sent.');

// //       toast.success(summary, { 
// //         id: 'sending',
// //         duration: 4000 
// //       });

// //       // If there are failures, show separate error toast and store details
// //       if (failedCount > 0) {
// //         const failedList = Array.isArray(resp.failed) ? resp.failed : [];
// //         toast.error('❌ Failed to send email for some recipients. See details below.');
// //         // Per-entry toast (limited to 10 to avoid spam)
// //         failedList.slice(0, 10).forEach((f) => {
// //           const id = f?.id || f?.userId || f?.employeeId || f?.candidateId || 'unknown';
// //           const reason = f?.error || f?.message || 'Unknown error';
// //           toast.error(`Failed to send to ID ${id}: ${reason}`);
// //         });
// //         setFailedSendDetails(failedList);
// //       } else {
// //         setFailedSendDetails([]);
// //       }
      
// //       // Reset form and refresh data
// //       setSelectedRecipients([]);
// //       setEmailType('');
// //       setDynamicFields({});
// //       setEmailBody('');
// //       setShowEmailComposer(false);
      
// //       // Refresh the data to update email status
// //       if (activeTab === 'employees') {
// //         fetchEmployees();
// //       } else {
// //         fetchCandidates();
// //       }
      
// //     } catch (error) {
// //       if (error?.status === 404) {
// //         const m = (error?.data && (error.data.message || error.data.error)) || 'Meeting not available';
// //         toast.error(m, { id: 'sending' });
// //       } else {
// //         const m = error?.message || 'Failed to send emails. Please try again.';
// //         toast.error(m, { id: 'sending' });
// //       }
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handlePreviewEmail = (recipient) => {
// //     if (!emailType) {
// //       toast.error('Please select an email type first');
// //       return;
// //     }
// //     setPreviewRecipient(recipient);
// //     setShowPreview(true);
// //   };

// //   // Enhanced table helper functions
// //   const getTableColumns = () => {
// //     // Always show a simple, professional 5-column set
// //     return [
// //       { key: 'name', label: 'Name', visible: true, className: 'em-col-name truncate', render: (v) => v || '-' },
// //       { key: 'email', label: 'Email', visible: true, className: 'em-col-email truncate', render: (v) => v || '-' },
// //       { key: 'role', label: 'Role', visible: true, className: 'em-col-role', render: (v) => v || '-' },
// //       { key: 'emailStatus', label: 'Email Status', visible: false, className: 'em-col-status', render: (v) => getEmailStatusBadge(v) },
// //       { key: 'lastEmailDate', label: 'Last Email', visible: false, className: 'em-col-last', render: (v) => formatDate(v) },
// //     ];
// //   };

// //   const getTableFilters = () => {
// //     if (activeTab === 'employees') {
// //       return {
// //         status: {
// //           label: 'Status',
// //           options: [
// //             { label: 'All', value: '' },
// //             { label: 'Active', value: 'Active' },
// //             { label: 'On Leave', value: 'On Leave' },
// //             { label: 'Terminated', value: 'Terminated' },
// //             { label: 'Rejected', value: 'Rejected' },
// //             { label: 'New', value: 'New' },
// //             { label: 'Interviewed', value: 'Interviewed' },
// //             { label: 'Offered', value: 'Offered' }
// //           ]
// //         },
// //         emailSent: {
// //           label: 'Email Status',
// //           options: [
// //             { label: 'All', value: '' },
// //             { label: 'Sent', value: 'true' },
// //             { label: 'Not Sent', value: 'false' }
// //           ]
// //         }
// //       };
// //     } else {
// //       return {
// //         emailSent: {
// //           label: 'Email Status',
// //           options: [
// //             { label: 'All', value: '' },
// //             { label: 'Sent', value: 'sent' },
// //             { label: 'Not Sent', value: 'not-sent' }
// //           ]
// //         }
// //       };
// //     }
// //   };

// //   const getTableActions = () => {
// //     const actions = [];
    
// //     if (selectedRecipients.length > 0) {
// //       actions.push({
// //         label: `Compose Email (${selectedRecipients.length})`,
// //         icon: '📧',
// //         onClick: () => setShowEmailComposer(true),
// //         variant: 'primary',
// //         size: 'sm'
// //       });
      
// //       if (emailType) {
// //         actions.push({
// //           label: 'Preview',
// //           icon: '👁️',
// //           onClick: () => setShowPreview(true),
// //           variant: 'secondary',
// //           size: 'sm'
// //         });
// //       }

// //       if (activeTab === 'candidates') {
// //         actions.push({
// //           label: 'Resend Invitation',
// //           icon: '🔁',
// //           onClick: async () => {
// //             setIsLoading(true);
// //             try {
// //               // Send one-by-one to ensure names are included per candidate
// //               for (const rec of selectedRecipients) {
// //                 await candidateService.resendInvitation({
// //                   emails: [rec.email],
// //                   firstName: rec.firstName || (rec.name?.split(' ')[0] || ''),
// //                   lastName: rec.lastName || (rec.name?.split(' ').slice(1).join(' ') || ''),
// //                   password: 'test1234',
// //                   loginLink: 'http://localhost:5173/login',
// //                   description: 'Welcome to AEPL',
// //                 });
// //               }
// //               toast.success(`Resent invitation to ${selectedRecipients.length} candidate${selectedRecipients.length > 1 ? 's' : ''}`);
// //             } catch (err) {
// //               console.error('Failed to resend invitations:', err);
// //               toast.error(err.message || 'Failed to resend invitations');
// //             } finally {
// //               setIsLoading(false);
// //             }
// //           },
// //           variant: 'primary',
// //           size: 'sm'
// //         });
// //       }
// //     }
    
// //     return actions;
// //   };

// //   const handleSearch = (query) => {
// //     setFilterText(query);
// //     setCurrentPage(0); // Reset to first page when search changes
// //   };

// //   const handleFilterChange = (newFilters) => {
// //     setFilters(newFilters);
// //     setCurrentPage(0); // Reset to first page when filters change
// //   };

// //   const handleSortChange = (key) => {
// //     const direction = sortField === key && sortDirection === 'asc' ? 'desc' : 'asc';
// //     setSortField(key);
// //     setSortDirection(direction);
// //     setCurrentPage(0); // Reset to first page when sorting changes
// //   };

// //   const handleRowSelect = (id) => {
// //     const person = getCurrentData().find(p => p.id === id);
// //     if (person) {
// //       handleRecipientToggle(person);
// //     }
// //   };

// //   const handleSelectAllRows = () => {
// //     handleSelectAll();
// //   };

// //   // Update email template when email type changes
// //   useEffect(() => {
// //     if (emailType) {
// //       const template = getCurrentTemplate();
// //       if (!template) {
// //         toast.error('Template not available for this selection');
// //       } else {
// //         // Pre-fill body using the first selected recipient if present
// //         const recipient = selectedRecipients[0] || null;
// //         const filled = replacePlaceholders(template.body || '', dynamicFields, recipient);
// //         setEmailBody(filled);
// //       }

// //       // Reset dynamic fields for the selected template
// //       const fields = getCurrentFields();
// //       const initialFields = {};
// //       fields.forEach(field => {
// //         initialFields[field.name] = '';
// //       });
// //       setDynamicFields(initialFields);
// //     }
// //   }, [emailType, activeTab]);

// //   return (
// //     <div className="email-management-panel">


// //       {Array.isArray(failedSendDetails) && failedSendDetails.length > 0 && (
// //         <div style={{ background: '#fff3f3', border: '1px solid #f5c2c7', color: '#842029', padding: 10, borderRadius: 6, marginBottom: 12 }}>
// //           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
// //             <strong>Failed to send email for {failedSendDetails.length} recipient(s)</strong>
// //             <button onClick={() => setFailedSendDetails([])} style={{ background: 'transparent', border: 'none', color: '#842029', cursor: 'pointer' }}>Dismiss</button>
// //           </div>
// //           <ul style={{ margin: '8px 0 0 18px' }}>
// //             {failedSendDetails.slice(0, 20).map((f, idx) => (
// //               <li key={idx}>
// //                 ID: {String(f.id || f.userId || f.employeeId || f.candidateId || 'unknown')} — {String(f.error || f.message || 'Unknown error')}
// //               </li>
// //             ))}
// //           </ul>
// //         </div>
// //       )}

// //       {/* Tab Navigation - Boxed like Employee Management */}
// //       <div
// //         className="tab-navigation"
// //         style={{
// //           background: 'var(--color-surface)',
// //           border: '1px solid var(--color-border)',
// //           borderRadius: 8,
// //           padding: 10,
// //           marginBottom: 16,
// //           display: 'flex',
// //           gap: 10,
// //           justifyContent: 'center',
// //           flexWrap: 'wrap'
// //         }}
// //       >
// //         <button
// //           className={`tab-button ${activeTab === 'hr' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('hr');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'hr' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'hr' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'hr' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           HR
// //         </button>
// //         <button
// //           className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('employees');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'employees' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'employees' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'employees' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           Employees
// //         </button>
// //         <button
// //           className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('candidates');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'candidates' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'candidates' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'candidates' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           Candidates
// //         </button>
// //         <button
// //           className={`tab-button ${activeTab === 'alumni' ? 'active' : ''}`}
// //           onClick={() => {
// //             setActiveTab('alumni');
// //             setSelectedRecipients([]);
// //             setEmailType('');
// //             setShowEmailComposer(false);
// //             setCurrentPage(0);
// //           }}
// //           style={{
// //             padding: '6px 10px',
// //             fontSize: 13,
// //             borderRadius: 6,
// //             background: activeTab === 'alumni' ? 'var(--color-primary)' : 'var(--color-surface)',
// //             color: activeTab === 'alumni' ? 'var(--color-on-primary)' : 'var(--color-text)',
// //             border: '1px solid var(--color-border)',
// //             fontWeight: 600,
// //             cursor: 'pointer',
// //             boxShadow: activeTab === 'alumni' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
// //           }}
// //         >
// //           Alumni
// //         </button>
// //       </div>

// //       {/* Enhanced Recipients Table */}
// //       {fetchError && (
// //         <div className="dashboard-message" style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', marginBottom: 10, padding: 10, borderRadius: 6 }}>
// //           {fetchError}
// //         </div>
// //       )}
// //       <EnhancedTable
// //         data={getCurrentData()}
// //         columns={getTableColumns()}
// //         onSearch={handleSearch}
// //         onFilter={handleFilterChange}
// //         onSort={handleSortChange}
// //         searchPlaceholder="Search by ID, name, email..."
// //         filters={getTableFilters()}
// //         sortConfig={{ key: sortField, direction: sortDirection }}
// //         loading={isLoading}
// //         selectedRows={selectedRecipients.map(r => r.id)}
// //         onRowSelect={handleRowSelect}
// //         onSelectAll={handleSelectAllRows}
// //         actions={getTableActions()}
// //       />

// //       {/* Pagination */}
// //       <div className="pagination-controls" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
// //         <select 
// //           className="page-size-select" 
// //           value={pageSize} 
// //           onChange={(e) => {
// //             setPageSize(parseInt(e.target.value));
// //             setCurrentPage(0);
// //           }}
// //           style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
// //         >
// //           <option value={10}>10 per page</option>
// //           <option value={20}>20 per page</option>
// //           <option value={50}>50 per page</option>
// //         </select>
        
// //         <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
// //           <button 
// //             onClick={() => setCurrentPage(currentPage - 1)} 
// //             disabled={currentPage === 0}
// //             style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', opacity: currentPage === 0 ? 0.6 : 1, cursor: currentPage === 0 ? 'not-allowed' : 'pointer' }}
// //           >
// //             Previous
// //           </button>
// //           <span>Page {currentPage + 1} of {totalPages} ({totalElements} total)</span>
// //           <button 
// //             onClick={() => setCurrentPage(currentPage + 1)} 
// //             disabled={currentPage >= totalPages - 1}
// //             style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', opacity: currentPage >= totalPages - 1 ? 0.6 : 1, cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
// //           >
// //             Next
// //           </button>
// //         </div>
// //       </div>

// //       {/* Compose Email Modal */}
// //       <EmailComposeModal
// //         open={showEmailComposer}
// //         onClose={() => setShowEmailComposer(false)}
// //         to={selectedRecipients.map(r => r.email).filter(Boolean).join(', ')}
// //         subject={(() => {
// //           const t = getCurrentTemplate();
// //           const recip = selectedRecipients[0] || previewRecipient;
// //           return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
// //         })()}
// //         message={emailBody}
// //         typeOptions={getEmailTypeOptions()}
// //         emailType={emailType}
// //         onChangeEmailType={(val) => setEmailType(val)}
// //         fields={getCurrentFields()}
// //         dynamicFields={dynamicFields}
// //         onChangeField={handleDynamicFieldChange}
// //         onSend={({ to, subject, message }) => {
// //           setEmailBody(message || '');
// //           if (!emailType) { toast.error('Please select an email type'); return; }
// //           if (selectedRecipients.length === 0) { toast.error('Please select at least one recipient'); return; }
// //           handleSendEmail();
// //           setShowEmailComposer(false);
// //         }}
// //       />

// //       {/* Email Preview Modal */}
// //       {showPreview && (
// //         <div className="email-composer-modal">
// //           <div className="modal-content">
// //             <div className="modal-header">
// //               <h3>Email Preview</h3>
// //               <button
// //                 className="close-btn"
// //                 onClick={() => setShowPreview(false)}
// //               >
// //                 ✕
// //               </button>
// //             </div>
// //             <div className="modal-body">
// //               {emailType && selectedRecipients.length > 0 ? (
// //                 <div className="preview-container">
// //                   <div className="preview-recipient-selector">
// //                     <label>Preview for:</label>
// //                     <select
// //                       value={previewRecipient?.id || selectedRecipients[0]?.id}
// //                       onChange={(e) => {
// //                         const recipient = selectedRecipients.find(r => r.id === parseInt(e.target.value));
// //                         setPreviewRecipient(recipient);
// //                       }}
// //                       className="form-select"
// //                     >
// //                       {selectedRecipients.map(recipient => (
// //                         <option key={recipient.id} value={recipient.id}>
// //                           {recipient.name} ({recipient.email})
// //                         </option>
// //                       ))}
// //                     </select>
// //                   </div>
                  
// //                   <div className="email-preview-content">
// //                     <div className="preview-field">
// //                       <strong>To:</strong> {(previewRecipient || selectedRecipients[0])?.email}
// //                     </div>
// //                     <div className="preview-field">
// //                       <strong>Subject:</strong> {(() => {
// //                         const t = getCurrentTemplate();
// //                         const recip = previewRecipient || selectedRecipients[0] || null;
// //                         return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
// //                       })()}
// //                     </div>
// //                     <div className="preview-field">
// //                       <strong>Body:</strong>
// //                       <div className="preview-body-content">
// //                         {replacePlaceholders(emailBody, dynamicFields, previewRecipient || selectedRecipients[0])}
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </div>
// //               ) : (
// //                 <div className="preview-empty">
// //                   <p>Please select recipients and email type to preview</p>
// //                 </div>
// //               )}
// //             </div>
// //             <div className="modal-footer">
// //               <button
// //                 className="cancel-btn"
// //                 onClick={() => setShowPreview(false)}
// //               >
// //                 Close
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Email Composer Modal */}
// //       {showEmailComposer && (
// //         <div className="email-composer-modal">
// //           <div className="modal-content">
// //             <div className="modal-header">
// //               <h3>Compose Email to {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? 's' : ''}</h3>
// //               <button
// //                 className="close-btn"
// //                 onClick={() => setShowEmailComposer(false)}
// //               >
// //                 ✕
// //               </button>
// //             </div>

// //             <div className="modal-body">
// //               {/* Email Type Selection */}
// //               <div className="form-group">
// //                 <label>Email Type *</label>
// //                 <select
// //                   value={emailType}
// //                   onChange={(e) => setEmailType(e.target.value)}
// //                   className="form-select"
// //                 >
// //                   <option value="">Choose email type...</option>
// //                   {getEmailTypeOptions().map(option => (
// //                     <option key={option.value} value={option.value}>
// //                       {option.label}
// //                     </option>
// //                   ))}
// //                 </select>
// //               </div>

// //               {/* Dynamic Fields */}
// //               {emailType && (
// //                 <div className="dynamic-fields">
// //                   <h4>Email Details</h4>
// //                   {getCurrentFields().map(field => (
// //                     <div key={field.name} className="form-group">
// //                       <label>
// //                         {field.label} {field.required && <span className="required">*</span>}
// //                       </label>
// //                       {field.type === 'textarea' ? (
// //                         <textarea
// //                           value={dynamicFields[field.name] || ''}
// //                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
// //                           placeholder={`Enter ${field.label.toLowerCase()}`}
// //                           rows={3}
// //                           className="form-textarea"
// //                         />
// //                       ) : (
// //                         <input
// //                           type={field.type}
// //                           value={dynamicFields[field.name] || ''}
// //                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
// //                           placeholder={`Enter ${field.label.toLowerCase()}`}
// //                           className="form-input"
// //                         />
// //                       )}
// //                     </div>
// //                   ))}
// //                 </div>
// //               )}

// //               {/* Email Preview */}
// //               {emailType && (
// //                 <div className="email-preview">
// //                   <h4>Email Preview</h4>
// //                   <div className="preview-subject">
// //                     <strong>Subject:</strong> {(() => {
// //                       const t = getCurrentTemplate();
// //                       const recip = selectedRecipients[0] || null;
// //                       return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
// //                     })()}
// //                   </div>
// //                   <div className="preview-body">
// //                     <label>Email Body:</label>
// //                     <textarea
// //                       value={emailBody}
// //                       onChange={(e) => setEmailBody(e.target.value)}
// //                       rows={10}
// //                       className="email-body-textarea"
// //                     />
// //                   </div>
// //                   <div className="preview-note">
// //                     <small>
// //                       📝 Placeholders like {`{{name}}`} will be replaced with actual values for each recipient.
// //                     </small>
// //                   </div>
// //                 </div>
// //               )}
// //             </div>

// //             <div className="modal-footer">
// //               <button
// //                 className="cancel-btn"
// //                 onClick={() => setShowEmailComposer(false)}
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 className={`send-btn ${isLoading ? 'loading' : ''}`}
// //                 onClick={handleSendEmail}
// //                 disabled={isLoading || !emailType}
// //               >
// //                 {isLoading ? (
// //                   <>
// //                     <span className="loading-spinner"></span>
// //                     Sending...
// //                   </>
// //                 ) : (
// //                   `📤 Send to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`
// //                 )}
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default EmailManagementPanel;


// import React, { useState, useEffect, useCallback } from 'react';
// import EnhancedTable from './EnhancedTable';
// import EmailComposeModal from './EmailComposeModal';
// import { getProfileStatus, calculateProgressPercentage, getStatusColor } from '../../services/profileService';
// import searchIcon from '../../assets/icons/search.svg';
// import filterIcon from '../../assets/icons/filter.svg';
// import settingsIcon from '../../assets/icons/settings.svg';
// import { employeeService, candidateService, emailManagementService } from '../../services/apiService';
// import toast from '../../services/toastService';
// import useEventSource from '../../lib/useEventSource';


// const EmailManagementPanel = () => {
//   const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'hr' | 'alumni' | 'candidates'
//   const [selectedRecipients, setSelectedRecipients] = useState([]);
//   const [emailType, setEmailType] = useState('');
//   const [dynamicFields, setDynamicFields] = useState({});
//   const [emailBody, setEmailBody] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [showEmailComposer, setShowEmailComposer] = useState(false);
//   const [sortField, setSortField] = useState('uploadedAt');
//   const [sortDirection, setSortDirection] = useState('desc');
//   const [filterText, setFilterText] = useState('');
//   // External toolbar triggers for EnhancedTable (moved inside component)
//   const [filterTrig, setFilterTrig] = useState(0);
//   const [settingsTrig, setSettingsTrig] = useState(0);
//   const [resetTrig, setResetTrig] = useState(0);
//   const [visibleColumns, setVisibleColumns] = useState({
//     select: true,
//     name: true,
//     email: true,
//     designation: true,
//     status: true,
//     emailStatus: true,
//     profileStatus: true,
//     lastEmailDate: true
//   });
//   const [showPreview, setShowPreview] = useState(false);
//   const [previewRecipient, setPreviewRecipient] = useState(null);
  
//   // Real data state
//   const [employees, setEmployees] = useState([]);
//   const [candidates, setCandidates] = useState([]);
//   const [hrGroup, setHrGroup] = useState([]);
//   const [alumniGroup, setAlumniGroup] = useState([]);
//   const [fetchError, setFetchError] = useState('');
//   const [currentPage, setCurrentPage] = useState(0);
//   const [pageSize, setPageSize] = useState(10);
//   const [totalPages, setTotalPages] = useState(0);
//   const [totalElements, setTotalElements] = useState(0);
//   const [filters, setFilters] = useState({ status: '', emailSent: '', profileStatus: '' });
//   const [statusMap, setStatusMap] = useState({}); // userId → profile status
//   const [failedSendDetails, setFailedSendDetails] = useState([]); // [{id, error}]

//   // Helper: whether current tab is any employee-type tab
//   const isEmployeeTab = activeTab !== 'candidates';

//   // Subscribe to email-status-updated SSE events and patch rows
//   useEventSource('email-status-updated', (e) => {
//     try {
//       const payload = JSON.parse(e.data); // { email, emailSent, emailSentAt, id? }
//       try { console.debug('SSE email-status-updated payload:', payload); } catch(e){}
//       const email = payload.email;
//       const patch = { emailSent: payload.emailSent, lastEmailDate: payload.emailSentAt || payload.emailSentAt };

//       const patchList = (prevList) => prevList.map(row => (row.email === email ? { ...row, ...patch } : row));

//       setEmployees(prev => patchList(prev));
//       setCandidates(prev => patchList(prev));
//       setHrGroup(prev => patchList(prev));
//       setAlumniGroup(prev => patchList(prev));
//       // Also refresh authoritative data for the active tab to avoid stale rows
//       if (activeTab === 'employees') fetchEmployees();
//       else if (activeTab === 'candidates') fetchCandidates();
//       else fetchRecipientGroups();
//     } catch (err) {
//       console.error('Failed to handle email-status-updated SSE', err);
//     }
//   });

//   // Fetch employees from API (legacy path)
//   const fetchEmployees = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       const params = {
//         page: currentPage,
//         size: pageSize,
//         sortBy: sortField,
//         direction: sortDirection
//       };
      
//       if (filterText) params.search = filterText;
//       if (filters.status) params.status = filters.status;
//       if (filters.emailSent) params.emailSent = filters.emailSent;
//       // Role filter by active tab: Employees, HR, Alumni
//       if (activeTab === 'employees') params.role = 'EMPLOYEE';
//       if (activeTab === 'hr') params.role = 'HR';
//       if (activeTab === 'alumni') params.role = 'EX_EMPLOYEE';

//       const data = await employeeService.getEmployees(params);
      
//       // Transform data to match expected format
//       const transformedEmployees = (data.content || []).map(emp => ({
//         id: emp.id,
//         name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
//         email: emp.email,
//         designation: emp.designation || 'N/A',
//         status: emp.status || 'Active',
//         emailStatus: emp.emailSent ? 'Sent' : 'Not Sent',
//   // Prefer precise timestamp from backend if available
//   // lastEmailDate: emp.emailSentAt || emp.lastEmailDate || (emp.emailSent ? emp.uploadedAt : null),
//         role: emp.role || emp.loginRole || (activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'hr' ? 'HR' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : ''),
//         firstName: emp.firstName,
//         lastName: emp.lastName,
//         phoneNumber: emp.phoneNumber,
//         uploadedAt: emp.uploadedAt,
//   // emailSent: emp.emailSent
//       }));
      
//       setEmployees(transformedEmployees);
//       setTotalPages(data.totalPages || 0);
//       setTotalElements(data.totalElements || 0);

//       // Fetch profile status for all employees
//       if (transformedEmployees.length > 0) {
//         const statusPromises = transformedEmployees.map(employee =>
//           getProfileStatus(employee.id)
//             .then(status => ({ userId: employee.id, status }))
//             .catch(err => ({ userId: employee.id, status: null }))
//         );
//         const statusResults = await Promise.all(statusPromises);
//         const map = {};
//         statusResults.forEach(s => { map[s.userId] = s.status; });
//         setStatusMap(prevMap => ({ ...prevMap, ...map }));
//       }
//     } catch (err) {
//       console.error('Error fetching employees:', err);
//       const errorMessage = err.message.includes("You don't have permission") 
//         ? "You don't have permission to view this data."
//         : 'Failed to fetch employees';
//       toast.error(errorMessage);
//       setEmployees([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters, activeTab]);

//   // Fetch candidates from API (legacy path)
//   const fetchCandidates = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       const params = {
//         page: currentPage,
//         size: pageSize,
//         sortBy: sortField,
//         direction: sortDirection
//       };
      
//       if (filterText) params.search = filterText;
//       if (filters.emailSent) {
//         if (filters.emailSent === 'sent') {
//           params.status = 'true';
//         } else if (filters.emailSent === 'not-sent') {
//           params.emailSentFilter = 'not-sent';
//         }
//       }

//       const data = await candidateService.getCandidates(params);
      
//       // Transform data to match expected format
//       const transformedCandidates = (data.content || []).map(candidate => ({
//         id: candidate.id,
//         name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email,
//         email: candidate.email,
//         jobTitle: candidate.jobTitle || 'N/A',
//         designation: candidate.jobTitle || 'N/A',
//         status: candidate.status || 'Applied',
//         emailStatus: candidate.emailSent ? 'Sent' : 'Not Sent',
//         lastEmailDate: candidate.emailSentAt || candidate.lastEmailDate || (candidate.emailSent ? candidate.uploadedAt : null),
//   role: candidate.role || 'CANDIDATE',
//         firstName: candidate.firstName,
//         lastName: candidate.lastName,
//         phoneNumber: candidate.phoneNumber,
//         uploadedAt: candidate.uploadedAt,
//         emailSent: candidate.emailSent
//       }));
      
//       setCandidates(transformedCandidates);
//       setTotalPages(data.totalPages || 0);
//       setTotalElements(data.totalElements || 0);

//       // Fetch profile status for all candidates
//       if (transformedCandidates.length > 0) {
//         const statusPromises = transformedCandidates.map(candidate =>
//           getProfileStatus(candidate.id)
//             .then(status => ({ userId: candidate.id, status }))
//             .catch(err => ({ userId: candidate.id, status: null }))
//         );
//         const statusResults = await Promise.all(statusPromises);
//         const map = {};
//         statusResults.forEach(s => { map[s.userId] = s.status; });
//         setStatusMap(prevMap => ({ ...prevMap, ...map }));
//       }
//     } catch (err) {
//       console.error('Error fetching candidates:', err);
//       toast.error('Failed to fetch candidates');
//       setCandidates([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [currentPage, pageSize, sortField, sortDirection, filterText, filters]);

//   // New: Fetch only the active group's recipients via backend per-group endpoint
//   const fetchRecipientGroups = useCallback(async () => {
//     setIsLoading(true);
//     setFetchError('');
//     try {
//       const list = await emailManagementService.getGroupFromBackend(activeTab);
//       const roleLabel = activeTab === 'hr' ? 'HR' : activeTab === 'employees' ? 'EMPLOYEE' : activeTab === 'alumni' ? 'EX_EMPLOYEE' : 'CANDIDATE';
//       const mapToRow = (u) => ({
//         id: u.id,
//         name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
//         email: u.email,
//         role: roleLabel,
//   // Prefer backend-provided flags if available
//   // emailStatus: u.emailSent ? 'Sent' : 'Not Sent',
//   // lastEmailDate: u.emailSentAt || u.lastEmailDate || (u.emailSent ? u.uploadedAt : null),
//   // emailSent: !!u.emailSent,
//         firstName: u.firstName || '',
//         lastName: u.lastName || '',
//       });

//   const rows = (list || []).map(mapToRow);
//   try { console.debug('fetchRecipientGroups rows:', rows.slice(0,10)); } catch(e){}

//   if (activeTab === 'hr') setHrGroup(rows);
//   if (activeTab === 'employees') setEmployees(rows);
//   if (activeTab === 'candidates') setCandidates(rows);
//   if (activeTab === 'alumni') setAlumniGroup(rows);

//       setTotalPages(1);
//       setTotalElements(rows.length);
//     } catch (err) {
//       console.error('Error fetching recipient groups:', err);
//       setFetchError(err.message || 'Failed to fetch recipient groups');
//       toast.error(err.message || 'Failed to fetch recipient groups');
//       if (activeTab === 'hr') setHrGroup([]);
//       if (activeTab === 'employees') setEmployees([]);
//       if (activeTab === 'candidates') setCandidates([]);
//       if (activeTab === 'alumni') setAlumniGroup([]);
//       setTotalPages(0);
//       setTotalElements(0);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [activeTab]);

//   // Fetch data when tab changes - use new grouped fetch
//   useEffect(() => {
//     fetchRecipientGroups();
//   }, [activeTab, fetchRecipientGroups]);

//   // Email templates
//   const emailTemplates = {
//     employee: {
//       onboarding: {
//         subject: 'Welcome to AEPL - Onboarding Instructions',
//         body: `Dear {{name}},

// Welcome to AEPL! We're excited to have you join our team.

// Please access your onboarding portal using the link below:
// Portal Link: {{portalLink}}

// If you have any questions, please don't hesitate to reach out.

// Best regards,
// HR Team
// AEPL`
//       },
//       meeting: {
//         subject: 'Meeting Invitation - {{meetingTitle}}',
//         body: `Dear {{name}},

// You are invited to attend the following meeting:

// Date: {{date}}
// Time: {{time}}
// Venue/Platform: {{venue}}

// Please confirm your attendance.

// Best regards,
// HR Team
// AEPL`
//       },
//       document: {
//         subject: 'Document Submission Reminder',
//         body: `Dear {{name}},

// This is a reminder to submit the required document:

// Document: {{documentName}}
// Submission Deadline: {{submissionDate}}
// Document Link: {{documentLink}}

// Please ensure timely submission.

// Best regards,
// HR Team
// AEPL`
//       },
//       announcement: {
//         subject: 'Company Announcement',
//         body: `Dear {{name}},

// We have an important company update to share:

// {{announcementContent}}

// Link: {{link}}

// Thank you for your attention.

// Best regards,
// Management Team
// AEPL`
//       }
//     },
//     candidate: {
//       invitation: {
//         subject: 'Welcome to AEPL - Your Account Details',
//         body: `Dear {{name}},

// Welcome to AEPL! We're excited to have you join our recruitment process.

// Your login credentials for the HRMS portal are:
// Email: {{email}}
// Password: test1234

// Please login to complete your profile and application process:
// Login Link: http://localhost:5173/login

// For security reasons, please change your password after your first login.

// If you have any questions, please don't hesitate to contact us.

// Best regards,
// HR Team
// AEPL`
//       },
//       confirmation: {
//         subject: 'Application Confirmation - {{jobTitle}}',
//         body: `Dear {{name}},

// Thank you for your application for the position of {{jobTitle}}.

// Your application reference number is: {{reference}}

// We will review your application and contact you soon.

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       interview: {
//         subject: 'Interview Invitation - {{jobTitle}}',
//         body: `Dear {{name}},

// Congratulations! You have been shortlisted for the position of {{jobTitle}}.

// Interview Details:
// Date: {{date}}
// Time: {{time}}
// Venue/Platform: {{venue}}

// Please confirm your availability.

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       assessment: {
//         subject: 'Assessment Invitation - {{jobTitle}}',
//         body: `Dear {{name}},

// You are invited to complete an assessment for the position of {{jobTitle}}.

// Assessment Link: {{assessmentLink}}
// Deadline: {{deadline}}

// Please complete the assessment before the deadline.

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       shortlist: {
//         subject: 'Application Status Update - {{jobTitle}}',
//         body: `Dear {{name}},

// Thank you for your interest in the position of {{jobTitle}}.

// {{statusMessage}}

// {{feedback}}

// Best regards,
// Recruitment Team
// AEPL`
//       },
//       offer: {
//         subject: 'Job Offer - {{jobTitle}}',
//         body: `Dear {{name}},

// Congratulations! We are pleased to offer you the position of {{jobTitle}}.

// Joining Details:
// Date: {{joiningDate}}
// Venue: {{venue}}
// Required Documents: {{documents}}

// Please confirm your acceptance.

// Best regards,
// HR Team
// AEPL`
//       }
//     }
//   };

//   // Upsert authoritative records into current lists to ensure UI reflects server state immediately
//   const upsertRowsFromRecords = (records = []) => {
//     if (!Array.isArray(records) || records.length === 0) return;

//     const normalizeRec = (r = {}) => {
//       const id = r.id || r.userId || r.employeeId || r.candidateId || null;
//       const email = r.email || r.emailAddress || r.username || null;
//       const lastEmailDate = r.lastEmailDate || r.emailSentAt || r.email_sent_at || r.last_email_date || (r.meta && (r.meta.lastEmailDate || r.meta.last_email_date)) || null;
//       const emailSent = (r.emailSent === true) || (r.email_sent === true) || Boolean(lastEmailDate) || false;
//       return { ...r, id, email, lastEmailDate, emailSent, emailStatus: emailSent ? 'Sent' : (r.emailStatus || 'Not Sent') };
//     };

//     const normalized = records.map(normalizeRec);

//     const applyUpsert = (currentList, setter) => {
//       setter(prev => {
//         const prevArr = Array.isArray(prev) ? prev : [];
//         const byId = new Map(normalized.map(r => [String(r.id), r]));

//         // Replace existing items in-place
//         const next = prevArr.map(item => {
//           const key = item && item.id !== undefined && item.id !== null ? String(item.id) : null;
//           if (key && byId.has(key)) {
//             const rec = byId.get(key);
//             byId.delete(key);
//             return { ...item, ...rec };
//           }
//           return item;
//         });

//         // Any remaining records are new — prepend them so they are visible
//         const newRecords = Array.from(byId.values());
//         if (newRecords.length > 0) {
//           return [...newRecords, ...next];
//         }
//         return next;
//       });
//     };

//     try {
//       applyUpsert(hrGroup, setHrGroup);
//       applyUpsert(employees, setEmployees);
//       applyUpsert(candidates, setCandidates);
//       applyUpsert(alumniGroup, setAlumniGroup);
//     } catch (e) {
//       console.debug('upsertRowsFromRecords failed', e);
//     }
//   };

//   // Dynamic field configurations
//   const fieldConfigurations = {
//     employee: {
//       onboarding: [
//         { name: 'portalLink', label: 'Portal Link', type: 'url', required: true }
//       ],
//       meeting: [
//         { name: 'meetingTitle', label: 'Meeting Title', type: 'text', required: true },
//         { name: 'date', label: 'Date', type: 'date', required: true },
//         { name: 'time', label: 'Time', type: 'time', required: true },
//         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
//       ],
//       document: [
//         { name: 'documentName', label: 'Document Name', type: 'text', required: true },
//         { name: 'documentLink', label: 'Document Link', type: 'url', required: false },
//         { name: 'submissionDate', label: 'Submission Date', type: 'date', required: true }
//       ],
//       announcement: [
//         { name: 'announcementContent', label: 'Announcement Content', type: 'textarea', required: true },
//         { name: 'link', label: 'Link', type: 'url', required: false }
//       ]
//     },
//     candidate: {
//       invitation: [
//         // No additional fields needed - email and name are automatically included
//       ],
//       confirmation: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'reference', label: 'Reference Number', type: 'text', required: true }
//       ],
//       interview: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'date', label: 'Date', type: 'date', required: true },
//         { name: 'time', label: 'Time', type: 'time', required: true },
//         { name: 'venue', label: 'Venue/Platform', type: 'text', required: true }
//       ],
//       assessment: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'assessmentLink', label: 'Assessment Link', type: 'url', required: true },
//         { name: 'deadline', label: 'Deadline', type: 'datetime-local', required: true }
//       ],
//       shortlist: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'statusMessage', label: 'Status Message', type: 'textarea', required: true },
//         { name: 'feedback', label: 'Feedback (Optional)', type: 'textarea', required: false }
//       ],
//       offer: [
//         { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
//         { name: 'joiningDate', label: 'Joining Date', type: 'date', required: true },
//         { name: 'venue', label: 'Venue', type: 'text', required: true },
//         { name: 'documents', label: 'Required Documents', type: 'textarea', required: true }
//       ]
//     }
//   };

//   const getCurrentData = () => {
//     if (activeTab === 'hr') return hrGroup;
//     if (activeTab === 'employees') return employees;
//     if (activeTab === 'candidates') return candidates;
//     if (activeTab === 'alumni') return alumniGroup;
//     return [];
//   };

//   // Return the template object for current tab/type, or null
//   const getCurrentTemplate = () => {
//     const groupKey = isEmployeeTab ? 'employee' : 'candidate';
//     const t = emailTemplates?.[groupKey]?.[emailType];
//     return t || null;
//   };

//   // Patch rows helper using backend response.updated
//   const patchRowsWithUpdated = (updated = []) => {
//     if (!Array.isArray(updated) || updated.length === 0) return;
//     // Normalize incoming update objects to known fields and build two maps: by id and by email (fallback)
//     const normalize = (u = {}) => {
//       if (!u) return null;
//       const id = u.id || u.userId || u.employeeId || u.candidateId || null;
//       const email = u.email || u.emailAddress || u.email_address || u.username || null;
//       const lastEmailDate = u.lastEmailDate || u.emailSentAt || u.email_sent_at || u.sentAt || u.sent_at || u.last_email_date || (u.meta && (u.meta.lastEmailDate || u.meta.last_email_date)) || null;
//       const emailSent = (u.emailSent === true) || (u.email_sent === true) || (u.sent === true) || Boolean(lastEmailDate) || false;
//       const emailStatus = emailSent ? 'Sent' : (u.emailStatus || u.status || 'Not Sent');
//       return {
//         ...u,
//         id,
//         email,
//         emailSent,
//         emailStatus,
//         lastEmailDate
//       };
//     };

//     const uMapById = new Map();
//     const uMapByEmail = new Map();
//     updated.forEach(raw => {
//       const u = normalize(raw);
//       if (!u) return;
//       if (u.id !== undefined && u.id !== null) uMapById.set(String(u.id), u);
//       if (u.email) uMapByEmail.set(String(u.email).toLowerCase(), u);
//     });

//     const patch = (row) => {
//       const byId = row.id !== undefined && uMapById.has(String(row.id)) ? uMapById.get(String(row.id)) : null;
//       const byEmail = row.email ? uMapByEmail.get(String(row.email).toLowerCase()) : null;
//       const u = byId || byEmail;
//       if (!u) return row;
//       // Use normalized fields
//       const emailSent = u.emailSent === true ? true : (row.emailSent === true);
//       return {
//         ...row,
//         ...u,
//         emailSent,
//         emailStatus: emailSent ? 'Sent' : (row.emailStatus || 'Not Sent'),
//         lastEmailDate: emailSent ? (u.lastEmailDate || new Date().toISOString()) : (row.lastEmailDate || null)
//       };
//     };

//     // Apply patches using current state and log changes for debugging
//     try {
//       const applyAndLog = (currentList, setter, name) => {
//         if (!Array.isArray(currentList) || currentList.length === 0) return;
//         const next = currentList.map(patch);
//         const changed = [];
//         for (let i = 0; i < next.length; i++) {
//           const a = JSON.stringify(currentList[i] || {});
//           const b = JSON.stringify(next[i] || {});
//           if (a !== b) changed.push({ before: currentList[i], after: next[i] });
//         }
//         if (changed.length > 0) {
//           console.debug(`patchRowsWithUpdated: ${name} changed`, changed.slice(0, 10));
//           setter(next);
//         }
//       };

//       applyAndLog(hrGroup, setHrGroup, 'hrGroup');
//       applyAndLog(employees, setEmployees, 'employees');
//       applyAndLog(candidates, setCandidates, 'candidates');
//       applyAndLog(alumniGroup, setAlumniGroup, 'alumniGroup');
//     } catch (err) {
//       console.error('Error applying patched rows', err);
//       // fallback to previous behavior
//       if (activeTab === 'hr') setHrGroup(prev => prev.map(patch));
//       if (activeTab === 'employees') setEmployees(prev => prev.map(patch));
//       if (activeTab === 'candidates') setCandidates(prev => prev.map(patch));
//       if (activeTab === 'alumni') setAlumniGroup(prev => prev.map(patch));
//     }
//   };

//   const handleRecipientToggle = (person) => {
//     setSelectedRecipients(prev => {
//       const isSelected = prev.some(r => r.id === person.id);
//       if (isSelected) {
//         return prev.filter(r => r.id !== person.id);
//       } else {
//         return [...prev, person];
//       }
//     });
//   };

//   const handleSelectAll = () => {
//     const currentData = getCurrentData();
//     if (selectedRecipients.length === currentData.length) {
//       setSelectedRecipients([]);
//     } else {
//       setSelectedRecipients([...currentData]);
//     }
//   };

//   const handleSort = (field) => {
//     if (sortField === field) {
//       setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortField(field);
//       setSortDirection('asc');
//     }
//   };

//   const toggleColumnVisibility = (column) => {
//     setVisibleColumns(prev => ({
//       ...prev,
//       [column]: !prev[column]
//     }));
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return 'Never';
//     const d = new Date(dateString);
//     if (isNaN(d.getTime())) return 'Never';
//     return d.toLocaleString(undefined, {
//       year: 'numeric', month: 'short', day: '2-digit',
//       hour: '2-digit', minute: '2-digit'
//     });
//   };

//   const getEmailStatusBadge = (status) => {
//     const statusClasses = {
//       'Sent': 'email-sent',
//       'Delivered': 'email-delivered', 
//       'Opened': 'email-opened',
//       'Not Sent': 'email-not-sent',
//       'Failed': 'email-failed',
//       'Bounced': 'email-bounced'
//     };
    
//     return (
//       <span className={`email-status-badge ${statusClasses[status] || 'email-default'}`}>
//         {status}
//       </span>
//     );
//   };

//   // Profile Status Badge
//   const renderProfileStatusBadge = (status) => {
//     if (!status) {
//       return (
//         <span style={{
//           display: 'inline-block',
//           padding: '4px 10px',
//           borderRadius: '12px',
//           fontSize: '12px',
//           fontWeight: '600',
//           textAlign: 'center',
//           backgroundColor: '#6c757d',
//           color: 'white'
//         }}>
//           Loading...
//         </span>
//       );
//     }

//     const backgroundColor = getStatusColor(status.onboarding_status);
//     const displayText = status.onboarding_status ? 
//       status.onboarding_status.replace('_', ' ').toUpperCase() : 'NOT STARTED';

//     return (
//       <span style={{
//         display: 'inline-block',
//         padding: '4px 10px',
//         borderRadius: '12px',
//         fontSize: '12px',
//         fontWeight: '600',
//         textAlign: 'center',
//         backgroundColor: backgroundColor,
//         color: 'white'
//       }}>
//         {displayText}
//       </span>
//     );
//   };

//   // Progress Bar
//   const renderProgressBar = (status) => {
//     if (!status) return null;
    
//     const progressPercent = calculateProgressPercentage(status);
    
//     return (
//       <div style={{ width: '100%', marginTop: '4px' }}>
//         <div style={{
//           width: '100%',
//           backgroundColor: '#e9ecef',
//           borderRadius: '4px',
//           height: '8px',
//           overflow: 'hidden'
//         }}>
//           <div style={{
//             width: `${progressPercent}%`,
//             backgroundColor: progressPercent === 100 ? '#28a745' : '#007bff',
//             height: '100%',
//             borderRadius: '4px',
//             transition: 'width 0.3s ease'
//           }}>
//           </div>
//         </div>
//         <small style={{ fontSize: '10px', color: '#6c757d' }}>
//           {progressPercent}% Complete
//         </small>
//       </div>
//     );
//   };

//   const handleDynamicFieldChange = (fieldName, value) => {
//     setDynamicFields(prev => ({
//       ...prev,
//       [fieldName]: value
//     }));
//   };

//   const replacePlaceholders = (text, fields, recipient) => {
//     let result = text;
//     Object.entries(fields).forEach(([key, value]) => {
//       const placeholder = `{{${key}}}`;
//       result = result.replace(new RegExp(placeholder, 'g'), value || `[${key}]`);
//     });
    
//     // Replace name placeholder with recipient name
//     result = result.replace(/{{name}}/g, recipient?.name || '[name]');
//     // Replace email placeholder with recipient email
//     result = result.replace(/{{email}}/g, recipient?.email || '[email]');
    
//     return result;
//   };

//   const getEmailTypeOptions = () => {
//     if (isEmployeeTab) {
//       return [
//         { value: 'onboarding', label: 'Onboarding / Welcome' },
//         { value: 'meeting', label: 'Meeting / Training / 1:1' },
//         { value: 'document', label: 'Document / Policy Reminder' },
//         { value: 'announcement', label: 'Company Announcements / Survey' }
//       ];
//     } else {
//       return [
//         { value: 'invitation', label: 'Candidate Invitation / Welcome' },
//         { value: 'confirmation', label: 'Application Confirmation' },
//         { value: 'interview', label: 'Interview Invitation / Reminder' },
//         { value: 'assessment', label: 'Assessment / Test Invitation' },
//         { value: 'shortlist', label: 'Shortlist / Rejection' },
//         { value: 'offer', label: 'Offer / Joining Instructions' }
//       ];
//     }
//   };

//   const getCurrentFields = () => {
//     return fieldConfigurations[isEmployeeTab ? 'employee' : 'candidate']?.[emailType] || [];
//   };

//   const handleSendEmail = async () => {
//     if (selectedRecipients.length === 0 || !emailType) {
//       toast.error('Please select recipients and email type');
//       return;
//     }

//     const fields = getCurrentFields();
//     const requiredFields = fields.filter(field => field.required);
//     const missingFields = requiredFields.filter(field => !dynamicFields[field.name]);
    
//     if (missingFields.length > 0) {
//       toast.error(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
//       return;
//     }

//     setIsLoading(true);
//     toast.loading('Sending emails...', { id: 'sending' });
    
//     try {
//       const selectedIds = selectedRecipients.map(recipient => recipient.id);
//       const emailData = {
//         ids: selectedIds,
//         emailType: emailType,
//         dynamicFields: dynamicFields,
//         customBody: emailBody !== emailTemplates[activeTab === 'employees' ? 'employee' : 'candidate'][emailType]?.body ? emailBody : null
//       };
      
//       // Send email using the appropriate service
//       let resp;
//       if (isEmployeeTab) {
//         resp = await employeeService.sendEmployeeEmails(emailData);
//       } else {
//         resp = await candidateService.sendCandidateEmails(emailData);
//       }
//       // debug: inspect backend response when sending emails
//       // console.debug kept intentionally; remove in production
//       try { console.debug('Email send response:', resp); } catch(e){}

//       // Backend might return explicit failure shape
//       if (resp && resp.status === 'failed') {
//         const msg = resp.message || 'Failed to send email for some recipients.';
//         setFailedSendDetails(Array.isArray(resp.failed) ? resp.failed : []);
//         toast.error(msg, { id: 'sending' });
//         return;
//       }

//       // Apply updates only from backend `updated` array
//       if (resp && Array.isArray(resp.updated) && resp.updated.length > 0) {
//         patchRowsWithUpdated(resp.updated);
//       } else {
//         // If backend did not return updated details, fetch the authoritative profile for each recipient
//         // and patch the rows with the server-side values (avoids stale UI when backend field names differ)
//         try {
//           // Prefer fetching the authoritative record by id (employee/candidate) which often contains email tracking fields
//           const recordPromises = selectedRecipients.map(async (r) => {
//             try {
//               const record = isEmployeeTab
//                 ? await employeeService.getEmployeeById(r.id)
//                 : await candidateService.getCandidateById(r.id);

//               // Try multiple places for last email timestamp and email-sent flag
//               const lastEmailDate = record?.lastEmailDate || record?.emailSentAt || record?.email_sent_at || record?.last_email_date || record?.meta?.lastEmailDate || null;
//               const emailSentFlag = (record?.emailSent === true) || (record?.email_sent === true) || Boolean(lastEmailDate) || (record?.emailSentAt && record.emailSentAt !== null);

//               // If record doesn't include email fields, fallback to profileService
//               if (lastEmailDate === null && emailSentFlag === false) {
//                 try {
//                   const profile = await getProfileStatus(r.id);
//                   const pLast = profile?.lastEmailDate || profile?.emailSentAt || profile?.last_email_date || profile?.meta?.lastEmailDate || null;
//                   const pSent = (profile?.emailSent === true) || (profile?.email_sent === true) || Boolean(pLast);
//                   return { id: r.id, email: r.email, emailSent: pSent, lastEmailDate: pLast };
//                 } catch (e) {
//                   // fallback optimistic
//                   return { id: r.id, email: r.email, emailSent: true, lastEmailDate: new Date().toISOString() };
//                 }
//               }

//               return { id: r.id, email: r.email, emailSent: emailSentFlag, lastEmailDate };
//             } catch (err) {
//               console.debug('Failed to fetch authoritative record for', r.id, err?.message || err);
//               // fallback to profileService or optimistic
//               try {
//                 const profile = await getProfileStatus(r.id);
//                 const pLast = profile?.lastEmailDate || profile?.emailSentAt || profile?.last_email_date || profile?.meta?.lastEmailDate || null;
//                 const pSent = (profile?.emailSent === true) || (profile?.email_sent === true) || Boolean(pLast);
//                 return { id: r.id, email: r.email, emailSent: pSent, lastEmailDate: pLast };
//               } catch (e2) {
//                 return { id: r.id, email: r.email, emailSent: true, lastEmailDate: new Date().toISOString() };
//               }
//             }
//           });

//           const resolved = await Promise.all(recordPromises);
//           patchRowsWithUpdated(resolved);
//         } catch (e) {
//           console.error('Error patching rows after send (authoritative fetch):', e);
//           // As a last resort, do optimistic update
//           const now = new Date().toISOString();
//           const optimistic = selectedRecipients.map(r => ({ id: r.id, email: r.email, emailSent: true, lastEmailDate: now }));
//           patchRowsWithUpdated(optimistic);
//         }

//         // Also refresh authoritative dataset for the active tab in the background
//         if (activeTab === 'employees') {
//           fetchEmployees();
//         } else if (activeTab === 'candidates') {
//           fetchCandidates();
//         } else {
//           fetchRecipientGroups();
//         }
//       }

//       // Wait for authoritative refresh so UI shows DB-updated values (forceful)
//       try {
//         if (activeTab === 'employees') {
//           await fetchEmployees();
//         } else if (activeTab === 'candidates') {
//           await fetchCandidates();
//         } else {
//           await fetchRecipientGroups();
//         }
//         // Additionally, fetch each recipient's authoritative record and upsert into UI lists
//         try {
//           const recs = await Promise.all(selectedRecipients.map(async (r) => {
//             try {
//               return isEmployeeTab ? await employeeService.getEmployeeById(r.id) : await candidateService.getCandidateById(r.id);
//             } catch (e) {
//               // ignore individual failures
//               return null;
//             }
//           }));
//           upsertRowsFromRecords(recs.filter(Boolean));
//         } catch (e) {
//           console.debug('upsert per-recipient records failed', e);
//         }
//       } catch (refreshErr) {
//         console.debug('Failed to refresh authoritative dataset after send:', refreshErr);
//       }

//       // Summary toast including partial failures if provided
//       const updatedCount = Array.isArray(resp?.updated) ? resp.updated.length : 0;
//       const failedCount = Array.isArray(resp?.failed) ? resp.failed.length : 0;
//       const summary = failedCount > 0
//         ? `Sent ${updatedCount}, Failed ${failedCount}`
//         : (updatedCount > 0 ? `Successfully sent ${updatedCount} email${updatedCount > 1 ? 's' : ''}!` : 'No emails were sent.');

//       toast.success(summary, { 
//         id: 'sending',
//         duration: 4000 
//       });

//       // If there are failures, show separate error toast and store details
//       if (failedCount > 0) {
//         const failedList = Array.isArray(resp.failed) ? resp.failed : [];
//         toast.error('❌ Failed to send email for some recipients. See details below.');
//         // Per-entry toast (limited to 10 to avoid spam)
//         failedList.slice(0, 10).forEach((f) => {
//           const id = f?.id || f?.userId || f?.employeeId || f?.candidateId || 'unknown';
//           const reason = f?.error || f?.message || 'Unknown error';
//           toast.error(`Failed to send to ID ${id}: ${reason}`);
//         });
//         setFailedSendDetails(failedList);
//       } else {
//         setFailedSendDetails([]);
//       }
      
//       // Reset form and refresh data
//       setSelectedRecipients([]);
//       setEmailType('');
//       setDynamicFields({});
//       setEmailBody('');
//       setShowEmailComposer(false);
      
//       // Refresh the data to update email status
//       if (activeTab === 'employees') {
//         fetchEmployees();
//       } else {
//         fetchCandidates();
//       }
      
//     } catch (error) {
//       if (error?.status === 404) {
//         const m = (error?.data && (error.data.message || error.data.error)) || 'Meeting not available';
//         toast.error(m, { id: 'sending' });
//       } else {
//         const m = error?.message || 'Failed to send emails. Please try again.';
//         toast.error(m, { id: 'sending' });
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handlePreviewEmail = (recipient) => {
//     if (!emailType) {
//       toast.error('Please select an email type first');
//       return;
//     }
//     setPreviewRecipient(recipient);
//     setShowPreview(true);
//   };

//   // Enhanced table helper functions
//   const getTableColumns = () => {
//     // Minimal, neat column set: Name, Email, Role. Selection checkbox is provided by EnhancedTable when onRowSelect is passed.
//     return [
//       {
//         key: 'name',
//         label: 'Name',
//         visible: true,
//         className: 'em-col-name truncate',
//         render: (v, row) => {
//           const full = (row.firstName || row.lastName) ? `${row.firstName || ''} ${row.lastName || ''}`.trim() : (v || '-');
//           return full || '-';
//         }
//       },
//       {
//         key: 'email',
//         label: 'Email',
//         visible: true,
//         className: 'em-col-email truncate',
//         render: (v) => v || '-'
//       },
//       {
//         key: 'role',
//         label: 'Role',
//         visible: true,
//         className: 'em-col-role truncate',
//         render: (v) => (v || '-')
//       },
//       /* {
//         key: 'emailStatus',
//         label: 'Email Status',
//         visible: true,
//         className: 'em-col-status',
//         render: (v) => getEmailStatusBadge(v || 'Not Sent')
//       },
//       {
//         key: 'lastEmailDate',
//         label: 'Last Email',
//         visible: true,
//         className: 'em-col-last',
//         render: (v) => formatDate(v)
//       } */
//     ];
//   };

//   const getTableFilters = () => {
//     if (activeTab === 'employees') {
//       return {
//         status: {
//           label: 'Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Active', value: 'Active' },
//             { label: 'On Leave', value: 'On Leave' },
//             { label: 'Terminated', value: 'Terminated' },
//             { label: 'Rejected', value: 'Rejected' },
//             { label: 'New', value: 'New' },
//             { label: 'Interviewed', value: 'Interviewed' },
//             { label: 'Offered', value: 'Offered' }
//           ]
//         },
//         profileStatus: {
//           label: 'Profile Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Loading', value: 'loading' },
//             { label: 'Pending', value: 'pending' },
//             { label: 'Completed', value: 'completed' }
//           ]
//         },
//         emailSent: {
//           label: 'Email Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Sent', value: 'true' },
//             { label: 'Not Sent', value: 'false' }
//           ]
//         }
//       };
//     } else {
//       return {
//         emailSent: {
//           label: 'Email Status',
//           options: [
//             { label: 'All', value: '' },
//             { label: 'Sent', value: 'sent' },
//             { label: 'Not Sent', value: 'not-sent' }
//           ]
//         }
//       };
//     }
//   };

//   const getTableActions = () => {
//     const actions = [];
    
//     if (selectedRecipients.length > 0) {
//       actions.push({
//         label: `Compose Email (${selectedRecipients.length})`,
//         icon: '📧',
//         onClick: () => setShowEmailComposer(true),
//         variant: 'primary',
//         size: 'sm'
//       });
      
//       if (emailType) {
//         actions.push({
//           label: 'Preview',
//           icon: '👁️',
//           onClick: () => setShowPreview(true),
//           variant: 'secondary',
//           size: 'sm'
//         });
//       }

//       if (activeTab === 'candidates') {
//         actions.push({
//           label: 'Resend Invitation',
//           icon: '🔁',
//           onClick: async () => {
//             setIsLoading(true);
//             try {
//               // Send one-by-one to ensure names are included per candidate
//               for (const rec of selectedRecipients) {
//                 await candidateService.resendInvitation({
//                   emails: [rec.email],
//                   firstName: rec.firstName || (rec.name?.split(' ')[0] || ''),
//                   lastName: rec.lastName || (rec.name?.split(' ').slice(1).join(' ') || ''),
//                   password: 'test1234',
//                   loginLink: 'http://localhost:5173/login',
//                   description: 'Welcome to AEPL',
//                 });
//               }
//               toast.success(`Resent invitation to ${selectedRecipients.length} candidate${selectedRecipients.length > 1 ? 's' : ''}`);
//             } catch (err) {
//               console.error('Failed to resend invitations:', err);
//               toast.error(err.message || 'Failed to resend invitations');
//             } finally {
//               setIsLoading(false);
//             }
//           },
//           variant: 'primary',
//           size: 'sm'
//         });
//       }
//     }
    
//     return actions;
//   };

//   const handleSearch = (query) => {
//     setFilterText(query);
//     setCurrentPage(0); // Reset to first page when search changes
//   };

//   const handleFilterChange = (newFilters) => {
//     const defaults = { status: '', emailSent: '', profileStatus: '' };
//     setFilters({ ...defaults, ...(newFilters || {}) });
//     setCurrentPage(0); // Reset to first page when filters change
//   };

//   const handleSortChange = (key) => {
//     const direction = sortField === key && sortDirection === 'asc' ? 'desc' : 'asc';
//     setSortField(key);
//     setSortDirection(direction);
//     setCurrentPage(0); // Reset to first page when sorting changes
//   };

//   const handleRowSelect = (id) => {
//     const person = getCurrentData().find(p => p.id === id);
//     if (person) {
//       handleRecipientToggle(person);
//     }
//   };

//   const handleSelectAllRows = () => {
//     handleSelectAll();
//   };

//   // Update email template when email type changes
//   useEffect(() => {
//     if (emailType) {
//       const template = getCurrentTemplate();
//       if (!template) {
//         toast.error('Template not available for this selection');
//       } else {
//         // Pre-fill body using the first selected recipient if present
//         const recipient = selectedRecipients[0] || null;
//         const filled = replacePlaceholders(template.body || '', dynamicFields, recipient);
//         setEmailBody(filled);
//       }

//       // Reset dynamic fields for the selected template
//       const fields = getCurrentFields();
//       const initialFields = {};
//       fields.forEach(field => {
//         initialFields[field.name] = '';
//       });
//       setDynamicFields(initialFields);
//     }
//   }, [emailType, activeTab]);

//   return (
//     <div className="email-management-panel">


//       {Array.isArray(failedSendDetails) && failedSendDetails.length > 0 && (
//         <div style={{ background: '#fff3f3', border: '1px solid #f5c2c7', color: '#842029', padding: 10, borderRadius: 6, marginBottom: 12 }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//             <strong>Failed to send email for {failedSendDetails.length} recipient(s)</strong>
//             <button onClick={() => setFailedSendDetails([])} style={{ background: 'transparent', border: 'none', color: '#842029', cursor: 'pointer' }}>Dismiss</button>
//           </div>
//           <ul style={{ margin: '8px 0 0 18px' }}>
//             {failedSendDetails.slice(0, 20).map((f, idx) => (
//               <li key={idx}>
//                 ID: {String(f.id || f.userId || f.employeeId || f.candidateId || 'unknown')} — {String(f.error || f.message || 'Unknown error')}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}

//       {/* Unified paper: Tabs + Controls + Table */}
//       <div
//         className="email-paper"
//         style={{ border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)', padding: 10 }}
//       >
//         {/* Tabs Row */}
//         <div
//           className="tab-navigation"
//           style={{
//             background: 'transparent',
//             border: 'none',
//             borderRadius: 8,
//             padding: 8,
//             marginBottom: 8,
//             display: 'flex',
//             gap: 10,
//             justifyContent: 'center',
//             flexWrap: 'wrap'
//           }}
//         >
//         <button
//           className={`tab-button ${activeTab === 'hr' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('hr');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'hr' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'hr' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           HR
//         </button>
//         <button
//           className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('employees');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'employees' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'employees' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           Employees
//         </button>
//         <button
//           className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('candidates');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'candidates' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'candidates' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           Candidates
//         </button>
//         <button
//           className={`tab-button ${activeTab === 'alumni' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('alumni');
//             setSelectedRecipients([]);
//             setEmailType('');
//             setShowEmailComposer(false);
//             setCurrentPage(0);
//           }}
//           style={{
//             padding: '6px 10px',
//             fontSize: 13,
//             borderRadius: 6,
//             background: activeTab === 'alumni' ? 'var(--color-primary)' : 'var(--color-surface)',
//             color: activeTab === 'alumni' ? 'var(--color-on-primary)' : 'var(--color-text)',
//             border: '1px solid var(--color-border)',
//             fontWeight: 600,
//             cursor: 'pointer'
//           }}
//         >
//           Alumni
//         </button>
//         </div>

//         {/* Top toolbar removed to rely on EnhancedTable's built-in header controls */}

//       {/* Enhanced Recipients Table */}
//       {fetchError && (
//         <div className="dashboard-message" style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', marginBottom: 10, padding: 10, borderRadius: 6 }}>
//           {fetchError}
//         </div>
//       )}
//       {(() => {
//         let rows = getCurrentData();
//         // Apply client-side profile status filtering when requested
//         const statusKey = (filters.profileStatus || '').toLowerCase();
//         if (statusKey) {
//           rows = rows.filter((r) => {
//             const s = statusMap[r.id];
//             if (!s || !s.onboarding_status) {
//               return statusKey === 'loading';
//             }
//             const norm = String(s.onboarding_status).toUpperCase();
//             if (statusKey === 'completed') return norm === 'COMPLETED';
//             if (statusKey === 'pending') return norm !== 'COMPLETED';
//             return true;
//           });
//         }
//   const clientPaginate = (totalPages === 0 || totalPages === 1) && rows.length > pageSize && totalElements <= rows.length;
//         const start = Math.max(0, currentPage) * pageSize;
//         const end = start + pageSize;
//         const displayRows = clientPaginate ? rows.slice(start, end) : rows;
//         const displayTotalPages = clientPaginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : totalPages;
//         return (
//           <div id="email-table" className="enhanced-table-container">
//             <EnhancedTable
//               data={displayRows}
//           columns={getTableColumns()}
//           onSearch={handleSearch}
//           onFilter={handleFilterChange}
//           onSort={handleSortChange}
//           searchPlaceholder="Search by ID, name, email..."
//           filters={getTableFilters()}
//           sortConfig={{ key: sortField, direction: sortDirection }}
//           loading={isLoading}
//           selectedRows={selectedRecipients.map(r => r.id)}
//           onRowSelect={handleRowSelect}
//           onSelectAll={handleSelectAllRows}
//           actions={getTableActions()}
//           headerControlsHidden={false}
//           controlledSearchQuery={filterText}
//           triggerOpenFilters={filterTrig}
//           triggerOpenSettings={settingsTrig}
//           triggerReset={resetTrig}
//             />

//             {/* Pagination - same component and styling as EmployeeList */}
//             <PaginationBar
//               currentPage={Math.min(currentPage, Math.max(0, displayTotalPages - 1))}
//               totalPages={displayTotalPages}
//               pageSize={pageSize}
//               totalElements={clientPaginate ? rows.length : totalElements}
//               onPageChange={(p) => setCurrentPage(p)}
//               onPageSizeChange={(n) => { setPageSize(Number(n)); setCurrentPage(0); }}
//               pageSizeOptions={[10, 20, 50]}
//             />
//           </div>
//         );
//       })()}

//       {/* Pagination moved next to table to mirror EmployeeList layout */}

//       </div>{/* end email-paper */}

//       {/* Compose Email Modal */}
//       <EmailComposeModal
//         open={showEmailComposer}
//         onClose={() => setShowEmailComposer(false)}
//         to={selectedRecipients.map(r => r.email).filter(Boolean).join(', ')}
//         subject={(() => {
//           const t = getCurrentTemplate();
//           const recip = selectedRecipients[0] || previewRecipient;
//           return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
//         })()}
//         message={emailBody}
//         typeOptions={getEmailTypeOptions()}
//         emailType={emailType}
//         onChangeEmailType={(val) => setEmailType(val)}
//         fields={getCurrentFields()}
//         dynamicFields={dynamicFields}
//         onChangeField={handleDynamicFieldChange}
//         onSend={({ to, subject, message }) => {
//           setEmailBody(message || '');
//           if (!emailType) { toast.error('Please select an email type'); return; }
//           if (selectedRecipients.length === 0) { toast.error('Please select at least one recipient'); return; }
//           handleSendEmail();
//           setShowEmailComposer(false);
//         }}
//       />

//       {/* Email Preview Modal */}
//       {showPreview && (
//         <div className="email-composer-modal">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3>Email Preview</h3>
//               <button
//                 className="close-btn"
//                 onClick={() => setShowPreview(false)}
//               >
//                 ✕
//               </button>
//             </div>
//             <div className="modal-body">
//               {emailType && selectedRecipients.length > 0 ? (
//                 <div className="preview-container">
//                   <div className="preview-recipient-selector">
//                     <label>Preview for:</label>
//                     <select
//                       value={previewRecipient?.id || selectedRecipients[0]?.id}
//                       onChange={(e) => {
//                         const recipient = selectedRecipients.find(r => r.id === parseInt(e.target.value));
//                         setPreviewRecipient(recipient);
//                       }}
//                       className="form-select"
//                     >
//                       {selectedRecipients.map(recipient => (
//                         <option key={recipient.id} value={recipient.id}>
//                           {recipient.name} ({recipient.email})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
                  
//                   <div className="email-preview-content">
//                     <div className="preview-field">
//                       <strong>To:</strong> {(previewRecipient || selectedRecipients[0])?.email}
//                     </div>
//                     <div className="preview-field">
//                       <strong>Subject:</strong> {(() => {
//                         const t = getCurrentTemplate();
//                         const recip = previewRecipient || selectedRecipients[0] || null;
//                         return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
//                       })()}
//                     </div>
//                     <div className="preview-field">
//                       <strong>Body:</strong>
//                       <div className="preview-body-content">
//                         {replacePlaceholders(emailBody, dynamicFields, previewRecipient || selectedRecipients[0])}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="preview-empty">
//                   <p>Please select recipients and email type to preview</p>
//                 </div>
//               )}
//             </div>
//             <div className="modal-footer">
//               <button
//                 className="cancel-btn"
//                 onClick={() => setShowPreview(false)}
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Email Composer Modal */}
//       {showEmailComposer && (
//         <div className="email-composer-modal">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h3>Compose Email to {selectedRecipients.length} recipient{selectedRecipients.length > 1 ? 's' : ''}</h3>
//               <button
//                 className="close-btn"
//                 onClick={() => setShowEmailComposer(false)}
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="modal-body">
//               {/* Email Type Selection */}
//               <div className="form-group">
//                 <label>Email Type *</label>
//                 <select
//                   value={emailType}
//                   onChange={(e) => setEmailType(e.target.value)}
//                   className="form-select"
//                 >
//                   <option value="">Choose email type...</option>
//                   {getEmailTypeOptions().map(option => (
//                     <option key={option.value} value={option.value}>
//                       {option.label}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Dynamic Fields */}
//               {emailType && (
//                 <div className="dynamic-fields">
//                   <h4>Email Details</h4>
//                   {getCurrentFields().map(field => (
//                     <div key={field.name} className="form-group">
//                       <label>
//                         {field.label} {field.required && <span className="required">*</span>}
//                       </label>
//                       {field.type === 'textarea' ? (
//                         <textarea
//                           value={dynamicFields[field.name] || ''}
//                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
//                           placeholder={`Enter ${field.label.toLowerCase()}`}
//                           rows={3}
//                           className="form-textarea"
//                         />
//                       ) : (
//                         <input
//                           type={field.type}
//                           value={dynamicFields[field.name] || ''}
//                           onChange={(e) => handleDynamicFieldChange(field.name, e.target.value)}
//                           placeholder={`Enter ${field.label.toLowerCase()}`}
//                           className="form-input"
//                         />
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Email Preview */}
//               {emailType && (
//                 <div className="email-preview">
//                   <h4>Email Preview</h4>
//                   <div className="preview-subject">
//                     <strong>Subject:</strong> {(() => {
//                       const t = getCurrentTemplate();
//                       const recip = selectedRecipients[0] || null;
//                       return t ? replacePlaceholders(t.subject || '', dynamicFields, recip) : '';
//                     })()}
//                   </div>
//                   <div className="preview-body">
//                     <label>Email Body:</label>
//                     <textarea
//                       value={emailBody}
//                       onChange={(e) => setEmailBody(e.target.value)}
//                       rows={10}
//                       className="email-body-textarea"
//                     />
//                   </div>
//                   <div className="preview-note">
//                     <small>
//                       📝 Placeholders like {`{{name}}`} will be replaced with actual values for each recipient.
//                     </small>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="modal-footer">
//               <button
//                 className="cancel-btn"
//                 onClick={() => setShowEmailComposer(false)}
//               >
//                 Cancel
//               </button>
//               <button
//                 className={`send-btn ${isLoading ? 'loading' : ''}`}
//                 onClick={handleSendEmail}
//                 disabled={isLoading || !emailType}
//               >
//                 {isLoading ? (
//                   <>
//                     <span className="loading-spinner"></span>
//                     Sending...
//                   </>
//                 ) : (
//                   `📤 Send to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default EmailManagementPanel;

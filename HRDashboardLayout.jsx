import React, { useState, useEffect, useMemo } from 'react';
import searchIcon from '../../assets/icons/search.svg';
import filterIcon from '../../assets/icons/filter.svg';
import settingsIcon from '../../assets/icons/settings.svg';
import { useLocation, useNavigate } from 'react-router-dom';
import AddEmployeeForm from './AddEmployeeForm';
import AddEmployeeModal from './AddEmployeeModal';
import EmployeeFileUpload from './EmployeeFileUpload';
import InviteEmployeePanel from './InviteEmployeePanel';
import AddCandidateForm from './AddCandidateForm';
import InviteCandidatePanel from './InviteCandidatePanel';
import UploadEmployeeTable from './UploadEmployeeTable';
import UploadCandidateTable from './UploadCandidateTable';
import EmailManagementPanel from './EmailManagementPanel';
import ErrorBoundary from '../common/ErrorBoundary';
import CandidateCSVUpload from './CandidateCSVUpload';
import { useTheme } from '../../theme/theme';
import '../LeaveManagement/EmployeeList.css';

export default function HRDashboardLayout() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Sticky toolbar state (search + triggers) for employees and candidates
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [empFilterTrig, setEmpFilterTrig] = useState(0);
  const [empSettingsTrig, setEmpSettingsTrig] = useState(0);
  const [empResetTrig, setEmpResetTrig] = useState(0);
  const [candFilterTrig, setCandFilterTrig] = useState(0);
  const [candSettingsTrig, setCandSettingsTrig] = useState(0);
  const [candResetTrig, setCandResetTrig] = useState(0);

  // Update activeView based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/employee-management')) {
      // Default to "View Employees" when entering Employee Management
      setActiveView('uploaded-employees');
    } else if (path.includes('/candidate-management')) {
      // Default to "View Candidates" when entering Candidate Management
      setActiveView('uploaded-candidates');
    } else if (path.includes('/email-management')) {
      setActiveView('email-management');
    } else if (path === '/onboarding-portal') {
      setActiveView('dashboard');
    }
  }, [location.pathname]);

  const handleNavigation = (view) => {
    // For employee-management, immediately show "View Employees"
    if (view === 'employee-management') {
      setActiveView('uploaded-employees');
      navigate('/onboarding-portal/employee-management');
      return;
    }
    // For candidate-management, immediately show "View Candidates"
    if (view === 'candidate-management') {
      setActiveView('uploaded-candidates');
      navigate('/onboarding-portal/candidate-management');
      return;
    }
    setActiveView(view);
    if (view === 'email-management') {
      navigate('/onboarding-portal/email-management');
    } else if (view === 'dashboard') {
      navigate('/onboarding-portal');
    }
  };

  // ---------------- Main Navigation ----------------
  const topNavigation = (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: 10,
        margin: '8px 16px 8px',
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <button
        onClick={() => handleNavigation('employee-management')}
        style={{
          background: activeView === 'employee-management' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : 'var(--color-surface)',
          color: activeView === 'employee-management' ? 'var(--color-primary)' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderLeft: activeView === 'employee-management' ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
          padding: '8px 14px',
          fontSize: '14px',
          fontWeight: activeView === 'employee-management' ? '600' : '500',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
      >
        Employee Management
      </button>
      <button
        onClick={() => handleNavigation('candidate-management')}
        style={{
          background: activeView === 'candidate-management' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : 'var(--color-surface)',
          color: activeView === 'candidate-management' ? 'var(--color-primary)' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderLeft: activeView === 'candidate-management' ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
          padding: '8px 14px',
          fontSize: '14px',
          fontWeight: activeView === 'candidate-management' ? '600' : '500',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
      >
        Candidate Management
      </button>
      <button
        onClick={() => handleNavigation('email-management')}
        style={{
          background: activeView === 'email-management' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : 'var(--color-surface)',
          color: activeView === 'email-management' ? 'var(--color-primary)' : 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderLeft: activeView === 'email-management' ? '4px solid var(--color-primary)' : '1px solid var(--color-border)',
          padding: '8px 14px',
          fontSize: '14px',
          fontWeight: activeView === 'email-management' ? '600' : '500',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
      >
        📧 Email Management
      </button>
    </div>
  );

  // ---------------- Employee Sub-Navigation ----------------
  const employeeSubNav = (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: 8,
        background: 'transparent',
        borderRadius: 8,
        border: 'none'
      }}>
        {/* Left: View Employees */}
        <div>
          <button
            onClick={() => handleNavigation('uploaded-employees')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: activeView === 'uploaded-employees' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : '#ffffff',
              color: activeView === 'uploaded-employees' ? '#457b9d' : '#333333',
              border: '1px solid #e0e0e0',
              borderLeft: activeView === 'uploaded-employees' ? '4px solid #457b9d' : '1px solid #e0e0e0',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: activeView === 'uploaded-employees' ? '600' : '500',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
          >
            {/* People icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 11C18.2091 11 20 9.20914 20 7C20 4.79086 18.2091 3 16 3C13.7909 3 12 4.79086 12 7C12 9.20914 13.7909 11 16 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 13C8.20914 13 10 11.2091 10 9C10 6.79086 8.20914 5 6 5C3.79086 5 2 6.79086 2 9C2 11.2091 3.79086 13 6 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V19C16 16.7909 17.7909 15 20 15H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            View Employees
          </button>
        </div>

        {/* Right: Add + Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowAddEmployeeModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '8px 14px',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {/* Plus icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Employee
          </button>
          <button
            onClick={() => handleNavigation('upload-employee-file')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: activeView === 'upload-employee-file' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : '#ffffff',
              color: activeView === 'upload-employee-file' ? '#457b9d' : '#333333',
              border: '1px solid #e0e0e0',
              borderLeft: activeView === 'upload-employee-file' ? '4px solid #457b9d' : '1px solid #e0e0e0',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: activeView === 'upload-employee-file' ? '600' : '500',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
          >
            {/* Upload icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Upload
          </button>
        </div>
      </div>

      {/* Row 2: Controls (Search | Filter | Settings | Reset) - Hidden on upload page */}
      {activeView !== 'upload-employee-file' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 0',
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          marginTop: 8
        }}>
          <input
            type="text"
            placeholder="Search employees..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            style={{ flex: '0 1 320px', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          <button 
            className="toolbar-btn" 
            title="Search" 
            onClick={() => setEmployeeSearch(s => s)} 
            style={{ 
              padding: 8, 
              border: '1px solid var(--color-border)', 
              borderRadius: 8, 
              background: 'var(--color-surface)', 
              color: 'var(--color-text)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
              e.target.style.color = 'var(--color-primary)';
              e.target.style.borderLeft = '4px solid var(--color-primary)';
              e.target.style.fontWeight = '600';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--color-surface)';
              e.target.style.color = 'var(--color-text)';
              e.target.style.borderLeft = '1px solid var(--color-border)';
              e.target.style.fontWeight = '500';
            }}
          >
            <img src={searchIcon} alt="Search" className="icon-svg" />
          </button>
          <button 
            className="toolbar-btn" 
            title="Filters" 
            onClick={() => setEmpFilterTrig(v => v + 1)} 
            style={{ 
              padding: 8, 
              border: '1px solid var(--color-border)', 
              borderRadius: 8, 
              background: 'var(--color-surface)', 
              color: 'var(--color-text)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
              e.target.style.color = 'var(--color-primary)';
              e.target.style.borderLeft = '4px solid var(--color-primary)';
              e.target.style.fontWeight = '600';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--color-surface)';
              e.target.style.color = 'var(--color-text)';
              e.target.style.borderLeft = '1px solid var(--color-border)';
              e.target.style.fontWeight = '500';
            }}
          >
            <img src={filterIcon} alt="Filter" className="icon-svg" />
          </button>
          <button 
            className="toolbar-btn" 
            title="Settings" 
            onClick={() => setEmpSettingsTrig(v => v + 1)} 
            style={{ 
              padding: 8, 
              border: '1px solid var(--color-border)', 
              borderRadius: 8, 
              background: 'var(--color-surface)', 
              color: 'var(--color-text)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
              e.target.style.color = 'var(--color-primary)';
              e.target.style.borderLeft = '4px solid var(--color-primary)';
              e.target.style.fontWeight = '600';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--color-surface)';
              e.target.style.color = 'var(--color-text)';
              e.target.style.borderLeft = '1px solid var(--color-border)';
              e.target.style.fontWeight = '500';
            }}
          >
            <img src={settingsIcon} alt="Settings" className="icon-svg" />
          </button>
          <button 
            className="toolbar-btn" 
            title="Reset" 
            onClick={() => setEmpResetTrig(v => v + 1)} 
            style={{ 
              padding: '8px 12px', 
              border: '1px solid var(--color-border)', 
              borderRadius: 8, 
              background: 'var(--color-surface)', 
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
              e.target.style.color = 'var(--color-primary)';
              e.target.style.borderLeft = '4px solid var(--color-primary)';
              e.target.style.fontWeight = '600';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--color-surface)';
              e.target.style.color = 'var(--color-text)';
              e.target.style.borderLeft = '1px solid var(--color-border)';
              e.target.style.fontWeight = '500';
            }}
          >
            Reset
          </button>
        </div>
      )}

    </div>
  );

  // ---------------- Candidate Sub-Navigation ----------------
  const candidateSubNav = (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 8,
          background: 'transparent',
          borderRadius: 8,
          border: 'none'
        }}
      >
        {/* Left: View Candidates */}
        <div>
          <button
            onClick={() => handleNavigation('uploaded-candidates')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: activeView === 'uploaded-candidates' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : '#ffffff',
              color: activeView === 'uploaded-candidates' ? '#457b9d' : '#333333',
              border: '1px solid #e0e0e0',
              borderLeft: activeView === 'uploaded-candidates' ? '4px solid #457b9d' : '1px solid #e0e0e0',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: activeView === 'uploaded-candidates' ? '600' : '500',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              height: 32,
              position: 'relative',
            }}
          >
            {/* People icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 11C18.2091 11 20 9.20914 20 7C20 4.79086 18.2091 3 16 3C13.7909 3 12 4.79086 12 7C12 9.20914 13.7909 11 16 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 13C8.20914 13 10 11.2091 10 9C10 6.79086 8.20914 5 6 5C3.79086 5 2 6.79086 2 9C2 11.2091 3.79086 13 6 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V19C16 16.7909 17.7909 15 20 15H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            View Candidates
          </button>
        </div>

        {/* Right: Add Candidate + Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => handleNavigation('add-candidate')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--color-primary)', color: '#ffffff', border: '1px solid var(--color-primary)',
              padding: '8px 16px', fontSize: '14px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', height: 32,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Add Candidate
          </button>
          <button
            onClick={() => handleNavigation('upload-candidate-file')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: activeView === 'upload-candidate-file' ? 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))' : '#ffffff',
              color: activeView === 'upload-candidate-file' ? '#457b9d' : '#333333',
              border: '1px solid #e0e0e0',
              borderLeft: activeView === 'upload-candidate-file' ? '4px solid #457b9d' : '1px solid #e0e0e0',
              padding: '8px 16px', fontSize: '14px', fontWeight: activeView === 'upload-candidate-file' ? '600' : '500', borderRadius: '6px', cursor: 'pointer', height: 32,
              transition: 'all 0.3s ease',
              position: 'relative',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 10l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 15V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Upload
          </button>
        </div>
      </div>

      {/* Row 2: Controls Bar (Left: Search/Filter/Reset, Right: Add/Upload) - Hidden on upload page */}
      {activeView !== 'upload-candidate-file' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            borderRadius: 0,
            marginTop: 8
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              placeholder="Search candidates..."
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              style={{ width: 320, padding: '8px 12px', height: 32, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
            <button
              title="Search"
              onClick={() => setCandidateSearch(s => s)}
              className="toolbar-btn"
              style={{ 
                height: 32, 
                padding: '0 12px', 
                borderRadius: 6, 
                border: '1px solid var(--color-border)', 
                background: 'var(--color-surface)', 
                color: 'var(--color-text)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
                e.target.style.color = 'var(--color-primary)';
                e.target.style.borderLeft = '4px solid var(--color-primary)';
                e.target.style.fontWeight = '600';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--color-surface)';
                e.target.style.color = 'var(--color-text)';
                e.target.style.borderLeft = '1px solid var(--color-border)';
                e.target.style.fontWeight = '500';
              }}
            >
              <img src={searchIcon} alt="Search" className="icon-svg" />
              Search
            </button>
            <button
              title="Filters"
              onClick={() => setCandFilterTrig(v => v + 1)}
              className="toolbar-btn"
              style={{ 
                height: 32, 
                padding: '0 12px', 
                borderRadius: 6, 
                border: '1px solid var(--color-border)', 
                background: 'var(--color-surface)', 
                color: 'var(--color-text)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
                e.target.style.color = 'var(--color-primary)';
                e.target.style.borderLeft = '4px solid var(--color-primary)';
                e.target.style.fontWeight = '600';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--color-surface)';
                e.target.style.color = 'var(--color-text)';
                e.target.style.borderLeft = '1px solid var(--color-border)';
                e.target.style.fontWeight = '500';
              }}
            >
              <img src={filterIcon} alt="Filter" className="icon-svg" />
              Filter
            </button>
            <button
              title="Settings"
              onClick={() => setCandSettingsTrig(v => v + 1)}
              className="toolbar-btn"
              style={{ 
                height: 32, 
                padding: '0 12px', 
                borderRadius: 6, 
                border: '1px solid var(--color-border)', 
                background: 'var(--color-surface)', 
                color: 'var(--color-text)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
                e.target.style.color = 'var(--color-primary)';
                e.target.style.borderLeft = '4px solid var(--color-primary)';
                e.target.style.fontWeight = '600';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--color-surface)';
                e.target.style.color = 'var(--color-text)';
                e.target.style.borderLeft = '1px solid var(--color-border)';
                e.target.style.fontWeight = '500';
              }}
            >
              <img src={settingsIcon} alt="Settings" className="icon-svg" />
            </button>
            <button
              title="Reset"
              onClick={() => setCandResetTrig(v => v + 1)}
              className="toolbar-btn"
              style={{ 
                height: 32, 
                padding: '0 12px', 
                borderRadius: 6, 
                border: '1px solid var(--color-border)', 
                background: 'var(--color-surface)', 
                color: 'var(--color-text)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(69, 123, 157, 0.1), rgba(69, 123, 157, 0.05))';
                e.target.style.color = 'var(--color-primary)';
                e.target.style.borderLeft = '4px solid var(--color-primary)';
                e.target.style.fontWeight = '600';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--color-surface)';
                e.target.style.color = 'var(--color-text)';
                e.target.style.borderLeft = '1px solid var(--color-border)';
                e.target.style.fontWeight = '500';
              }}
            >
              Reset
            </button>
          </div>
          {/* Right buttons moved to top row for alignment with Employee */}
        </div>
      )}
    </div>
  );

  // ---------------- Main Content ----------------
  let mainContent;
  switch (activeView) {
    case 'dashboard':
      mainContent = (
        <div className="card">
          <h1>Onboarding Portal</h1>
          <p>Select a management section from the navigation above to get started.</p>
        </div>
      );
      break;

    case 'employee-management':
    case 'add-employee':
    case 'upload-employee-file':
    case 'uploaded-employees':
      mainContent = (
        <div className="module-content-scroll" style={{ background: 'transparent', padding: 0, border: 'none' }}>
          {/* Unified area: tabs + controls + table (no extra card), allow theme to drive colors */}
          <div className="unified-paper">
            {employeeSubNav}
            {activeView === 'add-employee' && <AddEmployeeForm />}
            {activeView === 'upload-employee-file' && <EmployeeFileUpload />}
            {(activeView === 'uploaded-employees' || activeView === 'employee-management') && (
              <div className="table-scroll-container" style={{ overflowX: 'auto', marginTop: 0 }}>
                <UploadEmployeeTable
                  controlledSearchQuery={employeeSearch}
                  hideInlineSearch={true}
                  hideInlineControls={true}
                  filterTrigger={empFilterTrig}
                  settingsTrigger={empSettingsTrig}
                  resetTrigger={empResetTrig}
                />
              </div>
            )}
          </div>
          {/* Add Employee Modal */}
          {showAddEmployeeModal && (
            <AddEmployeeModal
              open={showAddEmployeeModal}
              onClose={() => setShowAddEmployeeModal(false)}
              onEmployeeAdded={() => setShowAddEmployeeModal(false)}
            />
          )}
        </div>
      );
      break;

    case 'candidate-management':
    case 'add-candidate':
    case 'uploaded-candidates':
    case 'upload-candidate-file':
      mainContent = (
        <div className="module-content-scroll" style={{ background: 'transparent', padding: 0, border: 'none' }}>
          {/* Unified area: tabs + controls + table (single paper) */}
          <div className="unified-paper">
            {candidateSubNav}
            {activeView === 'add-candidate' && <AddCandidateForm />}
            {activeView === 'upload-candidate-file' && (
              <CandidateCSVUpload onUploadSuccess={() => setActiveView('uploaded-candidates')} />
            )}
            {(activeView === 'uploaded-candidates' || activeView === 'candidate-management') && (
              <div className="table-scroll-container" style={{ overflowX: 'auto', marginTop: 0 }}>
                <UploadCandidateTable
                  toolbarSearchQuery={candidateSearch}
                  headerControlsHidden={true}
                  filterTrigger={candFilterTrig}
                  settingsTrigger={candSettingsTrig}
                  resetTrigger={candResetTrig}
                />
              </div>
            )}
          </div>
          {/* Add Candidate Modal - simplified single layer */}
          {showAddCandidateModal && (
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(860px, 96vw)',
                maxHeight: '92vh',
                overflow: 'auto',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-elevation)',
                padding: 'var(--spacing-xl)',
                zIndex: 1000
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Add Candidate</h3>
              <AddCandidateForm onCandidateAdded={() => setShowAddCandidateModal(false)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'var(--spacing-md)' }}>
                <button
                  onClick={() => setShowAddCandidateModal(false)}
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      );
      break;

    case 'email-management':
      mainContent = (
        <div className="module-content-scroll" style={{ background: 'transparent', padding: 0, border: 'none' }}>
          <ErrorBoundary>
            <EmailManagementPanel />
          </ErrorBoundary>
        </div>
      );
      break;

    case 'invite-employee':
      mainContent = (
        <div className="card">
          <h2>Invite Employee</h2>
          <InviteEmployeePanel />
        </div>
      );
      break;

    default:
      mainContent = (
        <div className="card">
          <h1>{activeView.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</h1>
          <p>This feature is coming soon.</p>
        </div>
      );
      break;
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {topNavigation}
      <div style={{ padding: '20px' }}>{mainContent}</div>
    </div>
  );
}

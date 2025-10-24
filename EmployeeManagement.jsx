import React, { useState, useEffect } from 'react';
import AddEmployeeForm from './AddEmployeeForm';
import UploadEmployeeTable from './UploadEmployeeTable';
import EmployeeCSVUpload from './EmployeeCSVUpload';
import { useLocation } from "react-router-dom";

export default function EmployeeManagement() {
  // 👇 Step 1: Read the query parameter (?tab=add)
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const defaultTab = params.get("tab") || "add";

  // 👇 Step 2: Initialize tab based on query
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refresh employee list after data change
  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'add', label: '➕ Add Employee', icon: '👤' },
    { id: 'upload', label: '📤 Upload CSV', icon: '📊' },
    { id: 'view', label: '👥 View Employees', icon: '📋' }
  ];

  return (
    <div className="employee-management">
      <div className="management-header">
        <h1>👥 Employee Management</h1>
        <p>Manage employees, upload CSV files, and view employee data</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'add' && (
          <div className="tab-panel">
            <AddEmployeeForm onEmployeeAdded={handleDataChange} />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="tab-panel">
            <EmployeeCSVUpload onUploadSuccess={handleDataChange} />
          </div>
        )}

        {activeTab === 'view' && (
          <div className="tab-panel">
            <UploadEmployeeTable key={refreshTrigger} />
          </div>
        )}
      </div>

      {/* =================== STYLES =================== */}
      <style jsx>{`
        .employee-management {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .management-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .management-header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .management-header p {
          margin: 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .tab-navigation {
          display: flex;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
          overflow: hidden;
        }

        .tab-button {
          flex: 1;
          padding: 16px 24px;
          border: none;
          background: white;
          color: #666;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-bottom: 3px solid transparent;
        }

        .tab-button:hover {
          background: #f8f9fa;
          color: #333;
        }

        .tab-button.active {
          background: #007bff;
          color: white;
          border-bottom-color: #0056b3;
        }

        .tab-icon {
          font-size: 18px;
        }

        .tab-content {
          min-height: 600px;
        }

        .tab-panel {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          padding: 20px;
        }

        @media (max-width: 768px) {
          .employee-management {
            padding: 10px;
          }

          .management-header h1 {
            font-size: 2rem;
          }

          .tab-navigation {
            flex-direction: column;
          }

          .tab-button {
            padding: 12px 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { employeeService } from '../../services/apiService';
import toast from '../../services/toastService';

export default function EmployeeCSVUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please select a CSV file');
        setFile(null);
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    setUploading(true);
    setMessage('');
    
    const loadingToast = toast.loading('Uploading employee CSV...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      await employeeService.uploadEmployeeCSV(formData);
      
      setMessage('✅ Employee CSV uploaded successfully!');
      toast.success('Employee CSV uploaded successfully!');
      toast.remove(loadingToast);
      
      // Clear file selection
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
    } catch (error) {
      const errorMessage = error.message || 'Failed to upload CSV file';
      setMessage(`❌ ${errorMessage}`);
      toast.error(errorMessage);
      toast.remove(loadingToast);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Create a sample CSV template
    const csvContent = `firstName,lastName,email,phoneNumber,designation,joiningDate,role,departmentId
John,Doe,john.doe@example.com,1234567890,Software Engineer,2024-01-15,EMPLOYEE,1
Jane,Smith,jane.smith@example.com,0987654321,HR Manager,2024-01-20,HR,2`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully!');
  };

  return (
    <div className="csv-upload-container">
      <h3>Upload Employee CSV</h3>
      
      <div className="upload-instructions">
        <p>Upload a CSV file with employee data. Make sure your CSV includes the following columns:</p>
        <ul>
          <li><strong>firstName</strong> - Employee's first name (required)</li>
          <li><strong>lastName</strong> - Employee's last name (required)</li>
          <li><strong>email</strong> - Employee's email address (required)</li>
          <li><strong>phoneNumber</strong> - Employee's phone number (required)</li>
          <li><strong>designation</strong> - Employee's job title (required)</li>
          <li><strong>joiningDate</strong> - Date of joining (YYYY-MM-DD format, required)</li>
          <li><strong>role</strong> - Employee role (HR, EMPLOYEE, CANDIDATE, ADMIN, EX_EMPLOYEE)</li>
          <li><strong>departmentId</strong> - Department ID (numeric, required)</li>
        </ul>
      </div>

      <div className="upload-actions">
        <button 
          type="button" 
          className="download-template-btn"
          onClick={downloadTemplate}
        >
          📥 Download Template
        </button>
      </div>

      <div className="file-upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="file-input"
        />
        
        {file && (
          <div className="file-info">
            <p><strong>Selected file:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}
      </div>

      <div className="upload-controls">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-btn"
        >
          {uploading ? 'Uploading...' : 'Upload CSV'}
        </button>
        
        {file && (
          <button
            type="button"
            onClick={handleClear}
            disabled={uploading}
            className="clear-btn"
          >
            Clear
          </button>
        )}
      </div>

      {message && (
        <div className="upload-message">
          {message}
        </div>
      )}

      <style jsx>{`
        .csv-upload-container {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        .upload-instructions {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
        }

        .upload-instructions ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .upload-instructions li {
          margin: 5px 0;
        }

        .upload-actions {
          margin: 15px 0;
        }

        .download-template-btn {
          background: #17a2b8;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .download-template-btn:hover {
          background: #138496;
        }

        .file-upload-section {
          margin: 20px 0;
        }

        .file-input {
          width: 100%;
          padding: 10px;
          border: 2px dashed #ddd;
          border-radius: 4px;
          background: #fafafa;
        }

        .file-info {
          background: #e9ecef;
          padding: 10px;
          border-radius: 4px;
          margin-top: 10px;
        }

        .file-info p {
          margin: 5px 0;
        }

        .upload-controls {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .upload-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .upload-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .upload-btn:hover:not(:disabled) {
          background: #218838;
        }

        .clear-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .clear-btn:hover {
          background: #5a6268;
        }

        .upload-message {
          padding: 10px;
          border-radius: 4px;
          margin-top: 15px;
          white-space: pre-line;
        }
      `}</style>
    </div>
  );
}

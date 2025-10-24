import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import toast from '../../services/toastService';
const API_BASE = import.meta.env.VITE_API_URL;

export default function EmployeeFileUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setMessage('❌ Please select a file first.');
      return;
    }

    setLoading(true);
    setMessage('⏳ Reading file...');

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        let jsonData = [];

        // Handle CSV separately
        if (selectedFile.name.endsWith('.csv')) {
          const text = e.target.result;
          const workbook = XLSX.read(text, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        } else {
          // Excel files
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        }

        if (jsonData.length === 0) {
          setLoading(false);
          setMessage('❌ The selected file is empty or has an invalid format.');
          return;
        }

        setMessage(`Found ${jsonData.length} employees. Uploading to server...`);

        const employees = jsonData.map(item => ({
          email: item.email || item.Email || item.EMAIL || '',
          firstName: item.firstname || item.firstName || item.FirstName || item.FIRSTNAME || '',
          lastName: item.lastname || item.lastName || item.LastName || item.LASTNAME || '',
          status: item.status || item.Status || item.STATUS || '',
          designation: item.designation || item.Designation || item.DESIGNATION || '',
          phoneNumber: item.phonenumber || item.phoneNumber || item.PhoneNumber || item.PHONENUMBER || ''
        }));

        const response = await fetch(`${API_BASE}/api/upload/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employees)
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(errText || 'Failed to upload employees');
        }

        const data = await response.json().catch(() => ({}));

        // Build desired simple message with aggregated top reasons
        let successCount = typeof data.validCount === 'number' ? data.validCount : employees.length;
        let rejectedCount = 0;
        let msg = `✅ Successfully uploaded ${successCount} employees.`;

        const rejected = data?.rejectedRows;
        const rejectedKeys = rejected && typeof rejected === 'object' ? Object.keys(rejected) : [];
        rejectedCount = rejectedKeys.length;
        if (rejectedCount > 0) {
          msg += `\n❌ Rejected ${rejectedCount} employees.`;

          // Aggregate reasons as "field: reason" => count
          const reasonCounts = {};
          for (const row of rejectedKeys) {
            const reasons = Array.isArray(rejected[row]) ? rejected[row] : [];
            for (const r of reasons) {
              const str = String(r);
              // Try to split as "field: message"
              const [fieldPart, ...rest] = str.split(':');
              const field = rest.length ? fieldPart.trim() : '';
              const reason = rest.length ? rest.join(':').trim() : str.trim();
              const key = field ? `${field}: ${reason}` : reason;
              reasonCounts[key] = (reasonCounts[key] || 0) + 1;
            }
          }

          const sorted = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            msg += `\n\nTop rejection reasons:`;
            for (const [k, count] of sorted.slice(0, 10)) {
              msg += `\n- ${k} (${count})`;
            }
          }
        }

        setLoading(false);
        setMessage(msg);
        toast.success(msg, { duration: 8000 });
        setSelectedFile(null);

        if (onUploadSuccess) onUploadSuccess();

      } catch (error) {
        setLoading(false);
        setMessage('❌ Error uploading file. Please check the format and try again.');
        toast.error('❌ File upload failed!');
        console.error('File upload error:', error);
      }
    };

    // Read as text for CSV, array for Excel
    if (selectedFile.name.endsWith('.csv')) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (document.getElementById('file-input')) {
      document.getElementById('file-input').value = '';
    }
    setMessage('');
  };

  return (
    <div className="file-upload-container">
      <h3>Upload Employee File</h3>

      <div className="sample-download">
        <span>Download Sample:</span>
        <a href="/sample-employees.xlsx" download title="Download Excel Sample">
          <span style={{ color: 'green', fontWeight: 'bold', textDecoration: 'underline' }}>Excel</span>
        </a>
        <a href="/sample-employees.csv" download title="Download CSV Sample">
          <span style={{ color: '#555', fontWeight: 'bold', textDecoration: 'underline' }}>CSV</span>
        </a>
      </div>

      <div className="file-input-wrapper">
        <input
          type="file"
          id="file-input"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileSelect}
        />
        <label htmlFor="file-input" className="file-input-label">
          {selectedFile ? selectedFile.name : 'Choose File...'}
        </label>
      </div>

      <div className="upload-actions">
        <button
          className="btn-upload primary-btn"
          onClick={handleUpload}
          disabled={!selectedFile || loading}
        >
          {loading ? 'Processing...' : 'Upload Employee File'}
        </button>
        <button
          className="btn-cancel primary-btn"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      {message && <div className="dashboard-message" style={{ marginTop: '1rem' }}>{message}</div>}
    </div>
  );
}

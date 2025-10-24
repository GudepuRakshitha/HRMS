import React, { useState, useRef } from 'react';
import { candidateService } from '../../services/apiService';
import toast from '../../services/toastService';

export default function CandidateCSVUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadResult, setUploadResult] = useState(null); // holds response object
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type: allow .csv and .xlsx
      const lower = selectedFile.name.toLowerCase();
      const isCsv = lower.endsWith('.csv');
      const isXlsx = lower.endsWith('.xlsx');
      if (!isCsv && !isXlsx) {
        toast.error('Please select a .csv or .xlsx file');
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
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    setUploading(true);
    setMessage('');
    setUploadResult(null);
    
    const loadingToast = toast.loading('Uploading candidate CSV...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await candidateService.uploadCandidateCSV(formData);

      // Build simple message + aggregated top rejection reasons
      let successCount = typeof data?.validCount === 'number' ? data.validCount : 0;
      // Fallback if backend returns only createdCount
      if (!successCount && typeof data?.createdCount === 'number') successCount = data.createdCount;
      let msg = `✅ Successfully uploaded ${successCount} candidates.`;

      const rejected = data?.rejectedRows;
      const rejectedKeys = rejected && typeof rejected === 'object' ? Object.keys(rejected) : [];
      if (rejectedKeys.length > 0) {
        msg += `\n❌ Rejected ${rejectedKeys.length} candidates.`;
        const reasonCounts = {};
        for (const row of rejectedKeys) {
          const reasons = Array.isArray(rejected[row]) ? rejected[row] : [];
          for (const r of reasons) {
            const str = String(r);
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

      setMessage(msg);
      setUploadResult(data || null);
      toast.success(msg, { duration: 8000 });
      toast.remove(loadingToast);
      
      // Clear file selection
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component (e.g., to refresh the table)
      if (onUploadSuccess) {
        onUploadSuccess(data);
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
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Create a sample CSV template
    const csvContent = `email,firstName,lastName,phoneNumber,jobTitle,description
john.candidate@example.com,John,Candidate,1234567890,Software Developer,Experienced developer
jane.applicant@example.com,Jane,Applicant,0987654321,UI/UX Designer,Creative designer`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'candidate_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Template downloaded successfully!');
  };

  return (
    <div className="file-upload-container">
      <h3>Upload Candidate File</h3>

      <div className="sample-download">
        <span>Download Sample:</span>
        <a href="/sample-candidates.xlsx" download title="Download Excel Sample">
          <span style={{ color: 'green', fontWeight: 'bold', textDecoration: 'underline' }}>Excel</span>
        </a>
        <a href="/sample-candidates.csv" download title="Download CSV Sample">
          <span style={{ color: '#555', fontWeight: 'bold', textDecoration: 'underline' }}>CSV</span>
        </a>
        <button type="button" onClick={downloadTemplate} style={{ marginLeft: 8 }}>Generate CSV</button>
      </div>

      <div className="file-input-wrapper">
        <input
          ref={fileInputRef}
          type="file"
          id="candidate-file-input"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileSelect}
        />
        <label htmlFor="candidate-file-input" className="file-input-label">
          {file ? file.name : 'Choose File...'}
        </label>
      </div>

      <div className="upload-actions">
        <button
          className="btn-upload primary-btn"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Processing...' : 'Upload Candidate File'}
        </button>
        <button
          className="btn-cancel primary-btn"
          onClick={handleClear}
          disabled={uploading}
        >
          Cancel
        </button>
      </div>

      {message && <div className="dashboard-message" style={{ marginTop: '1rem' }}>{message}</div>}

      {/* Keep detailed results below for visibility */}
      {uploadResult && (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: 12, marginTop: 12 }}>
          {Array.isArray(uploadResult.validationErrors) && uploadResult.validationErrors.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 14 }}>Validation Errors</h4>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {uploadResult.validationErrors.map((err, idx) => (
                  <li key={`val-${idx}`}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(uploadResult.rowErrors) && uploadResult.rowErrors.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 14 }}>Row Errors</h4>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {uploadResult.rowErrors.map((err, idx) => (
                  <li key={`row-${idx}`}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(uploadResult.rejectedRows) && uploadResult.rejectedRows.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 14 }}>Rejected Rows</h4>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {uploadResult.rejectedRows.map((row, idx) => (
                  <li key={`rej-${idx}`}>{typeof row === 'string' ? row : JSON.stringify(row)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

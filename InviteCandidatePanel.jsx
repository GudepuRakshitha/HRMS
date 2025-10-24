import React, { useState } from 'react';
import UploadedDataTable from './UploadedDataTable';
import * as XLSX from 'xlsx';
import api from '../utils/api.jsx';
export default function InviteCandidatePanel() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedCandidates, setExtractedCandidates] = useState([]);
  const [uploadedCandidates, setUploadedCandidates] = useState([]);
  const [showExtractionTable, setShowExtractionTable] = useState(false);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage('');
    setExtractedCandidates([]);
    setShowExtractionTable(false);
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile) {
      setMessage('❌ Please select a file first.');
      return;
    }
    setLoading(true);
    setMessage('⏳ Uploading file and extracting data...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
            setLoading(false);
            setMessage('❌ The selected file is empty or has an invalid format.');
            return;
        }

        const candidates = json.map(item => ({
          email: item.email || item.Email || item.EMAIL,
          firstName: item.firstname || item.firstName || item.FirstName || item.FIRSTNAME,
          lastName: item.lastname || item.lastName || item.LastName || item.LASTNAME,
          phoneNumber: item.phonenumber || item.phoneNumber || item.PhoneNumber || item.PHONENUMBER,
          status: item.status || item.Status || item.STATUS
        }));

        setExtractedCandidates(candidates);
        setShowExtractionTable(true);
        setMessage(`✅ Successfully extracted data from ${candidates.length} candidate(s).`);

        // Upload candidates and store returned candidates with IDs
        const { data: uploadResult } = await api.post('/upload/candidates', {
          emails: candidates.map(c => c.email),
          firstNames: candidates.map(c => c.firstName),
          lastNames: candidates.map(c => c.lastName),
          phoneNumbers: candidates.map(c => c.phoneNumber),
          statuses: candidates.map(c => c.status),
          description: ''
        });
        if (uploadResult && uploadResult.data) {
          setUploadedCandidates(uploadResult.data);
          setMessage(`✅ Successfully uploaded ${uploadResult.data.length} candidates.`);
        } else {
          setUploadedCandidates([]);
          setMessage('❌ Upload succeeded but no candidates returned.');
        }

      } catch (error) {
        console.error('File parsing error:', error);
        setMessage('❌ Error parsing file. Please check the format and try again.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
    setMessage('');
    setExtractedCandidates([]);
    setShowExtractionTable(false);
  };

  const handleInviteSelectedCandidates = async (candidatesToInvite) => {
    setLoading(true);
    setMessage('⏳ Inviting selected candidates...');
    try {
      // Use uploadedCandidates to get IDs
      const emailsToInvite = candidatesToInvite.map(c => c.email);
      const ids = uploadedCandidates
        .filter(c => emailsToInvite.includes(c.email) && c.id)
        .map(c => c.id);
      console.log('Sending candidate invite for IDs:', ids);
      if (ids.length > 0) {
        await api.post('/upload/candidates/send-email', {
          ids: ids,
          emailType: 'invitation',
          password: 'test1234',
          loginLink: 'http://localhost:5173/login'
        });
        setMessage(`✅ Successfully sent invitation emails with login credentials to ${ids.length} candidate(s).`);
        setExtractedCandidates([]);
        setShowExtractionTable(false);
      } else {
        setMessage('❌ No valid candidates found to invite.');
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      setMessage('❌ Failed to send emails.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invite-candidate-panel">
      <h3>Upload Candidate File</h3>
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
        <button className="btn-upload" onClick={handleUploadAndExtract} disabled={!selectedFile || loading}>
          {loading ? 'Processing...' : 'Upload & Extract'}
        </button>
        <button className="btn-cancel" onClick={handleCancel} disabled={loading}>
          Cancel
        </button>
      </div>

      {message && <div className="dashboard-message">{message}</div>}

      {showExtractionTable && extractedCandidates.length > 0 && (
        <div className="extraction-box">
          <h4>Extracted Information</h4>
          <UploadedDataTable 
            data={extractedCandidates} 
            onInviteSelected={handleInviteSelectedCandidates} 
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}

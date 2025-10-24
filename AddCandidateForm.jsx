import React, { useState } from 'react';
import toast from '../../services/toastService';
import api from '../../components/utils/api.jsx';

export default function AddCandidateForm() {
  const [emails, setEmails] = useState('');
  const [description, setDescription] = useState('');
  const [assignedRole] = useState('CANDIDATE');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const parseEmails = () => {
    const lines = String(emails || '')
      .split(/\r?\n/)
      .flatMap(line => line.split(','))
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const unique = Array.from(new Set(lines));
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = unique.filter(e => EMAIL_REGEX.test(e));
    const invalidEmails = unique.filter(e => !EMAIL_REGEX.test(e));
    return { validEmails, invalidEmails };
  };

  // Unified flow: Add candidates only (no invite)
  const handleSendInvitesUnified = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { validEmails, invalidEmails } = parseEmails();

    if (validEmails.length === 0) {
      setMessage('❌ At least one valid email is required');
      toast.error('Please enter at least one valid email');
      setLoading(false);
      return;
    }

    if (invalidEmails.length > 0) {
      toast.warning(`Some emails are invalid and were skipped: ${invalidEmails.slice(0,3).join(', ')}${invalidEmails.length>3?'...':''}`);
    }

    // Add candidates (only new ones are inserted by backend)
    const addToast = toast.loading('Adding candidates...');
    try {
      const res = await api.post('/candidates', { emails: validEmails, description });
      const inserted = res?.data?.inserted ?? res?.data?.created ?? [];
      const skipped = res?.data?.skipped ?? res?.data?.duplicates ?? [];
      const insCount = Array.isArray(inserted) ? inserted.length : 0;
      const skipCount = Array.isArray(skipped) ? skipped.length : 0;
      const insPreview = Array.isArray(inserted) ? inserted.slice(0, 3).join(', ') : '';
      const skipPreview = Array.isArray(skipped) ? skipped.slice(0, 3).join(', ') : '';
      setMessage('✅ Candidates added.');
      toast.success(`Added ${insCount} new, skipped ${skipCount} existing.${insPreview ? ` New: ${insPreview}${insCount>3?'...':''}` : ''}${skipPreview ? ` | Skipped: ${skipPreview}${skipCount>3?'...':''}` : ''}`);
      // Clear inputs after successful add
      setEmails('');
      setDescription('');
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to add candidates';
      toast.error(errorMessage);
    } finally {
      toast.remove(addToast);
      setLoading(false);
    }
  };

  return (
    <div className="add-candidate-form">
      <h3>Enter the Candidate Mails</h3>
      <form onSubmit={handleSendInvitesUnified}>
        <label htmlFor="candidate-emails">Candidate Emails</label>
        <textarea
          id="candidate-emails"
          placeholder="Enter one email per line (commas also supported)"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          required
        />
        {/* Assigned Role (fixed) */}
        <label htmlFor="assigned-role">Assigned Role</label>
        <input
          id="assigned-role"
          type="text"
          placeholder="Assigned Role"
          value={assignedRole}
          readOnly
        />
        <label htmlFor="description">Designation</label>
        <input
          id="description"
          type="text"
          placeholder="Enter designation (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Add Candidate(s)'}
          </button>
        </div>
      </form>
      {message && <div className="dashboard-message">{message}</div>}
    </div>
  );
}


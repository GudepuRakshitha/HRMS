import React, { useState } from 'react';
const API_BASE = import.meta.env.VITE_API_URL;
export default function HRAddApplicationForm({ onApplicationAdded }) {
  const [candidateEmail, setCandidateEmail] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [result, setResult] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const payload = {
        candidateEmail,
        position,
        status,
        interviewDate,
        result
      };
      const response = await fetch(`${API_BASE}/hr/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add application');
      }
      const res = await response.json();
      setMessage('✅ Application added!');
      setCandidateEmail('');
      setPosition('');
      setStatus('');
      setInterviewDate('');
      setResult('');
      if (onApplicationAdded) onApplicationAdded(res.data);
    } catch (err) {
      setMessage('❌ Failed to add application.');
    }
    setLoading(false);
  };

  return (
    <form className="dashboard-form" onSubmit={handleSubmit} style={{maxWidth: 500}}>
      <h3>Add/Update Candidate Application</h3>
      <input
        type="email"
        placeholder="Candidate Email"
        value={candidateEmail}
        onChange={e => setCandidateEmail(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Position"
        value={position}
        onChange={e => setPosition(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Status (e.g. Interview Scheduled)"
        value={status}
        onChange={e => setStatus(e.target.value)}
      />
      <input
        type="datetime-local"
        placeholder="Interview Date"
        value={interviewDate}
        onChange={e => setInterviewDate(e.target.value)}
      />
      <input
        type="text"
        placeholder="Result (e.g. Selected, Rejected)"
        value={result}
        onChange={e => setResult(e.target.value)}
      />
      <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Application'}</button>
      {message && <div className="dashboard-message">{message}</div>}
    </form>
  );
}

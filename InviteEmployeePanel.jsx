import React, { useState, useEffect } from 'react';
import api from '../utils/api.jsx';
import '../../components/LeaveManagement/EmployeeList.css';
export default function InviteEmployeePanel() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEmployees = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const statusesToFetch = ['Shortlisted', 'Not Shortlisted', 'Interview Scheduled', 'On Hold', 'Selected'];
      
      const promises = statusesToFetch.map(status =>
        api.get('/hr/employees', { params: { status } })
      );

      promises.push(api.get('/hr/employees'));

      const results = await Promise.all(promises);

      const allEmployees = results.map(res => res.data);

      const uniqueEmployees = Array.from(
        new Map(allEmployees.flatMap(res => res.data).map(emp => [emp.id, emp])).values()
      );

      setEmployees(uniqueEmployees.filter(emp => !emp.invited));
    } catch (err) {
      setEmployees([]);
      setMessage(`❌ Error fetching employee data. Please try again later.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSingle = async (empId) => {
    setMessage('');
    try {
      const ccList = ccEmails.split(',').map(e => e.trim()).filter(Boolean);
      await api.post('/hr/invite', { employeeIds: [empId], ccEmails: ccList });
      setMessage('✅ Invite sent');
      fetchEmployees();
    } catch {
      setMessage('❌ Failed to send invite');
    }
  };

  // removed bulk selection and bulk invite in favor of per-row invite

  useEffect(() => {
    fetchEmployees();
  }, []);

  // apply search filter on the fly using the same approach as EmployeeList
  const visibleEmployees = (employees || []).filter(emp => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return true;
    return (
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.phone || '').toLowerCase().includes(q) ||
      (emp.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="employee-list-root">
      <h2 style={{ margin: 0, color: 'var(--color-text)'}}>Invite Employee</h2>

      {/* Controls Bar matching EmployeeList.css */}
      <div className="controls-bar">
        <div className="controls-row">
          {/* Left controls (optional chip/buttons area kept minimal) */}
          <div>
            {/* Placeholder for optional filters if added later */}
          </div>
          {/* Right side: search and actions */}
          <div className="controls-right">
            <div className="search-actions">
              <div className="search-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name, email, phone, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="employee-list-container" style={{ marginTop: 12 }}>
        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone Num</th>
              <th>Status</th>
              <th>Invite</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" className="empty-state">Loading employees...</td></tr>
            ) : visibleEmployees.length > 0 ? (
              visibleEmployees.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.name || '-'}</td>
                  <td>{emp.email}</td>
                  <td>{emp.phone || '-'}</td>
                  <td>{emp.status || 'New'}</td> 
                  <td>
                    {emp.invited ? 'Mail Sent' : (
                      <button className="text-btn sm" onClick={() => handleInviteSingle(emp.id)} disabled={isLoading}>Invite</button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="empty-state">No employees found to invite.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      <div className="dashboard-invite-panel" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          type="text"
          placeholder="CC emails (comma separated)"
          value={ccEmails}
          onChange={e => setCcEmails(e.target.value)}
          className="search-input"
          style={{ maxWidth: 400 }}
          disabled={isLoading}
        />
        {message && <div className="dashboard-message" style={{ alignSelf: 'center', color: 'var(--color-text)' }}>{message}</div>}
      </div>

    </div>
  );
}
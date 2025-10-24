import React, { useEffect, useState } from 'react';


export default function UserDashboard() {
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchApplications() {
      try {
        const user =
          JSON.parse(localStorage.getItem('user')) ||
          JSON.parse(sessionStorage.getItem('user'));
        if (!user || !user.username) {
          setMessage('❌ User not logged in or email missing.');
          return;
        }
        const response = await fetch(`/api/candidate/applications?email=${user.username}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const res = await response.json();
        setApplications(res.data);
      } catch {
        setMessage('❌ Failed to load applications.');
      }
    }
    fetchApplications();
  }, []);

  return (
    <div className="dashboard-container">
      <h1>User Dashboard</h1>
      <p>Welcome, Candidate! Check your job applications, interview status, and results here.</p>
      {message && <div className="dashboard-message">{message}</div>}
      <div className="dashboard-list">
        <table className="user-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Status</th>
              <th>Interview Date</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id}>
                <td>{app.position}</td>
                <td>{app.status}</td>
                <td>{app.interviewDate ? new Date(app.interviewDate).toLocaleString() : '-'}</td>
                <td>{app.result ? app.result : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React from 'react';

export default function Unauthorized() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>🚫 Unauthorized</h1>
      <p>You do not have permission to view this page.</p>
      <a href="/login" style={{ color: '#667eea' }}>Go back to Login</a>
    </div>
  );
}
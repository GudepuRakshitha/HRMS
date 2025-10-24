import React, { useState } from 'react';
import api from '../utils/api.jsx';


export default function SendOtp() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const emailTrimmed = (email || '').trim();
      if (!emailTrimmed) {
        setMessage('Please enter your email');
        return;
      }

      // First attempt: { email }
      let response = await api.post('/auth/send-otp', { email: emailTrimmed });
      // If server returns 400, retry with { username }
      if (response.status === 400) {
        response = await api.post('/auth/send-otp', { username: emailTrimmed });
      }

      setMessage('✅ OTP sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || '❌ Failed to send OTP.';
      setMessage(msg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Request OTP</h2>
        <form onSubmit={handleSendOtp}>
          <div className="auth-input">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="auth-btn" type="submit">Send OTP</button>
        </form>
        {message && <div className="auth-error">{message}</div>}
      </div>
    </div>
  );
}

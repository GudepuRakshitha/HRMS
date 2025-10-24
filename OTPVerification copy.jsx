import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import './styles/Auth.css';

export default function OTPVerification({ email, onVerified }) {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      if (res.data.verified) {
        setMessage('✅ OTP verified! Account activated.');
        setTimeout(() => {
          onVerified();
          navigate('/login');
        }, 1500);
      } else {
        setMessage('❌ OTP invalid or expired.');
      }
    } catch (err) {
      setMessage(err.response?.data || '❌ OTP verification failed.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>OTP Verification</h2>
        <p>Please enter the OTP sent to your email ({email})</p>
        {message && <div className="auth-error">{message}</div>}
        <form onSubmit={handleVerify}>
          <div className="auth-input">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
            />
          </div>
          <button className="auth-btn" type="submit">Verify OTP</button>
        </form>
      </div>
    </div>
  );
}

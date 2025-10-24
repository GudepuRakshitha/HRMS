import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../theme/theme';
import OTPVerification from './OTPVerification';
import logo from "../../assets/icons/logo.png";

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('CANDIDATE');
  const [error, setError] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const payload = { username, password, role };
    try {
      const response = await fetch(`/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      
      const data = await response.json();
      localStorage.setItem("token", data.token);
      setShowOTP(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const handleOTPVerified = () => {
    setTimeout(() => navigate('/login'), 1500);
  };

  if (showOTP) {
    return <OTPVerification email={username} onVerified={handleOTPVerified} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      // Background image temporarily disabled per request
      // backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${bg})`,
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--spacing-md)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Theme Toggle */}
      <button 
        onClick={toggle} 
        style={{
          position: 'fixed',
          top: 'var(--spacing-lg)',
          right: 'var(--spacing-lg)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-sm)',
          cursor: 'pointer',
          fontSize: '1.2rem',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 1000
        }}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Auth Shell: Left gradient panel + Right form panel */}
      <div style={{
        width: '100%',
        maxWidth: '760px',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-elevation)',
        background: 'var(--color-surface)',
        display: 'flex',
        overflow: 'hidden',
        border: '1px solid var(--color-border-light)'
      }}>
        {/* Left Panel (gradient) */}
        <div style={{
          flex: 1,
          background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`,
          color: 'var(--color-on-primary)',
          padding: 'var(--spacing-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '300px' }}>
            <h2 style={{ margin: 0, fontWeight: 'var(--font-weight-bold)', lineHeight: 'var(--line-height-tight)', fontSize: 'var(--font-size-xl)' }}>Create Account</h2>
            <p style={{ opacity: 0.9, marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>Registration is restricted. Please contact HR for access.</p>
          </div>
        </div>

        {/* Right Panel (content) */}
        <div style={{
          width: '100%',
          maxWidth: '360px',
          padding: 'var(--spacing-lg)'
        }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <img 
            src={logo} 
            alt="AEPL Logo" 
            style={{
              width: '48px',
              height: '48px',
              marginBottom: 'var(--spacing-sm)',
              borderRadius: '50%'
            }}
          />
          <h1 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text)',
            margin: '0 0 var(--spacing-xs) 0'
          }}>
            Registration Restricted
          </h1>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0
          }}>
            Contact HR for account access
          </p>
        </div>
        
        {/* HR Access Message */}
        <div style={{
          background: 'var(--color-warning-light)',
          border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            marginBottom: 'var(--spacing-xs)'
          }}>🔒</div>
          <h3 style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)',
            margin: '0 0 var(--spacing-xs) 0'
          }}>
            Registration Requires HR Approval
          </h3>
          <p style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            margin: '0 0 var(--spacing-sm) 0',
            lineHeight: '1.5'
          }}>
            For security reasons, new accounts can only be created by HR personnel. 
            Please contact your HR department to request access to the HRMS system.
          </p>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            📧 Contact: hraepl30@gmail.com<br/>
            📞 Phone: 9908642123
          </div>
        </div>

        {/* Hidden Form - Only for HR invited users */}
        <form onSubmit={handleRegister} style={{ display: 'none' }}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Username/Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username or email"
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>
          
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            >
              <option value="CANDIDATE">Candidate</option>
              <option value="HR">HR</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          
          {error && (
            <div style={{
              background: 'var(--color-error)',
              color: 'white',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--spacing-lg)',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            style={{
              width: '100%',
              background: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              border: 'none',
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              cursor: 'pointer',
              transition: 'background-color var(--transition-fast)',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseOver={(e) => e.target.style.background = 'var(--color-primary-hover)'}
            onMouseOut={(e) => e.target.style.background = 'var(--color-primary)'}
          >
            Register
          </button>
        </form>
        
        {/* Back to Login */}
        <div style={{
          textAlign: 'center',
          marginTop: 'var(--spacing-md)'
        }}>
          <Link 
            to="/login" 
            style={{
              display: 'inline-block',
              background: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--font-size-sm)',
              transition: 'background-color var(--transition-fast)'
            }}
            onMouseOver={(e) => e.target.style.background = 'var(--color-primary-hover)'}
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  </div>
  );
}
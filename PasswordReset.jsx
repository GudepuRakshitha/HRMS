import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../theme/theme';
import logo from "../../assets/icons/logo.png";
import api from '../utils/api.jsx';

export default function PasswordReset({ email }) {
  const location = useLocation();
  const stateEmail = location?.state?.email;
  const effectiveEmail = email || stateEmail || '';
  const [step, setStep] = useState(effectiveEmail ? 2 : 1);
  const [inputEmail, setInputEmail] = useState(effectiveEmail || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  // Strong password policy: min 8 chars, 1 uppercase, 1 number, 1 special
  const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
  const isWeakPassword = newPassword.length > 0 && !passwordRegex.test(newPassword);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const emailTrimmed = (inputEmail || '').trim();
    if (!emailTrimmed) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    try {
      // First attempt with { email }
      let response = await api.post('/auth/send-otp', { email: emailTrimmed });

      // If server rejects with 400, retry with { username }
      if (response.status === 400) {
        response = await api.post('/auth/send-otp', { username: emailTrimmed });
      }

      setInputEmail(emailTrimmed);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetWithOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const otpTrimmed = (otp || '').trim();
    if (!otpTrimmed || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Validate password strength before submission
    if (!passwordRegex.test(newPassword)) {
      setError('Password must have at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/forgot-password', { email: (inputEmail||'').trim(), otp: otpTrimmed, newPassword });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Password reset failed. Please check your OTP and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
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

      {/* Auth Card (single, compact) */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        background: 'var(--color-surface)',
        overflow: 'hidden',
        border: '1px solid var(--color-border-light)',
        padding: '24px 24px 20px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src={logo} alt="AEPL Logo" style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px 0' }}>Reset Password</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            {step === 1 ? 'Enter your email to receive OTP' : 'Enter OTP and new password'}
          </p>
        </div>

        {step === 1 && !email && (
          <form onSubmit={handleRequestOtp} style={{ maxWidth: 360, margin: '0 auto' }}>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: 6
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                  boxSizing: 'border-box',
                  opacity: loading ? 0.6 : 1
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
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
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'var(--color-border)' : 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                border: 'none',
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseOver={(e) => !loading && (e.target.style.background = 'var(--color-primary-hover)')}
              onMouseOut={(e) => !loading && (e.target.style.background = 'var(--color-primary)')}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetWithOtp} style={{ maxWidth: 360, margin: '0 auto' }}>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: 6
              }}>
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                required
                disabled={loading}
                maxLength="6"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                  boxSizing: 'border-box',
                  opacity: loading ? 0.6 : 1,
                  textAlign: 'center',
                  letterSpacing: '0.2em'
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
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewPassword(v);
                  // Show inline error immediately when weak
                  if (v && !passwordRegex.test(v)) {
                    setError('Password must have at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.');
                  } else {
                    setError('');
                  }
                }}
                placeholder="Enter new password"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                  boxSizing: 'border-box',
                  opacity: loading ? 0.6 : 1
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
              {isWeakPassword && (
                <div style={{
                  marginTop: '6px',
                  color: 'var(--color-error)',
                  fontSize: 'var(--font-size-sm)'
                }}>
                  Password must have at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: 'var(--spacing-sm)'
              }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                  boxSizing: 'border-box',
                  opacity: loading ? 0.6 : 1
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
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
              disabled={loading || isWeakPassword}
              style={{
                width: '100%',
                background: (loading || isWeakPassword) ? 'var(--color-border)' : 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                border: 'none',
                padding: '12px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: (loading || isWeakPassword) ? 'not-allowed' : 'pointer',
                transition: 'background-color var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseOver={(e) => !(loading || isWeakPassword) && (e.target.style.background = 'var(--color-primary-hover)')}
              onMouseOut={(e) => !(loading || isWeakPassword) && (e.target.style.background = 'var(--color-primary)')}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}


// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { useTheme } from '../../theme/theme';
// import logo from "../../assets/icons/logo.png";
// import api from '../utils/api.jsx';

// export default function PasswordReset({ email }) {
//   const [step, setStep] = useState(email ? 2 : 1);
//   const [inputEmail, setInputEmail] = useState(email || '');
//   const [otp, setOtp] = useState('');
//   const [newPassword, setNewPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();
//   const { theme, toggle } = useTheme();
//   // Strong password policy: min 8 chars, 1 uppercase, 1 number, 1 special
//   const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
//   const isWeakPassword = newPassword.length > 0 && !passwordRegex.test(newPassword);

//   const handleRequestOtp = async (e) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);
    
//     const emailTrimmed = (inputEmail || '').trim();
//     if (!emailTrimmed) {
//       setError('Please enter your email');
//       setLoading(false);
//       return;
//     }

//     try {
//       // First attempt with { email }
//       let response = await api.post('/auth/send-otp', { email: emailTrimmed });

//       // If server rejects with 400, retry with { username }
//       if (response.status === 400) {
//         response = await api.post('/auth/send-otp', { username: emailTrimmed });
//       }

//       setInputEmail(emailTrimmed);
//       setStep(2);
//     } catch (err) {
//       const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to send OTP. Please try again.';
//       setError(msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleResetWithOtp = async (e) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);
    
//     const otpTrimmed = (otp || '').trim();
//     if (!otpTrimmed || !newPassword || !confirmPassword) {
//       setError('Please fill in all fields');
//       setLoading(false);
//       return;
//     }

//     // Validate password strength before submission
//     if (!passwordRegex.test(newPassword)) {
//       setError('Password must have at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.');
//       setLoading(false);
//       return;
//     }

//     if (newPassword !== confirmPassword) {
//       setError('Passwords do not match');
//       setLoading(false);
//       return;
//     }

//     try {
//       await api.post('/auth/forgot-password', { email: (inputEmail||'').trim(), otp: otpTrimmed, newPassword });
//       setTimeout(() => navigate('/login'), 2000);
//     } catch (err) {
//       const msg = err.response?.data?.message || 'Password reset failed. Please check your OTP and try again.';
//       setError(msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{
//       minHeight: '100vh',
//       background: 'var(--color-bg)',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       padding: 'var(--spacing-md)',
//       fontFamily: 'system-ui, -apple-system, sans-serif'
//     }}>
//       {/* Theme Toggle */}
//       <button 
//         onClick={toggle} 
//         style={{
//           position: 'fixed',
//           top: 'var(--spacing-lg)',
//           right: 'var(--spacing-lg)',
//           background: 'var(--color-surface)',
//           border: '1px solid var(--color-border)',
//           borderRadius: 'var(--radius-md)',
//           padding: 'var(--spacing-sm)',
//           cursor: 'pointer',
//           fontSize: '1.2rem',
//           boxShadow: 'var(--shadow-sm)',
//           zIndex: 1000
//         }}
//         aria-label="Toggle theme"
//       >
//         {theme === 'light' ? '🌙' : '☀️'}
//       </button>

//       {/* Auth Card (single, compact) */}
//       <div style={{
//         width: '100%',
//         maxWidth: '420px',
//         borderRadius: '16px',
//         boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
//         background: 'var(--color-surface)',
//         overflow: 'hidden',
//         border: '1px solid var(--color-border-light)',
//         padding: '24px 24px 20px',
//         margin: '0 auto'
//       }}>
//         {/* Header */}
//         <div style={{ textAlign: 'center', marginBottom: 20 }}>
//           <img src={logo} alt="AEPL Logo" style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: 12 }} />
//           <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px 0' }}>Reset Password</h1>
//           <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
//             {step === 1 ? 'Enter your email to receive OTP' : 'Enter OTP and new password'}
//           </p>
//         </div>

//         {step === 1 && !email && (
//           <form onSubmit={handleRequestOtp} style={{ maxWidth: 360, margin: '0 auto' }}>
//             <div style={{ marginBottom: 'var(--spacing-lg)' }}>
//               <label style={{
//                 display: 'block',
//                 fontSize: 12,
//                 fontWeight: 600,
//                 color: 'var(--color-text)',
//                 marginBottom: 6
//               }}>
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 value={inputEmail}
//                 onChange={(e) => setInputEmail(e.target.value)}
//                 placeholder="Enter your email address"
//                 required
//                 disabled={loading}
//                 style={{
//                   width: '100%',
//                   padding: '12px 14px',
//                   border: '1px solid var(--color-border)',
//                   borderRadius: 8,
//                   fontSize: 14,
//                   background: 'var(--color-surface)',
//                   color: 'var(--color-text)',
//                   outline: 'none',
//                   transition: 'border-color var(--transition-fast)',
//                   boxSizing: 'border-box',
//                   opacity: loading ? 0.6 : 1
//                 }}
//                 onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
//                 onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
//               />
//             </div>
            
//             {error && (
//               <div style={{
//                 background: 'var(--color-error)',
//                 color: 'white',
//                 padding: 'var(--spacing-md)',
//                 borderRadius: 'var(--radius-md)',
//                 fontSize: 'var(--font-size-sm)',
//                 marginBottom: 'var(--spacing-lg)',
//                 textAlign: 'center'
//               }}>
//                 {error}
//               </div>
//             )}
            
//             <button 
//               type="submit"
//               disabled={loading}
//               style={{
//                 width: '100%',
//                 background: loading ? 'var(--color-border)' : 'var(--color-primary)',
//                 color: 'var(--color-on-primary)',
//                 border: 'none',
//                 padding: '12px 14px',
//                 borderRadius: 8,
//                 fontSize: 14,
//                 fontWeight: 600,
//                 cursor: loading ? 'not-allowed' : 'pointer',
//                 transition: 'background-color var(--transition-fast)',
//                 boxShadow: 'var(--shadow-sm)'
//               }}
//               onMouseOver={(e) => !loading && (e.target.style.background = 'var(--color-primary-hover)')}
//               onMouseOut={(e) => !loading && (e.target.style.background = 'var(--color-primary)')}
//             >
//               {loading ? 'Sending OTP...' : 'Send OTP'}
//             </button>
//           </form>
//         )}

//         {step === 2 && (
//           <form onSubmit={handleResetWithOtp} style={{ maxWidth: 360, margin: '0 auto' }}>
//             <div style={{ marginBottom: 'var(--spacing-lg)' }}>
//               <label style={{
//                 display: 'block',
//                 fontSize: 12,
//                 fontWeight: 600,
//                 color: 'var(--color-text)',
//                 marginBottom: 6
//               }}>
//                 OTP Code
//               </label>
//               <input
//                 type="text"
//                 value={otp}
//                 onChange={(e) => setOtp(e.target.value)}
//                 placeholder="Enter 6-digit OTP"
//                 required
//                 disabled={loading}
//                 maxLength="6"
//                 style={{
//                   width: '100%',
//                   padding: '12px 14px',
//                   border: '1px solid var(--color-border)',
//                   borderRadius: 8,
//                   fontSize: 14,
//                   background: 'var(--color-surface)',
//                   color: 'var(--color-text)',
//                   outline: 'none',
//                   transition: 'border-color var(--transition-fast)',
//                   boxSizing: 'border-box',
//                   opacity: loading ? 0.6 : 1,
//                   textAlign: 'center',
//                   letterSpacing: '0.2em'
//                 }}
//                 onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
//                 onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
//               />
//             </div>
            
//             <div style={{ marginBottom: 'var(--spacing-lg)' }}>
//               <label style={{
//                 display: 'block',
//                 fontSize: 'var(--font-size-sm)',
//                 fontWeight: 'var(--font-weight-medium)',
//                 color: 'var(--color-text)',
//                 marginBottom: 'var(--spacing-sm)'
//               }}>
//                 New Password
//               </label>
//               <input
//                 type="password"
//                 value={newPassword}
//                 onChange={(e) => {
//                   const v = e.target.value;
//                   setNewPassword(v);
//                   // Show inline error immediately when weak
//                   if (v && !passwordRegex.test(v)) {
//                     setError('Password must have at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.');
//                   } else {
//                     setError('');
//                   }
//                 }}
//                 placeholder="Enter new password"
//                 required
//                 disabled={loading}
//                 style={{
//                   width: '100%',
//                   padding: '12px 14px',
//                   border: '1px solid var(--color-border)',
//                   borderRadius: 8,
//                   fontSize: 14,
//                   background: 'var(--color-surface)',
//                   color: 'var(--color-text)',
//                   outline: 'none',
//                   transition: 'border-color var(--transition-fast)',
//                   boxSizing: 'border-box',
//                   opacity: loading ? 0.6 : 1
//                 }}
//                 onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
//                 onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
//               />
//               {isWeakPassword && (
//                 <div style={{
//                   marginTop: '6px',
//                   color: 'var(--color-error)',
//                   fontSize: 'var(--font-size-sm)'
//                 }}>
//                   Password must have at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.
//                 </div>
//               )}
//             </div>
            
//             <div style={{ marginBottom: 'var(--spacing-lg)' }}>
//               <label style={{
//                 display: 'block',
//                 fontSize: 'var(--font-size-sm)',
//                 fontWeight: 'var(--font-weight-medium)',
//                 color: 'var(--color-text)',
//                 marginBottom: 'var(--spacing-sm)'
//               }}>
//                 Confirm New Password
//               </label>
//               <input
//                 type="password"
//                 value={confirmPassword}
//                 onChange={(e) => setConfirmPassword(e.target.value)}
//                 placeholder="Confirm new password"
//                 required
//                 disabled={loading}
//                 style={{
//                   width: '100%',
//                   padding: '12px 14px',
//                   border: '1px solid var(--color-border)',
//                   borderRadius: 8,
//                   fontSize: 14,
//                   background: 'var(--color-surface)',
//                   color: 'var(--color-text)',
//                   outline: 'none',
//                   transition: 'border-color var(--transition-fast)',
//                   boxSizing: 'border-box',
//                   opacity: loading ? 0.6 : 1
//                 }}
//                 onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
//                 onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
//               />
//             </div>
            
//             {error && (
//               <div style={{
//                 background: 'var(--color-error)',
//                 color: 'white',
//                 padding: 'var(--spacing-md)',
//                 borderRadius: 'var(--radius-md)',
//                 fontSize: 'var(--font-size-sm)',
//                 marginBottom: 'var(--spacing-lg)',
//                 textAlign: 'center'
//               }}>
//                 {error}
//               </div>
//             )}
            
//             <button 
//               type="submit"
//               disabled={loading || isWeakPassword}
//               style={{
//                 width: '100%',
//                 background: (loading || isWeakPassword) ? 'var(--color-border)' : 'var(--color-primary)',
//                 color: 'var(--color-on-primary)',
//                 border: 'none',
//                 padding: '12px 14px',
//                 borderRadius: 8,
//                 fontSize: 14,
//                 fontWeight: 600,
//                 cursor: (loading || isWeakPassword) ? 'not-allowed' : 'pointer',
//                 transition: 'background-color var(--transition-fast)',
//                 boxShadow: 'var(--shadow-sm)'
//               }}
//               onMouseOver={(e) => !(loading || isWeakPassword) && (e.target.style.background = 'var(--color-primary-hover)')}
//               onMouseOut={(e) => !(loading || isWeakPassword) && (e.target.style.background = 'var(--color-primary)')}
//             >
//               {loading ? 'Resetting Password...' : 'Reset Password'}
//             </button>
//           </form>
//         )}

//         {/* Back to Login */}
//         <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--color-text-secondary)' }}>
//           Remember your password?{' '}
//           <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
//             onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
//             onMouseOut={(e) => e.target.style.textDecoration = 'none'}
//           >
//             Back to Login
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }

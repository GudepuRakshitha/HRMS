import React, { useState } from "react";
import api from "../../utils/api";
import { useNavigate, Link } from "react-router-dom";
import PasswordReset from "./PasswordReset";
import logo from "../../assets/logo.png";
import { useSession } from "../../context/SessionContext";

// Use existing stylesheet in the project
import "../../styles/Auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { setSession } = useSession();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Step 1: Call the login API and wait for the response.
      console.log("Attempting login...");
      const userData = await api.post("/auth/login", { username, password });
      console.log("Login successful, received user data:", userData);

      // Step 2: Check for a required password reset *before* saving the token.
      // This is a critical security step.
      if (userData.passwordResetRequired) {
        console.log("Password reset is required. Navigating to reset flow.");
        setResetEmail(username); // Pass the email to the reset component
        setShowReset(true);
        return; // Stop the login process here.
      }

      // Step 3: If no reset is needed, save the session data.
      // This MUST happen before we navigate away from the login page.
      if (userData.token) {
        localStorage.setItem("token", userData.token);
        console.log("Token saved to localStorage.");
      } else {
        console.error("CRITICAL: No token received from server after login!");
        setError("Login failed: Could not retrieve session token.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(userData));
      console.log("User data saved to localStorage.");

      const sessionData = {
        ...userData, // Copy all fields from the backend response
        role: userData.loginRole, // IMPORTANT: Overwrite the 'role' with the correct 'loginRole'.
      };

      // Now, use this corrected 'sessionData' object everywhere.
      localStorage.setItem("user", JSON.stringify(sessionData));
      console.log("Corrected user data saved to localStorage.");

      // Update the global session context
      setSession(sessionData);
      console.log("Global session state updated with correct role.");

      // Step 4: NOW, and only now, navigate to the correct dashboard.
      console.log(`User role is "${userData.role}". Navigating...`);
      if (sessionData.role === "HR") {
        navigate("/hr-dashboard");
      } else if (sessionData.role === "CANDIDATE") {
        navigate("/job-application");
      } else if (sessionData.role === "EMPLOYEE") {
        navigate("/employee-dashboard");
      } else {
        setError("Login successful, but your role is not authorized.");
      }
    } catch (err) {
      // This block handles errors from the api.post call
      const errorData = err.response?.data || {}; // Handle potential axios wrapper
      const errorMessage = err.message || "Invalid username or password.";
      console.error("Login failed:", errorMessage, errorData);

      // Also check for password reset on a failed login attempt (if API sends it)
      if (errorData.passwordResetRequired) {
        setResetEmail(username);
        setShowReset(true);
        return;
      }

      setError(errorMessage);
    }
  };

  if (showReset) {
    return <PasswordReset email={resetEmail} />;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img src={logo} alt="AEPL Company Logo" className="auth-logo" />

        <h2 className="auth-title">HR Management System</h2>
        <p className="auth-subtitle">Welcome to the AEPL</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="auth-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="auth-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-link-container">
            <Link to="/password-reset" className="auth-link">
              Forgot Password?
            </Link>
          </div>

          <button className="auth-btn auth-btn-primary" type="submit">
            Log In
          </button>
        </form>

        <button
          className="auth-btn auth-btn-secondary"
          type="button"
          onClick={() => alert("Admin Login Clicked!")}
        >
          Admin Login
        </button>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import api from "../../utils/api";
import { useNavigate, Link } from "react-router-dom";
import PasswordReset from "./PasswordReset";
import logo from "../../assets/logo.png";
import { useSession } from "../../context/SessionContext";

// Use existing stylesheet in the project
import "../../styles/Auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { setSession } = useSession();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { username, password });
      const userData = res.data;

      if (userData.otpRequired || userData.passwordResetRequired) {
        const prefill = username || userData.email || userData.username;
        // Save session data (so PrivateRoute can detect passwordResetRequired)
        const sessionObj = {
          ...userData,
          username: prefill,
          passwordResetRequired:
            userData?.passwordResetRequired === true ||
            userData?.passwordResetRequired === 'true' ||
            userData?.passwordResetRequired === 1,
        };
        localStorage.setItem("user", JSON.stringify(sessionObj));
        if (sessionObj.token) localStorage.setItem("token", sessionObj.token);
        setSession(sessionObj);
        // Navigate to password reset page with prefilled email
        navigate('/password-reset', { state: { email: prefill } });
        return;
      }

      localStorage.setItem("user", JSON.stringify(userData));

      // 2. We also store the token separately, which is a common pattern.
      if (userData.token) {
        localStorage.setItem("token", userData.token);
      }

      // 3. We update the global session state immediately.
      setSession(userData);

      if (userData.role === "HR") {
        navigate("/hr-dashboard");
      } else if (userData.role === "CANDIDATE") {
        navigate("/job-application");
      } else {
        setError("Unauthorized role");
      }
    } catch (err) {
      const data = err.response?.data;
      if (data && data.otpRequired) {
        setResetEmail(username);
        setShowReset(true);
        return;
      }
      setError(
        data?.message ||
          (typeof data === "string" ? data : "Invalid username or password")
      );
    }
  };

  if (showReset) {
    return <PasswordReset email={resetEmail} />;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img src={logo} alt="AEPL Company Logo" className="auth-logo" />

        <h2 className="auth-title">HR Management System</h2>
        <p className="auth-subtitle">Welcome to the AEPL</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="auth-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="auth-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-link-container">
            <Link to="/password-reset" className="auth-link">
              Forgot Password?
            </Link>
          </div>

          <button className="auth-btn auth-btn-primary" type="submit">
            Log In
          </button>
        </form>

        <button
          className="auth-btn auth-btn-secondary"
          type="button"
          onClick={() => alert("Admin Login Clicked!")}
        >
          Admin Login
        </button>
      </div>
    </div>
  );
}

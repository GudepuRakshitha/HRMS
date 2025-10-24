// src/components/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "../context/SessionContext";
import homeIcon from "../assets/icons/home.svg";
import notificationIcon from "../assets/icons/notification.svg";
import themeIcon from "../assets/icons/themeicon.svg";
import profileIcon from "../assets/icons/profile.svg";
import api from "./utils/api.jsx";

/**
 * Header Component
 *
 * Provides the top navigation bar with:
 * - Left: Home button
 * - Right: Notifications, Theme toggle, Profile, User info, Logout
 */
function Header({ theme, toggleTheme }) {
  const { session, loading, logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleOpenMenu = async () => {
    const willOpen = !menuOpen;
    setMenuOpen(willOpen);
    if (willOpen && !userInfo) {
      setInfoLoading(true);
      setInfoError("");
      try {
        const resp = await api.get("/session/me");
        setUserInfo(resp?.data || null);
      } catch (err) {
        console.error("/session/me failed", err);
        setInfoError("Failed to load user info");
      } finally {
        setInfoLoading(false);
      }
    }
  };

  return (
    <header
      className="app-header"
      style={{
        height: "64px",
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Left section */}
      <div
        className="header-left"
        style={{ display: "flex", alignItems: "center" }}
      >
        <button
          className="icon-button"
          aria-label="Home"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            border: "none",
            background: "transparent",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <img
            className="invert-on-dark"
            src={homeIcon}
            alt="Home"
            style={{ width: "20px", height: "20px", display: "block" }}
          />
        </button>
      </div>
 
      {/* Right section */}
      <div
        className="header-right"
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        {/* Notifications */}
        <button
          className="icon-button"
          aria-label="Notifications"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            border: "none",
            background: "transparent",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <img
            className="invert-on-dark"
            src={notificationIcon}
            alt="Notifications"
            style={{ width: "20px", height: "20px", display: "block" }}
          />
        </button>
 
        {/* Theme toggle */}
        <button
          className="icon-button theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            border: "none",
            background: "transparent",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <img
            className="invert-on-dark"
            src={themeIcon}
            alt="Toggle theme"
            style={{ width: "20px", height: "20px", display: "block" }}
          />
        </button>
 
        {/* User Info (compact chip) */}
        {session && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px",
              background: "var(--color-surface-variant)",
              borderRadius: "6px",
              fontSize: "14px",
              color: "var(--color-text)",
            }}
          >
            <span style={{ fontWeight: "500" }}>
              {session.username || session.name}
            </span>
            <span
              style={{
                fontSize: "12px",
                background: "var(--color-primary)",
                color: "white",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {session.role || session.loginRole}
            </span>
          </div>
        )}

        {/* Profile */}
        <button
          className="icon-button"
          aria-label="Profile"
          onClick={handleOpenMenu}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            border: "none",
            background: "transparent",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <img
            className="invert-on-dark"
            src={profileIcon}
            alt="Profile"
            style={{ width: "20px", height: "20px", display: "block" }}
          />
        </button>

        {/* Dropdown Panel */}
        {menuOpen && (
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: "56px",
              right: "16px",
              width: "280px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-md)",
              borderRadius: "10px",
              padding: "12px",
              zIndex: 1100,
            }}
          >
            <div style={{ marginBottom: "8px", fontWeight: 600, fontSize: 14 }}>
              Account
            </div>
            {infoLoading && (
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                Loading...
              </div>
            )}
            {infoError && (
              <div style={{ fontSize: 13, color: "var(--color-error)" }}>{infoError}</div>
            )}
            {!infoLoading && !infoError && (
              <div className="profile-dropdown" style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {userInfo?.name || session?.name || session?.username || "-"}
                </p>
                <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                  {userInfo?.email || session?.email || session?.username || "-"}
                </p>
                <p style={{ margin: 0 }}>
                  {userInfo?.role || session?.role || session?.loginRole || "-"}
                </p>
              </div>
            )}
            <div style={{ height: 10 }} />
            <button
              onClick={logout}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-error)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
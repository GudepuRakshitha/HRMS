// src/components/Sidebar.jsx
import "../styles/Sidebar.css";
import React, { useCallback, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getUserRole,
  isAdminOrHR,
  isEmployee,
  isCandidate,
  isExEmployee,
} from "../utils/roleUtils";

import logoUrl from "../assets/logo.png";
import menuIcon from "../assets/icons/menu.svg";
import dashboardIcon from "../assets/icons/dashboard.svg";
import employeesIcon from "../assets/icons/employees.svg";
import attendanceIcon from "../assets/icons/attendance.svg";
import recruitmentIcon from "../assets/icons/recruitment.svg";
import applicantTrackingIcon from "../assets/icons/applicantTrackingIcon.svg";
import orgTreeIcon from "../assets/icons/orgTree.svg";
import leaveIcon from "../assets/icons/leave.svg";
import jobApplicationFormIcon from "../assets/icons/jobapplicationform.svg";

function Sidebar({ collapsed, onToggle, onNavigate }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [collapsed]);

  const handleHeaderKeyDown = useCallback(
    (e) => {
      if (!collapsed) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
    [collapsed, onToggle]
  );

  // Role-based navigation items
  const getNavItems = () => {
    const userRole = getUserRole();

    // Base items for all users
    const baseItems = [];

    // HR/Admin specific items
    if (isAdminOrHR()) {
      baseItems.push(
        {
          key: "dashboard",
          icon: dashboardIcon,
          label: "Dashboard",
          path: "/dashboard",
        },
        //{ key: "hr-dashboard", icon: dashboardIcon, label: "HR Dashboard", path: "/hr-dashboard" },
        {
          key: "recruitment",
          icon: recruitmentIcon,
          label: "Recruitment",
          path: "/recruitment",
        },
        {
          key: "applicant-tracking",
          icon: applicantTrackingIcon,
          label: "Applicant Tracking",
          path: "/hr/applicant-tracking",
        },
        {
          key: "onboarding-portal",
          icon: employeesIcon,
          label: "Onboarding Portal",
          path: "/onboarding-portal",
        },
        {
          key: "org-structure",
          icon: orgTreeIcon,
          label: "Org Structure",
          path: "/org-structure",
        },
        {
          key: "attendance",
          icon: attendanceIcon,
          label: "Attendance",
          path: "/attendance",
        },
        {
          key: "leave-management",
          icon: leaveIcon,
          label: "Leave Management",
          path: "/leave-management",
        },
        {
          key: "leavemanagement",
          icon: leaveIcon,
          label: "Leave Application",
          path: "/leave-application",
        }
      );
    }

    // Employee specific items
    if (isEmployee()) {
      baseItems.push(
        {
          key: "employee-dashboard",
          icon: dashboardIcon,
          label: "Employee Dashboard",
          path: "/employee-dashboard",
        },
        {
          key: "employee-onboarding", // A unique key for this item
          icon: jobApplicationFormIcon, // We can reuse the same icon for now
          label: "My Onboarding Form", // The text that will appear in the sidebar
          path: "/employee-onboarding", // The route we created in MainLayout.jsx
        },
        {
          key: "leave-application",
          icon: leaveIcon,
          label: "Leave Application",
          path: "/leave-application",
        },
        {
          key: "attendance",
          icon: attendanceIcon,
          label: "My Attendance",
          path: "/attendance",
        },
        {
          key: "org-structure",
          icon: orgTreeIcon,
          label: "Org Structure",
          path: "/org-structure",
        }
      );
    }

    // Candidate specific items
    if (isCandidate()) {
      baseItems.push(
        {
          key: "candidate-dashboard",
          icon: dashboardIcon,
          label: "Candidate Dashboard",
          path: "/candidate-dashboard",
        },
        {
          key: "job-application",
          icon: jobApplicationFormIcon,
          label: "Job Application",
          path: "/job-application",
        }
        //{
        //  key: "application-status",
        //  icon: recruitmentIcon,
        //label: "Application Status",
        //path: "/application-status",
        //}
      );
    }

    // Alumni/Ex-Employee specific items
    if (isExEmployee()) {
      baseItems.push(
        {
          key: "alumni-dashboard",
          icon: dashboardIcon,
          label: "Alumni Dashboard",
          path: "/alumni-dashboard",
        },
        {
          key: "alumni-network",
          icon: orgTreeIcon,
          label: "Alumni Network",
          path: "/alumni-network",
        }
      );
    }

    // Fallback for unknown roles
    if (baseItems.length === 0) {
      baseItems.push({
        key: "dashboard",
        icon: dashboardIcon,
        label: "Dashboard",
        path: "/dashboard",
      });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`app-sidebar ${collapsed ? "collapsed" : "expanded"} ${
        isAnimating ? "animating" : ""
      }`}
      style={{ position: "fixed" }}
    >
      {/* Sidebar Header */}
      <div
        className="sidebar-header"
        onClick={collapsed ? onToggle : undefined}
        onKeyDown={handleHeaderKeyDown}
        role={collapsed ? "button" : undefined}
        tabIndex={collapsed ? 0 : undefined}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Sidebar header"}
      >
        <div className="logo-container">
          <img src={logoUrl} alt="AEPL Logo" className="logo-image" />
          <div className={`sidebar-title ${collapsed ? "hidden" : "visible"}`}>
            AEPL
          </div>
        </div>
        <button
          className={`collapse-btn ${collapsed ? "rotated" : ""}`}
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          <img src={menuIcon} alt="toggle" />
        </button>
        {collapsed && (
          <div className="expand-hint" aria-hidden="true">
            Expand sidebar
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");

          return (
            <Link
              key={item.key}
              to={item.path}
              className={`nav-button ${isActive ? "active" : ""} ${
                hoveredItem === item.key ? "hovered" : ""
              }`}
              aria-label={item.label}
              onClick={() => onNavigate && onNavigate(item.key)}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="nav-icon-container">
                <img src={item.icon} alt={item.label} className="nav-icon" />
                {isActive && <div className="active-indicator" />}
              </div>
              <span className={`nav-label ${collapsed ? "hidden" : "visible"}`}>
                {item.label}
              </span>
              {collapsed && hoveredItem === item.key && (
                <div className="tooltip">{item.label}</div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role indicator */}
      {!collapsed && (
        <div className="role-indicator">
          <small
            style={{ color: "#6c757d", fontSize: "10px", padding: "0 16px" }}
          >
            Role: {getUserRole() || "Unknown"}
          </small>
        </div>
      )}

      {/* Sidebar Footer */}
      <div className={`sidebar-footer ${collapsed ? "hidden" : "visible"}`}>
        <div>
          <div className="footer-text">AEPL Certified</div>
          <div className="footer-version">v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

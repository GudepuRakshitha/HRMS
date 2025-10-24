import React, { useEffect, useState, useCallback } from "react";
import { employeeService } from "../../services/apiService";
import toast from "../../services/toastService";

export default function CurrentEmployeesSimpleTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Request a larger page size to approximate all current employees
      const data = await employeeService.getCurrentEmployees({ page: 0, size: 1000, sortBy: "id", direction: "asc" });
      const content = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      setRows(content);
    } catch (err) {
      console.error("Failed to fetch current employees:", err);
      toast.error("Failed to fetch current employees");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  return (
    <div className="dashboard-list" style={{ marginTop: 20 }}>
      <h3 style={{ margin: "12px 0" }}>Current Employees (Simple)</h3>
      <div style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Role / Department</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="loading-cell">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">No employees found</td>
              </tr>
            ) : (
              rows.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.firstName || "-"}</td>
                  <td>{emp.lastName || "-"}</td>
                  <td>{emp.email || "-"}</td>
                  <td>{emp.phoneNumber || "-"}</td>
                  <td>{emp.role || emp.departmentName || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useCallback } from "react";
import { employeeService } from "../../services/apiService";
import toast from "../../services/toastService";
import useEventSource from '../../lib/useEventSource';

export default function CurrentEmployeesSimpleTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Request a larger page size to approximate all current employees
      const data = await employeeService.getCurrentEmployees({ page: 0, size: 1000, sortBy: "id", direction: "asc" });
      const content = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
      setRows(content);
    } catch (err) {
      console.error("Failed to fetch current employees:", err);
      toast.error("Failed to fetch current employees");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Subscribe to SSE employee-added events to update table in real-time
  useEventSource('employee-added', (e) => {
    try {
      const payload = JSON.parse(e.data);
      setRows(prev => {
        // dedupe by id
        const exists = prev.some(r => String(r.id) === String(payload.id));
        if (exists) {
          // merge/update existing row
          return prev.map(r => (String(r.id) === String(payload.id) ? { ...r, ...payload } : r));
        }
        return [payload, ...prev];
      });
      toast.success('Employee added successfully');
    } catch (err) {
      console.error('Failed to handle employee-added SSE', err);
    }
  });

  return (
    <div className="dashboard-list" style={{ marginTop: 20 }}>
      <h3 style={{ margin: "12px 0" }}>Current Employees (Simple)</h3>
      <div style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Role / Department</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="loading-cell">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">No employees found</td>
              </tr>
            ) : (
              rows.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.firstName || "-"}</td>
                  <td>{emp.lastName || "-"}</td>
                  <td>{emp.email || "-"}</td>
                  <td>{emp.phoneNumber || "-"}</td>
                  <td>{emp.role || emp.departmentName || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/theme';
import api from '../../components/utils/api.jsx';
import { departmentService } from '../../services/apiService';
import { validateForm, commonSchemas } from '../../utils/validation';
import axios from 'axios'; // ✅ Make sure axios is imported

export default function AddEmployeeModal({ open, onClose, onEmployeeAdded }) {
  const { theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [reportingManagers, setReportingManagers] = useState([]);
  const [reportingManagerId, setReportingManagerId] = useState('');

  // ✅ Fetch Departments & Reporting Managers when modal opens
 useEffect(() => {
  if (!open) return;

  const fetchData = async () => {
    try {
      // ✅ Fetch Departments
      const deptData = await departmentService.getDepartments();
      const list = Array.isArray(deptData) ? deptData : [];
      if (list.length > 0) {
        setDepartments(list);
      } else {
        const DEFAULT_DEPARTMENTS = [
          'Human Resources (HR)',
          'Reporting Manager',
          'Software Development',
          'Quality Assurance (QA) / Testing',
          'IT Support / Helpdesk',
          'Network & Infrastructure',
          'Cybersecurity / Information Security',
          'Database Administration (DBA)',
          'DevOps / Cloud Operations',
          'Data Analytics / Business Intelligence',
          'Product Management / IT Project Management',
        ];
        const staticList = DEFAULT_DEPARTMENTS.map((name, idx) => ({
          id: idx + 1,
          departmentName: name,
        }));
        setDepartments(staticList);
      }

      // ✅ Fetch Reporting Managers for dropdown
      const res = await axios.get("http://localhost:8080/api/managers/dropdown", {
        withCredentials: true, // important for CORS with credentials
      });

      const rmList = Array.isArray(res.data) ? res.data : [];
      setReportingManagers(rmList); // backend already returns {id, name}

    } catch (error) {
      console.error('Error fetching departments or reporting managers:', error);
    }
  };

  fetchData();
}, [open]);

  // Lock page scroll while modal is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (loading) return;
    onClose && onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    const formData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      designation,
      dateOfJoining,
      role,
      departmentId,
    };

    const { isValid, errors } = validateForm(formData, commonSchemas.employee);
    if (!isValid) {
      const errorMessages = Object.values(errors).join('\n');
      setMessage(`❌ Please fix the following errors:\n${errorMessages}`);
      setLoading(false);
      return;
    }

    const payload = {
      firstName,
      lastName,
      email,
      phoneNumber,
      designation,
      department: departmentName,
      joiningDate: dateOfJoining || null,
      username: email,
      password: 'test1234',
      loginRole: role === 'EX_EMPLOYEE' ? 'EXEMPLOYEE' : role,
      reportingManagerId, // ✅ Reporting Manager ID
    };

    try {
      const res = await api.post('/employees/add', payload);
      try { console.debug('AddEmployeeModal - raw response:', res); } catch (e) {}
      const backendMsg = res?.data?.message ?? res?.message ?? res?.data?.data?.message;
      const finalMsg = backendMsg || (res && (res.status === 201 || res.status === 200) ? '✅ Employee added successfully.' : 'ℹ️ Request completed.');
      setMessage(finalMsg);
      try { alert(finalMsg); } catch (e) {}
      onEmployeeAdded && onEmployeeAdded(finalMsg);
      try { sessionStorage.setItem('lastEmployeeMessage', finalMsg); } catch (e) {}
      try { const toast = require('../../services/toastService').default; toast && toast.success && toast.success(finalMsg); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('employeeAdded', { detail: { message: finalMsg } })); } catch (e) {}
      if (res && (res.status === 201 || res.status === 200)) {
        setTimeout(() => close(), 700);
      }
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setMessage(`❌ ${serverMsg || err.message || 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.avatar}>+</div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>Add Employee</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #94a3b8)' }}>Enter the employee details below</div>
            </div>
          </div>
          <button onClick={close} aria-label="Close" style={styles.closeBtn}>✕</button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            {/* First/Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input style={inputStyle} value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="Enter first name" required />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input style={inputStyle} value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Enter last name" required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Enter email address" required />
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input style={inputStyle} value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} placeholder="Enter phone number" required />
            </div>

            {/* Designation & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Designation</label>
                <input style={inputStyle} value={designation} onChange={(e)=>setDesignation(e.target.value)} placeholder="Enter designation" required />
              </div>
              <div>
                <label style={labelStyle}>Date of Joining</label>
                <input type="date" style={inputStyle} value={dateOfJoining} onChange={(e)=>setDateOfJoining(e.target.value)} required />
              </div>
            </div>

            {/* Role & Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Assign Role</label>
                <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="HR">HR</option>
                  <option value="CANDIDATE">Candidate</option>
                  <option value="ADMIN">Admin</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="EX_EMPLOYEE">Ex-Employee/Alumni</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Role</label>
                <select
                  style={inputStyle}
                  value={String(departmentId)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDepartmentId(val);
                    const found = departments.find(
                      (d) => String(d?.id ?? d?.departmentId) === String(val)
                    );
                    setDepartmentName(found?.departmentName ?? '');
                  }}
                >
                  <option value="">Select Role</option>
                  {departments.map((d) => {
                    const id = d?.id ?? d?.departmentId;
                    const name = d?.departmentName ?? '';
                    return (
                      <option key={String(id)} value={String(id)}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
  <label style={labelStyle}>Reporting Manager</label>
  <select
    style={inputStyle}
    value={reportingManagerId}
    onChange={(e) => setReportingManagerId(e.target.value)}
  >
    <option value="">Select Reporting Manager</option>
    {reportingManagers.length > 0 ? (
      reportingManagers.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))
    ) : (
      <option disabled>No Managers Found</option>
    )}
  </select>
</div>


            {/* Message */}
            {message && (
              <div
                style={{
                  background: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  padding: 10,
                  borderRadius: 8,
                  color: 'var(--color-text)',
                }}
              >
                {message}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.secondaryBtn} onClick={close} type="button">Cancel</button>
          <button style={styles.primaryBtn} onClick={handleSubmit} type="submit">Add</button>
        </div>
      </div>
    </div>
  );
}

// ===== STYLES =====
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8,
  background: 'var(--color-surface)', color: 'var(--color-text)'
};

const dotStyle = {
  width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', opacity: 0.5
};

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    width: 'min(720px, calc(100vw - 32px))', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 12,
    boxShadow: '0 12px 32px rgba(0,0,0,0.32)', overflow: 'hidden', maxHeight: '90vh', position: 'relative',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' },
  closeBtn: { border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#0ea5e9', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 },
  body: { padding: 16, overflow: 'auto', maxHeight: 'calc(90vh - 120px)' },
  footer: { padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' },
  secondaryBtn: { padding: '10px 16px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 8, cursor: 'pointer' },
  primaryBtn: { padding: '10px 16px', border: '1px solid var(--color-primary)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', borderRadius: 8, cursor: 'pointer' },
};

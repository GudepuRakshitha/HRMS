import React, { useEffect, useState } from 'react';

export default function GlobalNotifier() {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const handler = (e) => {
      try {
        const incoming = e?.detail?.message || e?.detail || e?.message || String(e);
        if (incoming) setMsg(incoming);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('employeeAdded', handler);

    try {
      const pending = sessionStorage.getItem('lastEmployeeMessage');
      if (pending) {
        setMsg(pending);
        sessionStorage.removeItem('lastEmployeeMessage');
      }
    } catch (e) {}

    return () => window.removeEventListener('employeeAdded', handler);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;

  return (
    <div id="global-notifier" role="status" aria-live="polite" style={{ position: 'fixed', top: 80, right: 20, zIndex: 9999, maxWidth: 420, padding: '12px 16px', background: '#064e3b', color: '#d1fae5', borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.35)', fontWeight: 600 }}>
      {msg}
    </div>
  );
}

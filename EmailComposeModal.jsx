import React, { useEffect, useRef, useState } from 'react';

export default function EmailComposeModal({
  open,
  onClose,
  onSend,
  to = '',
  subject: initialSubject = '',
  message: initialMessage = '',
  // Templates inside the modal
  typeOptions = [],
  emailType = '',
  onChangeEmailType = () => {},
  fields = [], // [{name,label,type,required}]
  dynamicFields = {},
  onChangeField = () => {},
}) {
  const [toField, setToField] = useState(to);
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage);
  const [isPreview, setIsPreview] = useState(false);

  const dialogRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setToField(to);
      setSubject(initialSubject);
      setMessage(initialMessage);
      setIsPreview(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, to, initialSubject, initialMessage]);

  // Simple drag by header
  useEffect(() => {
    const header = headerRef.current;
    const dialog = dialogRef.current;
    if (!header || !dialog) return;

    let offsetX = 0, offsetY = 0, isDown = false;

    const down = (e) => {
      isDown = true;
      const rect = dialog.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    };
    const move = (e) => {
      if (!isDown) return;
      dialog.style.left = `${Math.max(8, e.clientX - offsetX)}px`;
      dialog.style.top = `${Math.max(8, e.clientY - offsetY)}px`;
      dialog.style.transform = 'none';
      dialog.style.position = 'fixed';
    };
    const up = () => {
      isDown = false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    header.addEventListener('mousedown', down);
    return () => header.removeEventListener('mousedown', down);
  }, []);

  if (!open) return null;

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.modal} ref={dialogRef}>
        <div style={styles.header} ref={headerRef}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-text)' }}>Compose Email</h3>
          <button onClick={onClose} aria-label="Close" style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {isPreview ? (
            <div>
              <div style={styles.previewRow}><span style={styles.previewLabel}>To:</span> {toField || '—'}</div>
              <div style={styles.previewRow}><span style={styles.previewLabel}>Subject:</span> {subject || '—'}</div>
              <div style={styles.previewMessage}><pre style={styles.pre}>{message || ''}</pre></div>
            </div>
          ) : (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Email Type</label>
                <select
                  value={emailType}
                  onChange={(e) => onChangeEmailType(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Select type…</option>
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {emailType && fields?.length > 0 && (
                <div style={styles.grid}>
                  {fields.map((field) => (
                    <div style={styles.field} key={field.name}>
                      <label style={styles.label}>{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          value={dynamicFields[field.name] || ''}
                          onChange={(e) => onChangeField(field.name, e.target.value)}
                          style={{ ...styles.input, minHeight: 96 }}
                        />
                      ) : (
                        <input
                          type={field.type || 'text'}
                          value={dynamicFields[field.name] || ''}
                          onChange={(e) => onChangeField(field.name, e.target.value)}
                          style={styles.input}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>To</label>
                <input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  value={toField}
                  onChange={(e) => setToField(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Subject</label>
                <input
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Message</label>
                <textarea
                  rows={8}
                  placeholder="Write your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ ...styles.input, minHeight: 160 }}
                />
              </div>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.secondaryBtn} onClick={() => setIsPreview(p => !p)}>
            {isPreview ? 'Back to Edit' : 'Preview'}
          </button>
          <button style={styles.secondaryBtn} onClick={onClose}>Cancel</button>
          <button style={styles.primaryBtn} onClick={() => onSend?.({ to: toField, subject, message })}>Send</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    width: 'min(720px, calc(100vw - 32px))', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 12,
    boxShadow: '0 12px 32px rgba(0,0,0,0.32)', overflow: 'hidden', maxHeight: '90vh', position: 'relative',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'move' },
  closeBtn: { border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer' },
  body: { padding: 16, overflow: 'auto', maxHeight: 'calc(90vh - 120px)' },
  footer: { padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  label: { fontWeight: 600, fontSize: 14, color: 'var(--color-text)' },
  input: { padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--color-surface)', color: 'var(--color-text)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 },
  secondaryBtn: { padding: '10px 16px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: 8, cursor: 'pointer' },
  primaryBtn: { padding: '10px 16px', border: '1px solid var(--color-primary)', background: 'var(--color-primary)', color: 'var(--color-on-primary)', borderRadius: 8, cursor: 'pointer' },
  previewRow: { marginBottom: 8, fontSize: 14, color: 'var(--color-text)' },
  previewLabel: { color: 'var(--color-text-secondary, #94a3b8)', marginRight: 6 },
  previewMessage: { border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', background: 'var(--color-surface)', color: 'var(--color-text)' },
  pre: { whiteSpace: 'pre-wrap', margin: 0, color: 'var(--color-text)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 13 },
};

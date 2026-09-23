'use client';

import { useState } from 'react';
import { submitSRDRequestAction } from '@/actions/requests';

interface SRDRequestFormProps {
  onSuccess?: () => void;
}

export default function SRDRequestForm({ onSuccess }: SRDRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await submitSRDRequestAction(formData);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      onSuccess?.();
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '0.35rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  if (success) {
    return (
      <div
        style={{
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(15, 118, 110, 0.08)',
          border: '1px solid rgba(15, 118, 110, 0.35)',
          color: '#0F766E',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
        <div style={{ fontWeight: 700 }}>SRD Request Submitted Successfully</div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.85 }}>
          Your request is now pending approval by your Operations Manager.
        </div>
        <button
          onClick={() => setSuccess(false)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(16,185,129,0.4)',
            background: 'rgba(16,185,129,0.15)',
            color: '#34d399',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={labelStyle} htmlFor="srd-originalRestDay">
            Original Rest Day (Day of Week)
          </label>
          <select
            id="srd-originalRestDay"
            name="originalRestDay"
            required
            style={fieldStyle}
          >
            <option value="">Select rest day…</option>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle} htmlFor="srd-dateNotWorking">
              Date Not Working
            </label>
            <input
              type="date"
              id="srd-dateNotWorking"
              name="dateNotWorking"
              required
              style={fieldStyle}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
              The day you will be absent (your rest day)
            </span>
          </div>
          <div>
            <label style={labelStyle} htmlFor="srd-switchedWorkDate">
              Will Work Instead On
            </label>
            <input
              type="date"
              id="srd-switchedWorkDate"
              name="switchedWorkDate"
              required
              style={fieldStyle}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
              The day you will work instead
            </span>
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="srd-reason">
            Reason for Switch
          </label>
          <textarea
            id="srd-reason"
            name="reason"
            rows={3}
            required
            minLength={5}
            placeholder="Please provide a clear reason for this schedule switch…"
            style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
              fontSize: '0.875rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.7rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: loading ? 'var(--bg-secondary)' : 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Submitting…' : 'Submit SRD Request'}
        </button>
      </div>
    </form>
  );
}

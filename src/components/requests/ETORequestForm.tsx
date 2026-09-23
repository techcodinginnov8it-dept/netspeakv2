'use client';

import { useState } from 'react';
import { submitEarlyTimeOffAction } from '@/actions/requests';

interface ETORequestFormProps {
  onSuccess?: () => void;
}

export default function ETORequestForm({ onSuccess }: ETORequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!acknowledged) {
      setError('You must acknowledge the pre-departure checklist before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set('checklistAcknowledged', 'true');

    const result = await submitEarlyTimeOffAction(formData);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setAcknowledged(false);
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
        <div style={{ fontWeight: 700 }}>ETO Request Submitted</div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.4rem', opacity: 0.85 }}>
          Your Operations Manager has <strong>30 minutes</strong> to review and reject your request.
          If no action is taken, it will be <strong>auto-approved</strong>.
        </div>
        <button
          onClick={() => setSuccess(false)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(15,118,110,0.35)',
            background: 'rgba(15,118,110,0.08)',
            color: '#0F766E',
            fontWeight: 600,
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

        {/* 30-min auto-approval notice */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#fcd34d',
            fontSize: '0.85rem',
            lineHeight: 1.55,
          }}
        >
          <strong>⏱ Auto-Approval Policy:</strong> Your Operations Manager has 30 minutes to reject
          this request. If no action is taken within 30 minutes, this request will be automatically approved.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle} htmlFor="eto-shiftDate">
              Shift Date
            </label>
            <input
              type="date"
              id="eto-shiftDate"
              name="shiftDate"
              required
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="eto-timeOffStart">
              Requested Time-Off Start
            </label>
            <input
              type="datetime-local"
              id="eto-timeOffStart"
              name="timeOffStart"
              required
              style={fieldStyle}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
              The exact time you need to leave early
            </span>
          </div>
        </div>

        <div>
          <label style={labelStyle} htmlFor="eto-reason">
            Reason for Early Time-Off
          </label>
          <textarea
            id="eto-reason"
            name="reason"
            rows={3}
            required
            minLength={5}
            placeholder="Please provide a clear and honest reason…"
            style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Pre-departure checklist acknowledgment */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-secondary)',
            border: `1px solid ${acknowledged ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}`,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
            📋 Pre-Departure Checklist
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <div>✓ I have verified there are no back-to-back sessions still in progress</div>
            <div>✓ I have briefed my team lead / colleague on any pending items</div>
            <div>✓ I have ensured no client sessions will be left unattended</div>
            <div>✓ I understand early departure may affect my performance metrics</div>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: acknowledged ? '#0F766E' : 'var(--text-main)',
            }}
          >
            <input
              type="checkbox"
              id="eto-checklist"
              name="checklistAcknowledged"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
            I confirm I have completed all items on this checklist and understand the consequences of an early departure.
          </label>
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
          disabled={loading || !acknowledged}
          style={{
            padding: '0.7rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: !acknowledged || loading ? 'var(--bg-secondary)' : 'var(--color-primary)',
            color: !acknowledged ? 'var(--text-dim)' : '#fff',
            fontWeight: 600,
            cursor: loading || !acknowledged ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Submitting…' : 'Submit ETO Request'}
        </button>
      </div>
    </form>
  );
}

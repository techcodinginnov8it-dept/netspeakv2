'use client';

import { useState } from 'react';
import { submitCashLoanRequestAction } from '@/actions/requests';

export default function CashLoanRequestForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('5000');
  const [termMonths, setTermMonths] = useState('6');
  const [reason, setReason] = useState('');
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set('amount', amount);
    formData.set('termMonths', termMonths);
    formData.set('reason', reason);
    formData.set('termsAcknowledged', String(termsAcknowledged));

    const result = await submitCashLoanRequestAction(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setSuccess('Cash loan request submitted successfully. Pending manager review.');
    setReason('');
    setAmount('5000');
    setTermMonths('6');
    setTermsAcknowledged(false);
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.45rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    padding: '0.75rem 0.9rem',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label htmlFor="loan-amount" style={labelStyle}>Loan Amount (PHP)</label>
        <input
          id="loan-amount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={inputStyle}
          required
        />
      </div>

      <div>
        <label htmlFor="loan-term" style={labelStyle}>Repayment Term (months)</label>
        <input
          id="loan-term"
          type="number"
          min="1"
          max="24"
          value={termMonths}
          onChange={(e) => setTermMonths(e.target.value)}
          style={inputStyle}
          required
        />
      </div>

      <div>
        <label htmlFor="loan-reason" style={labelStyle}>Reason for Loan</label>
        <textarea
          id="loan-reason"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="State the purpose and repayment plan."
          style={{ ...inputStyle, resize: 'vertical' }}
          required
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0' }}>
        <input
          id="loan-terms"
          type="checkbox"
          checked={termsAcknowledged}
          onChange={(e) => setTermsAcknowledged(e.target.checked)}
          style={{ marginTop: '0.2rem' }}
        />
        <label htmlFor="loan-terms" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          I acknowledge that the repayment will be deducted across the approved schedule and that this request is subject to manager review.
        </label>
      </div>

      {error && (
        <div style={{ color: '#DC2626', fontWeight: 600, fontSize: '0.82rem' }}>{error}</div>
      )}

      {success && (
        <div style={{ color: '#0F766E', fontWeight: 600, fontSize: '0.82rem' }}>{success}</div>
      )}

      <button
        type="submit"
        disabled={loading || !termsAcknowledged}
        style={{
          padding: '0.8rem 1rem',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: loading || !termsAcknowledged ? 'rgba(0,82,204,0.36)' : 'var(--ns-blue)',
          color: '#fff',
          fontWeight: 700,
          cursor: loading || !termsAcknowledged ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Submitting…' : 'Submit Cash Loan Request'}
      </button>
    </form>
  );
}

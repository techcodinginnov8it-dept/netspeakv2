'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction } from '@/actions/passwordReset';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await requestPasswordResetAction(identifier);
      if (res.success) {
        setMessage(res.message);
      } else {
        setError(res.message);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'var(--font-body)',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
          border: '1px solid #E2E8F0',
          padding: '2.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(0, 82, 204, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: '1.75rem',
            }}
          >
            🔑
          </div>
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Forgot Password
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
            Enter your username or email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {message ? (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📨</div>
            <p style={{ fontSize: '0.9rem', color: '#065F46', lineHeight: 1.5, margin: 0 }}>
              {message}
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <Link
                href="/login"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--ns-blue)',
                  textDecoration: 'none',
                }}
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                  color: '#DC2626',
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="identifier"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.45rem',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                Username or Corporate Email
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. jdelacruz or juan@netspeak.ph"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  background: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '10px',
                  fontSize: '0.92rem',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.4rem',
                padding: '0.85rem 1.25rem',
                background: loading
                  ? '#94A3B8'
                  : 'linear-gradient(135deg, var(--ns-blue) 0%, #0040A8 100%)',
                color: '#ffffff',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(0, 82, 204, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? 'Dispatching Reset Link...' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link
                href="/login"
                style={{
                  fontSize: '0.875rem',
                  color: '#64748B',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                ← Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

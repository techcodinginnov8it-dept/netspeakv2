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
        background: 'var(--bg-page)',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(26,86,219,0.06) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(14,165,121,0.05) 0px, transparent 50%)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card-glass"
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--border-light)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'var(--grad-brand-vivid)',
          }}
        />
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(26,86,219,0.12) 0%, rgba(14,165,121,0.08) 100%)',
              border: '1px solid rgba(26,86,219,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: '1.75rem',
              boxShadow: 'var(--shadow-xs)',
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
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.92rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  transition: 'var(--transition-fast)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ns-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26, 86, 219, 0.18)';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'var(--bg-surface)';
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
                  : 'linear-gradient(135deg, var(--ns-blue) 0%, #1240a8 100%)',
                color: '#ffffff',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(26, 86, 219, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(26, 86, 219, 0.45)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(26, 86, 219, 0.35)';
                }
              }}
            >
              {loading ? 'Dispatching Reset Link...' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link
                href="/login"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ns-blue)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
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

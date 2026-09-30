'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordAction } from '@/actions/passwordReset';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await resetPasswordAction(token, password);
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(res.message);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.5rem' }}>
          Invalid or Missing Token
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem' }}>
          The password reset link appears to be invalid. Please request a new link.
        </p>
        <Link
          href="/forgot-password"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.25rem',
            background: 'var(--ns-blue)',
            color: '#FFFFFF',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <div>
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
          🔐
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
          Create New Password
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
          Your new password must be at least 8 characters long.
        </p>
      </div>

      {success ? (
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
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
          <p style={{ fontSize: '0.9rem', color: '#065F46', lineHeight: 1.5, margin: 0 }}>
            {success}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#047857', marginTop: '0.75rem' }}>
            Redirecting to sign in page...
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Link
              href="/login"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--ns-blue)',
                textDecoration: 'none',
              }}
            >
              Sign In Now →
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
              htmlFor="new-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '0.45rem',
                fontFamily: 'var(--font-heading)',
              }}
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

          <div>
            <label
              htmlFor="confirm-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '0.45rem',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div>Loading password reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}

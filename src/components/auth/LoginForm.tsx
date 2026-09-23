'use client';

import { useActionState } from 'react';
import { loginAction, LoginActionState } from '@/actions/auth';

const initialState: LoginActionState = {};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {state?.error && (
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
          <span>{state.error}</span>
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
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '0.9rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1rem',
            color: '#94A3B8',
            pointerEvents: 'none',
          }}>
            👤
          </span>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            placeholder="admin or user@netspeak.com"
            style={{
              width: '100%',
              padding: '0.75rem 0.9rem 0.75rem 2.5rem',
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '0.92rem',
              color: '#0F172A',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--ns-blue)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.15)';
              e.currentTarget.style.background = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = '#F8FAFC';
            }}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          style={{
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#334155',
            marginBottom: '0.45rem',
            fontFamily: 'var(--font-heading)',
          }}
        >
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: '0.9rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1rem',
            color: '#94A3B8',
            pointerEvents: 'none',
          }}>
            🔒
          </span>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '0.75rem 0.9rem 0.75rem 2.5rem',
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '0.92rem',
              color: '#0F172A',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--ns-blue)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 82, 204, 0.15)';
              e.currentTarget.style.background = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = '#F8FAFC';
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          marginTop: '0.4rem',
          padding: '0.85rem 1.25rem',
          background: isPending
            ? '#94A3B8'
            : 'linear-gradient(135deg, var(--ns-blue) 0%, #0040A8 100%)',
          color: '#ffffff',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          border: 'none',
          cursor: isPending ? 'not-allowed' : 'pointer',
          boxShadow: isPending ? 'none' : '0 4px 14px rgba(0, 82, 204, 0.3)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
        onMouseEnter={(e) => {
          if (!isPending) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 82, 204, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isPending) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 82, 204, 0.3)';
          }
        }}
      >
        {isPending ? (
          <>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>Sign In to Portal</span>
            <span>→</span>
          </>
        )}
      </button>
    </form>
  );
}

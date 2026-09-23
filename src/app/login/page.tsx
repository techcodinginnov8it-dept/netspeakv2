import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Sign In — Netspeak Portal',
  description: 'Sign in to the Netspeak ESL Operations Management Portal',
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'var(--font-body)',
    }}>
      {/* LEFT PANEL — Brand visual */}
      <div style={{
        flex: '1 1 55%',
        background: 'var(--grad-brand)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background geometric decoration */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '-30px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(244,196,48,0.12)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{
          width: '88px',
          height: '88px',
          borderRadius: '24px',
          background: '#FFFFFF',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          boxShadow: '0 12px 35px rgba(0,0,0,0.25)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Netspeak Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2.25rem',
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.15,
          marginBottom: '1rem',
          letterSpacing: '-0.02em',
        }}>
          Netspeak Portal
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.82)',
          textAlign: 'center',
          fontSize: '1rem',
          lineHeight: 1.6,
          maxWidth: '340px',
          marginBottom: '3rem',
        }}>
          Centralized ESL Operations Management System for the Netspeak team
        </p>

        {/* Feature pills */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem',
          justifyContent: 'center',
          maxWidth: '380px',
        }}>
          {[
            { icon: '⚡', label: 'Operations Tracking' },
            { icon: '👥', label: 'Staff Management' },
            { icon: '📊', label: 'Reports & Analytics' },
            { icon: '🔔', label: 'Smart Notifications' },
            { icon: '📋', label: 'Audit Trails' },
            { icon: '🎓', label: 'New Hire Onboarding' },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.13)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: '0.78rem',
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
            }}>
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — Login form */}
      <div style={{
        flex: '0 0 420px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2.5rem',
      }}>
        {/* Top accent */}
        <div style={{
          width: '100%',
          height: '4px',
          background: 'var(--grad-brand)',
          borderRadius: 'var(--radius-full)',
          marginBottom: '2.5rem',
        }} />

        <div style={{ width: '100%', maxWidth: '340px' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.35rem',
            }}>
              Welcome back 👋
            </h2>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}>
              Sign in to your Netspeak Portal account
            </p>
          </div>

          {/* The form */}
          <LoginForm />

          {/* Teacher Registration Link */}
          <div style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}>
            New ESL Teacher applicant?{' '}
            <Link
              href="/register"
              style={{
                color: 'var(--ns-blue)',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Apply / Register here →
            </Link>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--ns-green)',
              display: 'inline-block',
              flexShrink: 0,
            }} />
            Secure application-managed authentication · RBAC enforced
          </div>
        </div>
      </div>
    </main>
  );
}

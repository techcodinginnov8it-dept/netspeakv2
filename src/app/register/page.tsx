import React from 'react';
import TeacherRegistrationForm from '@/components/teachers/TeacherRegistrationForm';
import Link from 'next/link';

export const metadata = {
  title: 'Teacher Registration | Netspeak Portal',
  description: 'Online ESL Teacher Registration and Onboarding Portal',
};

export default function RegisterPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0A192F 0%, #0052CC 50%, #17B978 100%)',
      padding: '40px 20px',
      position: 'relative',
    }}>
      {/* Background soft glow decoration */}
      <div style={{
        position: 'fixed',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(23, 185, 120, 0.15) 0%, transparent 70%)',
        top: '-100px',
        right: '-100px',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 900, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '6px 16px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            fontSize: '0.82rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            marginBottom: '16px',
            backdropFilter: 'blur(8px)',
            fontFamily: 'var(--font-heading)',
          }}>
            <span>🌐</span>
            <span>NETSPEAK ESL TALENT PORTAL</span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '10px',
            color: '#FFFFFF',
            fontFamily: 'var(--font-heading)',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}>
            ESL Teacher Onboarding &amp; Profile Setup
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1rem',
            maxWidth: 600,
            margin: '0 auto 1.5rem auto',
            lineHeight: 1.6,
          }}>
            Complete your teacher profile to join the Netspeak ESL Operations team. Once submitted, center administrators and operations managers will review and approve your application.
          </p>

          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--ns-gold)',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
              background: 'rgba(0,0,0,0.25)',
              padding: '0.4rem 0.9rem',
              borderRadius: '999px',
              border: '1px solid rgba(244, 196, 48, 0.3)',
            }}
          >
            ← Already have an account? Sign in here
          </Link>
        </div>

        {/* Multi-step Registration Form Card Container */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <TeacherRegistrationForm />
        </div>
      </div>
    </div>
  );
}

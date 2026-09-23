import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        padding: '2.5rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        maxWidth: '450px',
        width: '100%'
      }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          The requested page does not exist or has been relocated within the portal.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '0.6rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '0.9rem'
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        maxWidth: '500px',
        width: '100%'
      }}>
        <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Application Error</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          {error.message || 'An unexpected error occurred while processing your request.'}
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '0.6rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

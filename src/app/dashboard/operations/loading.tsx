import React from 'react';

export default function OperationsLoading() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '32px', width: '380px' }} />
        <div className="skeleton" style={{ height: '16px', width: '500px' }} />
      </div>

      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton" style={{ height: '24px', width: '260px' }} />
            <div className="skeleton" style={{ height: '14px', width: '220px' }} />
          </div>
          <div className="skeleton" style={{ height: '40px', width: '160px', borderRadius: 'var(--radius-sm)' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <div className="skeleton" style={{ height: '32px', width: '100px', borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ height: '32px', width: '100px', borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ height: '32px', width: '100px', borderRadius: 'var(--radius-sm)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ height: '16px', width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function AttendanceLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '30px', width: '380px' }} />
        <div className="skeleton" style={{ height: '16px', width: '600px' }} />
      </div>

      {/* KPI Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton" style={{ height: '14px', width: '100px' }} />
            <div className="skeleton" style={{ height: '32px', width: '60px' }} />
          </div>
        ))}
      </div>

      {/* Filter bar and Table Skeleton */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: '34px', width: '80px', borderRadius: 'var(--radius-sm)' }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: '36px', width: '240px', borderRadius: 'var(--radius-sm)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr',
                gap: '16px',
                padding: '12px 8px',
                borderBottom: '1px solid var(--border-light)',
                alignItems: 'center',
              }}
            >
              <div className="skeleton" style={{ height: '18px', width: '80%' }} />
              <div className="skeleton" style={{ height: '16px', width: '70%' }} />
              <div className="skeleton" style={{ height: '16px', width: '60%' }} />
              <div className="skeleton" style={{ height: '24px', width: '50px', borderRadius: 'var(--radius-sm)' }} />
              <div className="skeleton" style={{ height: '16px', width: '60%' }} />
              <div className="skeleton" style={{ height: '22px', width: '70px', borderRadius: 'var(--radius-full)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

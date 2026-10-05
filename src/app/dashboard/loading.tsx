import React from 'react';

export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner Skeleton */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(26,86,219,0.18) 0%, rgba(14,165,121,0.14) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.9rem 2.25rem',
          border: '1px solid rgba(26,86,219,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '55%' }}>
          <div className="skeleton" style={{ height: '12px', width: '100px', borderRadius: 'var(--radius-full)' }} />
          <div className="skeleton" style={{ height: '34px', width: '280px', borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ height: '14px', width: '320px', borderRadius: 'var(--radius-sm)' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="skeleton" style={{ height: '28px', width: '90px', borderRadius: 'var(--radius-full)' }} />
          <div className="skeleton" style={{ height: '28px', width: '80px', borderRadius: 'var(--radius-full)' }} />
        </div>
      </div>

      {/* Attendance & Shift Card Skeleton */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton" style={{ height: '22px', width: '220px', borderRadius: 'var(--radius-sm)' }} />
            <div className="skeleton" style={{ height: '14px', width: '280px', borderRadius: 'var(--radius-sm)' }} />
          </div>
          <div className="skeleton" style={{ height: '30px', width: '160px', borderRadius: 'var(--radius-full)' }} />
        </div>
        <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: 'var(--radius-sm)', opacity: 0.4 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
          <div className="skeleton" style={{ height: '16px', width: '180px', borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ height: '42px', width: '240px', borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>
    </div>
  );
}

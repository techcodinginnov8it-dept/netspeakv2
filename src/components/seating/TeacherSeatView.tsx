'use client';

import React from 'react';
import { SeatStatus } from '@prisma/client';
import type { TeacherSeatInfo } from '@/actions/seating';

const STATUS_CONFIG: Record<SeatStatus, { label: string; bg: string; text: string; icon: string }> = {
  AVAILABLE: { label: 'Available', bg: 'rgba(13,148,136,0.12)', text: '#0F766E', icon: '✅' },
  OCCUPIED:  { label: 'Occupied',  bg: 'rgba(0,82,204,0.12)',   text: '#0052CC', icon: '🪑' },
  PENDING_REFORMAT: { label: 'Pending Reformat', bg: 'rgba(217,119,6,0.15)', text: '#B45309', icon: '⚠️' },
  UNDER_REFORMAT:   { label: 'Under Reformat',   bg: 'rgba(220,38,38,0.15)', text: '#DC2626', icon: '🔧' },
  RESERVED:  { label: 'Reserved',  bg: 'rgba(125,110,216,0.12)',text: '#6D28D9', icon: '🔒' },
};

export default function TeacherSeatView({ seat }: { seat?: TeacherSeatInfo }) {
  if (!seat) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem 1rem' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🪑</div>
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.25rem' }}>
            No Seat Assignment
          </h2>
          <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: '0.9rem' }}>
            You have not been assigned to a workstation yet. Contact your Operations Manager for seat assignment.
          </p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[seat.status];
  const assignedDate = new Date(seat.assignedAt).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          🪑 My Seat Assignment
        </h1>
        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.875rem' }}>
          Your current workstation and seating information.
        </p>
      </div>

      {/* Seat Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Card Header Strip */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))',
          borderBottom: '1px solid var(--border-color)',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '52px', height: '52px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(37,99,235,0.25)',
            border: '1px solid rgba(37,99,235,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem',
          }}>
            🖥️
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {seat.workstationNo}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {seat.branch}
            </div>
          </div>
          {/* Status badge */}
          <div style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.9rem',
            borderRadius: '100px',
            background: cfg.bg,
            color: cfg.text,
            fontSize: '0.78rem', fontWeight: 600,
          }}>
            {cfg.icon} {cfg.label}
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <InfoRow label="Branch" value={seat.branch} icon="🏢" />
          <InfoRow label="Seat Number" value={seat.seatNo} icon="🔢" />
          <InfoRow label="Workstation" value={seat.workstationNo} icon="🖥️" />
          <InfoRow label="Schedule" value={seat.schedule || 'Not specified'} icon="⏰" />
          <div style={{ gridColumn: '1 / -1' }}>
            <InfoRow label="Assigned Since" value={assignedDate} icon="📅" />
          </div>
        </div>

        {/* Note */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          padding: '1rem 1.75rem',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            ℹ️ If your seat assignment is incorrect or needs to be updated, please reach out to your Operations Manager or submit a concern ticket.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

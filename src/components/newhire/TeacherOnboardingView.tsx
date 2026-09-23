'use client';

import React from 'react';
import { RequirementStatus, OnboardingStatus } from '@prisma/client';

export type OnboardingRequirementItem = {
  id: string;
  requirementKey: string;
  label: string;
  status: RequirementStatus;
  completedAt?: string | null;
  notes?: string | null;
};

export type OnboardingRecordProps = {
  id: string;
  startDate: string;
  branch: string;
  project: string;
  status: OnboardingStatus;
  completionPct: number;
  slotsEligible: boolean;
  slotsEligibleAt?: string | null;
  requirements: OnboardingRequirementItem[];
};

const STATUS_CFG: Record<RequirementStatus, { label: string; bg: string; text: string; icon: string }> = {
  PENDING:   { label: 'Pending',   bg: 'rgba(107,114,128,0.12)', text: '#6B7280', icon: '⏳' },
  COMPLETED: { label: 'Completed', bg: 'rgba(15,118,110,0.1)',    text: '#0F766E', icon: '✅' },
  MISSING:   { label: 'Missing',   bg: 'rgba(220,38,38,0.1)',    text: '#DC2626', icon: '❌' },
  VERIFIED:  { label: 'Verified',  bg: 'rgba(0,82,204,0.1)',     text: 'var(--ns-blue)', icon: '🔵' },
};

const ONBOARDING_CFG: Record<OnboardingStatus, { label: string; color: string }> = {
  IN_PROGRESS:    { label: 'In Progress',     color: '#B45309' },
  COMPLETED:      { label: 'Completed',        color: '#0F766E' },
  OVERDUE:        { label: 'Overdue',          color: '#DC2626' },
  SLOTS_ELIGIBLE: { label: 'Slots Eligible ✅', color: '#0F766E' },
};

export default function TeacherOnboardingView({ record }: { record?: OnboardingRecordProps }) {
  if (!record) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1rem' }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', padding: '3rem 2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎓</div>
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.25rem' }}>
            No Onboarding Record
          </h2>
          <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: '0.9rem' }}>
            Your onboarding record hasn't been created yet. Contact your Admin or Operations Manager.
          </p>
        </div>
      </div>
    );
  }

  const startDate = new Date(record.startDate);
  const today = new Date();
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 3 - daysSinceStart);
  const statusCfg = ONBOARDING_CFG[record.status];

  // SVG progress ring
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (record.completionPct / 100) * circumference;

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          🎓 My Onboarding Progress
        </h1>
        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.875rem' }}>
          Complete all requirements to become eligible to open class slots.
        </p>
      </div>

      {/* Summary Card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', padding: '1.5rem 1.75rem',
        display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1.5rem',
        alignItems: 'center', marginBottom: '1.5rem',
      }}>
        {/* Progress Ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke={record.completionPct === 100 ? '#0F766E' : 'var(--ns-blue)'}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
              fill="var(--text-primary)" fontSize="16" fontWeight="700">{record.completionPct}%</text>
          </svg>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Complete</div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <InfoBlock label="Branch" value={record.branch} icon="🏢" />
          <InfoBlock label="Project" value={record.project} icon="📁" />
          <InfoBlock label="Start Date" value={startDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} icon="📅" />
          <InfoBlock label="Status" value={statusCfg.label} icon="📊" valueColor={statusCfg.color} />
          <div style={{ gridColumn: '1 / -1' }}>
            {record.slotsEligible ? (
              <div style={{
                background: 'rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.3)',
                borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem',
                color: '#0F766E', fontWeight: 700, fontSize: '0.875rem', textAlign: 'center',
              }}>
                ✅ You are eligible to open class slots!
                {record.slotsEligibleAt && (
                  <span style={{ fontWeight: 500, marginLeft: '0.5rem', color: '#0F766E' }}>
                    (Granted {new Date(record.slotsEligibleAt).toLocaleDateString('en-PH')})
                  </span>
                )}
              </div>
            ) : (
              <div style={{
                background: daysRemaining > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(0,82,204,0.08)',
                border: `1px solid ${daysRemaining > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(0,82,204,0.3)'}`,
                borderRadius: 'var(--radius-sm)', padding: '0.65rem 1rem',
                color: daysRemaining > 0 ? '#B45309' : 'var(--ns-blue)',
                fontWeight: 600,
                fontSize: '0.875rem', textAlign: 'center',
              }}>
                {daysRemaining > 0
                  ? `⏳ ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining in minimum window before slot eligibility`
                  : '⏳ Awaiting Admin verification to grant slot eligibility'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requirements Checklist */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)',
          fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)',
        }}>
          📋 Requirements Checklist ({record.requirements.filter(r => r.status === 'COMPLETED' || r.status === 'VERIFIED').length}/{record.requirements.length} done)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Requirement', 'Status', 'Completed'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {record.requirements.map((req, i) => {
                const cfg = STATUS_CFG[req.status];
                return (
                  <tr key={req.id} style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {req.label}
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.2rem 0.65rem', borderRadius: '100px',
                        background: cfg.bg, color: cfg.text, fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {req.completedAt ? new Date(req.completedAt).toLocaleDateString('en-PH') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, icon, valueColor }: { label: string; value: string; icon: string; valueColor?: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>{icon} {label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: valueColor || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

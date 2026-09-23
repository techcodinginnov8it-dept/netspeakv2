'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export type ManagementDashboardData = {
  // Teacher Overview
  teacherStats: {
    totalTeachers: number;
    activeTeachers: number;
    onLeaveTeachers: number;
    resignedTeachers: number;
    branchBreakdown: { branch: string; count: number }[];
    projectBreakdown: { project: string; count: number }[];
  };
  // Today Attendance & Daily Output
  operationsToday: {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    totalAttendanceToday: number;
    totalClassesToday: number;
    totalRegularDoneToday: number;
    totalTrialDoneToday: number;
  };
  // Resignation & Attrition
  resignationStats: {
    pendingCount: number;
    approvedCount: number;
    completedCount: number;
    totalThisMonth: number;
    topReasons: { reason: string; count: number }[];
    branchBreakdown: { branch: string; count: number }[];
  };
  // Onboarding Pipeline
  onboardingStats: {
    total: number;
    inProgress: number;
    completed: number;
    slotsEligible: number;
    overdue: number;
  };
  // Tickets & Incidents
  concernStats: {
    openTickets: number;
    resolvedTickets: number;
    totalTickets: number;
    openIncidents: number;
    resolvedIncidents: number;
    totalIncidents: number;
    byCategory: { category: string; count: number }[];
  };
  // Workstation / Seating
  seatingStats: {
    totalWorkstations: number;
    occupiedWorkstations: number;
    availableWorkstations: number;
    maintenanceWorkstations: number;
  };
};

type PanelTab = 'OVERVIEW' | 'TEACHERS' | 'OPERATIONS' | 'RESIGNATIONS' | 'ONBOARDING' | 'CONCERNS';

export default function ManagementDashboard({ data }: { data: ManagementDashboardData }) {
  const [activeTab, setActiveTab] = useState<PanelTab>('OVERVIEW');

  const {
    teacherStats,
    operationsToday,
    resignationStats,
    onboardingStats,
    concernStats,
    seatingStats,
  } = data;

  const occupancyRate = seatingStats.totalWorkstations > 0
    ? Math.round((seatingStats.occupiedWorkstations / seatingStats.totalWorkstations) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              📊 Executive Management Dashboard
            </h1>
            <span
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#93c5fd',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              MANAGEMENT / OM
            </span>
          </div>
          <p style={{ color: 'var(--text-dim)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
            High-level cross-functional operational analytics, pipeline metrics, and system-wide KPI health.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Live Snapshot</span>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Teachers</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F766E', marginTop: '0.25rem' }}>{teacherStats.activeTeachers}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Total in DB: {teacherStats.totalTeachers}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present Today</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ns-blue)', marginTop: '0.25rem' }}>{operationsToday.presentCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {operationsToday.lateCount} Late &bull; {operationsToday.absentCount} Absent
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output Classes Today</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{operationsToday.totalClassesToday}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {operationsToday.totalRegularDoneToday} Reg &bull; {operationsToday.totalTrialDoneToday} Trial
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Tickets / Incidents</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: concernStats.openTickets + concernStats.openIncidents > 0 ? '#B45309' : '#0F766E', marginTop: '0.25rem' }}>
            {concernStats.openTickets + concernStats.openIncidents}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {concernStats.openTickets} Concerns &bull; {concernStats.openIncidents} Incidents
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workstation Occupancy</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ns-violet)', marginTop: '0.25rem' }}>{occupancyRate}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {seatingStats.occupiedWorkstations}/{seatingStats.totalWorkstations} In Use
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        {[
          { id: 'OVERVIEW', label: '🌐 High-Level Executive Overview' },
          { id: 'TEACHERS', label: '👩‍🏫 Teacher Roster & Headcount' },
          { id: 'OPERATIONS', label: '⏱️ Daily Operations & Output' },
          { id: 'RESIGNATIONS', label: '🚪 Resignations & Attrition' },
          { id: 'ONBOARDING', label: '🎓 New Hire Pipeline' },
          { id: 'CONCERNS', label: '⚠️ Concerns & Tickets' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PanelTab)}
            style={{
              background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-dim)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel 1: Executive Overview */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {/* Quick Health Summary */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚀</span> Operational Health Check
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active Teaching Force</span>
                <span style={{ fontWeight: 700, color: '#0F766E' }}>{teacherStats.activeTeachers} Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Attendance Compliance Today</span>
                <span style={{ fontWeight: 700, color: operationsToday.absentCount === 0 ? '#0F766E' : '#B45309' }}>
                  {operationsToday.presentCount} Present / {operationsToday.absentCount} Absent
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Onboarding Pipeline In Flight</span>
                <span style={{ fontWeight: 700, color: 'var(--ns-blue)' }}>{onboardingStats.inProgress} Candidates</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Resignation / Notice Pending</span>
                <span style={{ fontWeight: 700, color: resignationStats.pendingCount > 0 ? '#DC2626' : '#0F766E' }}>
                  {resignationStats.pendingCount} Pending Review
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Floor Workstation Utilization</span>
                <span style={{ fontWeight: 700, color: 'var(--ns-violet)' }}>
                  {seatingStats.occupiedWorkstations} / {seatingStats.totalWorkstations} ({occupancyRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Branch Distribution */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏢</span> Headcount by Branch
            </h3>
            {teacherStats.branchBreakdown.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem', padding: '1rem 0' }}>No branch data available.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {teacherStats.branchBreakdown.map(b => (
                  <div key={b.branch}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{b.branch}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{b.count} ({Math.round((b.count / (teacherStats.totalTeachers || 1)) * 100)}%)</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(b.count / (teacherStats.totalTeachers || 1)) * 100}%`,
                          height: '100%',
                          background: 'var(--accent-primary)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panel 2: Teacher Roster & Headcount */}
      {activeTab === 'TEACHERS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Teacher Status Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#0F766E' }}>Active</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F766E' }}>{teacherStats.activeTeachers}</div>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#B45309' }}>On Leave</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#B45309' }}>{teacherStats.onLeaveTeachers}</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#DC2626' }}>Resigned</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#DC2626' }}>{teacherStats.resignedTeachers}</div>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--ns-blue)' }}>Total Roster</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ns-blue)' }}>{teacherStats.totalTeachers}</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Project Distribution</h3>
            {teacherStats.projectBreakdown.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No project assignment data.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {teacherStats.projectBreakdown.map(p => (
                  <div key={p.project}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.project}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{p.count} teachers</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(p.count / (teacherStats.totalTeachers || 1)) * 100}%`,
                          height: '100%',
                          background: '#8b5cf6',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panel 3: Operations & Daily Output */}
      {activeTab === 'OPERATIONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Today's Shift Attendance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#0F766E', fontWeight: 600 }}>✅ Present</span>
                <span style={{ color: '#0F766E', fontWeight: 700 }}>{operationsToday.presentCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#B45309', fontWeight: 600 }}>⏰ Late</span>
                <span style={{ color: '#B45309', fontWeight: 700 }}>{operationsToday.lateCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#DC2626', fontWeight: 600 }}>❌ Absent</span>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>{operationsToday.absentCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Records Logged Today</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{operationsToday.totalAttendanceToday}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Today's Daily SRD Output</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--ns-blue)', fontWeight: 600 }}>Total Classes Conducted</span>
                <span style={{ color: 'var(--ns-blue)', fontWeight: 700 }}>{operationsToday.totalClassesToday}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#0F766E', fontWeight: 600 }}>Regular Classes</span>
                <span style={{ color: '#0F766E', fontWeight: 700 }}>{operationsToday.totalRegularDoneToday}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(168,85,247,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--ns-violet)', fontWeight: 600 }}>Trial Classes</span>
                <span style={{ color: 'var(--ns-violet)', fontWeight: 700 }}>{operationsToday.totalTrialDoneToday}</span>
              </div>
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <Link href="/dashboard/output" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                  View Full SRD Logs &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel 4: Resignations & Attrition */}
      {activeTab === 'RESIGNATIONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Resignation Lifecycle Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#B45309', fontWeight: 600 }}>Pending OM / Admin Review</span>
                <span style={{ color: '#B45309', fontWeight: 700 }}>{resignationStats.pendingCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(59,130,246,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--ns-blue)', fontWeight: 600 }}>Approved (Serving Notice)</span>
                <span style={{ color: 'var(--ns-blue)', fontWeight: 700 }}>{resignationStats.approvedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(107,114,128,0.15)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Completed / Exit Done</span>
                <span style={{ color: '#6B7280', fontWeight: 700 }}>{resignationStats.completedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Resignations This Month</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{resignationStats.totalThisMonth}</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <Link href="/dashboard/resignations" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                Manage Resignations &rarr;
              </Link>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Top Resignation Reasons</h3>
            {resignationStats.topReasons.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No recorded resignation reasons.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {resignationStats.topReasons.map(r => (
                  <div key={r.reason} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.reason}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panel 5: Onboarding Pipeline */}
      {activeTab === 'ONBOARDING' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>New Hire Pipeline Funnel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Registered New Hires</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{onboardingStats.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#B45309', fontWeight: 600 }}>In Progress (Fulfilling 18 Items)</span>
                <span style={{ color: '#B45309', fontWeight: 700 }}>{onboardingStats.inProgress}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#0F766E', fontWeight: 600 }}>18 Requirements Complete</span>
                <span style={{ color: '#0F766E', fontWeight: 700 }}>{onboardingStats.completed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(59,130,246,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--ns-blue)', fontWeight: 600 }}>Slots Eligible (Admin Verified)</span>
                <span style={{ color: 'var(--ns-blue)', fontWeight: 700 }}>{onboardingStats.slotsEligible}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: '#DC2626', fontWeight: 600 }}>Overdue (&gt;3 Days Pending Window)</span>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>{onboardingStats.overdue}</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <Link href="/dashboard/onboarding/manage" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                Open New Hire Desk &rarr;
              </Link>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Onboarding SLA & Compliance</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Teachers must undergo a mandatory 3-day minimum compliance window before Slot Eligibility is verified and granted by OM / Admin.
            </p>
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontWeight: 700, color: 'var(--ns-blue)', fontSize: '0.85rem' }}>Verification Rules:</div>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                <li>All 18 compliance items tracked individually.</li>
                <li>System-enforced lock prevents early slot release before 3 full days.</li>
                <li>Single-click eligibility action stamps verifiedBy and timestamp.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Panel 6: Concerns & Incidents */}
      {activeTab === 'CONCERNS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Concerns & Incidents Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#B45309' }}>Open Concern Tickets</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#B45309' }}>{concernStats.openTickets}</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#0F766E' }}>Resolved Tickets</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F766E' }}>{concernStats.resolvedTickets}</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#DC2626' }}>Open Incident Reports</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#DC2626' }}>{concernStats.openIncidents}</div>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--ns-blue)' }}>Resolved Incidents</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ns-blue)' }}>{concernStats.resolvedIncidents}</div>
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <Link href="/dashboard/concerns" style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                Go to Concerns Ticketing Desk &rarr;
              </Link>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Concerns by Category</h3>
            {concernStats.byCategory.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No concerns submitted yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {concernStats.byCategory.map(c => (
                  <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.category}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

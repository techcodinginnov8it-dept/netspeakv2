'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface DashboardChartsData {
  // Headcount & Teacher Distribution
  departmentBreakdown: { label: string; count: number; color: string }[];
  projectBreakdown: { label: string; count: number; color: string }[];
  statusBreakdown: { label: string; count: number; color: string }[];

  // Attendance Breakdown (Today)
  attendanceBreakdown: { label: string; count: number; color: string }[];
  todayPresentCount: number;
  totalTeachers: number;

  // Workstation Utilization
  occupiedSeats: number;
  availableSeats: number;
  pendingReformatSeats: number;
  totalSeats: number;

  // Concerns & Tickets by Status or Category
  concernBreakdown: { label: string; count: number; color: string }[];
  openConcerns: number;
  openIncidents: number;

  // 7-day Attendance Trend
  attendanceTrend: { day: string; date: string; present: number; late: number; total: number }[];
}

/* ----------------------------------------------------------------
   Donut Chart Helper (Pure SVG)
   ---------------------------------------------------------------- */
function DonutChart({
  segments,
  size = 140,
  strokeWidth = 22,
  centerLabel,
  centerSub,
}: {
  segments: { label: string; count: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string | number;
  centerSub?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(0, 0, 0, 0.05)"
          strokeWidth={strokeWidth}
        />
        {total === 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--border-light)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={0}
          />
        ) : (
          segments.map((seg, i) => {
            const segRatio = seg.count / total;
            const strokeDasharray = `${segRatio * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += segRatio * circumference;

            if (seg.count === 0) return null;

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
              />
            );
          })
        )}
      </svg>
      {/* Center Label */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
          {centerLabel ?? total}
        </div>
        {centerSub && (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>
            {centerSub}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Horizontal Stacked Bar Helper
   ---------------------------------------------------------------- */
function ProgressBar({
  value,
  max,
  color,
  bgColor = 'rgba(0,0,0,0.06)',
  height = 8,
}: {
  value: number;
  max: number;
  color: string;
  bgColor?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ width: '100%', height, background: bgColor, borderRadius: height / 2, overflow: 'hidden' }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
}

export default function DashboardAnalyticsCharts({ data }: { data: DashboardChartsData }) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'FACILITIES'>('OVERVIEW');

  const attendanceTotal = data.attendanceBreakdown.reduce((sum, x) => sum + x.count, 0);
  const attendanceRate = data.totalTeachers > 0 ? Math.round((data.todayPresentCount / data.totalTeachers) * 100) : 0;
  const occupancyRate = data.totalSeats > 0 ? Math.round((data.occupiedSeats / data.totalSeats) * 100) : 0;

  // Max value in 7-day trend for scaling
  const maxTrend = Math.max(...data.attendanceTrend.map((t) => t.total || 0), 10);

  return (
    <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Tab filter and section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(0,82,204,0.12) 0%, rgba(23,185,120,0.12) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            📊
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>
              Live Operational Analytics & Graphs
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '1px 0 0' }}>
              Real-time telemetry, attendance distributions, capacity utilization & pipeline health
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 82, 204, 0.05)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            gap: '3px',
          }}
        >
          {(
            [
              { id: 'OVERVIEW', label: 'Workforce & Capacity' },
              { id: 'ATTENDANCE', label: 'Attendance & 7-Day Trend' },
              { id: 'FACILITIES', label: 'Tickets & Facilities' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                style={{
                  border: 'none',
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? 'var(--ns-blue)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab 1: Workforce & Capacity ── */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
          {/* Card 1: Department & Project Distribution */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    Department & Project Ratio
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Domestic vs Overseas teacher distribution</span>
                </div>
                <Link
                  href="/dashboard/teachers"
                  style={{ fontSize: '0.72rem', color: 'var(--ns-blue)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Manage →
                </Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem' }}>
                <DonutChart
                  segments={data.departmentBreakdown}
                  size={120}
                  strokeWidth={20}
                  centerLabel={data.totalTeachers}
                  centerSub="Teachers"
                />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {data.departmentBreakdown.map((item) => {
                    const pct = data.totalTeachers > 0 ? Math.round((item.count / data.totalTeachers) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                            {item.label}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <ProgressBar value={item.count} max={data.totalTeachers} color={item.color} height={6} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sub-breakdown: Project Types */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.85rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Contract Types
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {data.projectBreakdown.map((p) => (
                  <div
                    key={p.label}
                    style={{
                      background: 'rgba(0, 82, 204, 0.04)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.4rem 0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      flex: 1,
                      minWidth: '90px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{p.label}:</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Workstation & Floor Capacity Utilization */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    Floor Workstation Capacity
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Hardware & seating allocation status</span>
                </div>
                <Link
                  href="/dashboard/seating/manage"
                  style={{ fontSize: '0.72rem', color: 'var(--ns-blue)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Floor Map →
                </Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem' }}>
                <DonutChart
                  segments={[
                    { label: 'Occupied', count: data.occupiedSeats, color: 'var(--ns-blue)' },
                    { label: 'Available', count: data.availableSeats, color: 'var(--ns-green)' },
                    { label: 'Reformat', count: data.pendingReformatSeats, color: 'var(--ns-gold-dark)' },
                  ]}
                  size={120}
                  strokeWidth={20}
                  centerLabel={`${occupancyRate}%`}
                  centerSub="In Use"
                />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ns-blue)' }} />
                        Occupied
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        {data.occupiedSeats} / {data.totalSeats}
                      </span>
                    </div>
                    <ProgressBar value={data.occupiedSeats} max={data.totalSeats} color="var(--ns-blue)" height={6} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ns-green)' }} />
                        Available
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{data.availableSeats}</span>
                    </div>
                    <ProgressBar value={data.availableSeats} max={data.totalSeats} color="var(--ns-green)" height={6} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ns-gold-dark)' }} />
                        Pending IT Reformat
                      </span>
                      <span style={{ color: '#b45309', fontWeight: 700 }}>{data.pendingReformatSeats}</span>
                    </div>
                    <ProgressBar value={data.pendingReformatSeats} max={data.totalSeats} color="var(--ns-gold-dark)" height={6} />
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-light)',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Total Workstations: <strong>{data.totalSeats}</strong></span>
              <span style={{ color: occupancyRate > 85 ? 'var(--ns-red)' : 'var(--ns-green)', fontWeight: 600 }}>
                {occupancyRate > 85 ? '⚠️ High Load' : '✅ Optimal Capacity'}
              </span>
            </div>
          </div>

          {/* Card 3: Teacher Registration Lifecycle */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    Registration & Onboarding Funnel
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status of profile approvals & pipeline</span>
                </div>
                <Link
                  href="/dashboard/teachers"
                  style={{ fontSize: '0.72rem', color: 'var(--ns-blue)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Review →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {data.statusBreakdown.map((s) => {
                  const pct = data.totalTeachers > 0 ? Math.round((s.count / data.totalTeachers) * 100) : 0;
                  return (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                          {s.label}
                        </span>
                        <span style={{ fontWeight: 700, color: s.color }}>
                          {s.count} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({pct}%)</span>
                        </span>
                      </div>
                      <ProgressBar value={s.count} max={data.totalTeachers} color={s.color} height={6} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 82, 204, 0.04)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.6rem 0.8rem',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Review pending profiles to maintain staffing levels.</span>
              <span style={{ fontWeight: 700, color: 'var(--ns-blue)' }}>Fast Path</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Attendance & 7-Day Trend ── */}
      {activeTab === 'ATTENDANCE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
          {/* Card: Today's Shift Attendance Breakdown */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Today's Shift Attendance
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Freshness Check check-ins for current date</span>
              </div>
              <Link
                href="/dashboard/attendance"
                style={{ fontSize: '0.72rem', color: 'var(--ns-blue)', fontWeight: 600, textDecoration: 'none' }}
              >
                Roster Table →
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem' }}>
              <DonutChart
                segments={data.attendanceBreakdown}
                size={125}
                strokeWidth={20}
                centerLabel={`${attendanceRate}%`}
                centerSub="Attendance"
              />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data.attendanceBreakdown.map((att) => (
                  <div key={att.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: att.color }} />
                        {att.label}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{att.count}</span>
                    </div>
                    <ProgressBar
                      value={att.count}
                      max={Math.max(attendanceTotal, data.totalTeachers, 1)}
                      color={att.color}
                      height={6}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-light)',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Logged Today: <strong>{data.todayPresentCount}</strong></span>
              <span>Total Active Roster: <strong>{data.totalTeachers}</strong></span>
            </div>
          </div>

          {/* Card: 7-Day Attendance Bar Chart */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    7-Day Attendance Trend
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Daily present & late count progression</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--ns-blue)' }} /> Present
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} /> Late
                  </span>
                </div>
              </div>

              {/* Bar Chart Canvas */}
              <div
                style={{
                  height: '130px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  paddingTop: '10px',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '0.35rem',
                }}
              >
                {data.attendanceTrend.map((t, idx) => {
                  const presentHeight = maxTrend > 0 ? Math.round((t.present / maxTrend) * 100) : 0;
                  const lateHeight = maxTrend > 0 ? Math.round((t.late / maxTrend) * 100) : 0;

                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        gap: '2px',
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px' }}>
                        {t.total > 0 ? t.total : ''}
                      </div>

                      {/* Stacked bar */}
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          background: 'rgba(0,0,0,0.03)',
                          borderRadius: '4px 4px 0 0',
                          overflow: 'hidden',
                          height: '90px',
                        }}
                      >
                        {t.late > 0 && (
                          <div
                            title={`Late: ${t.late}`}
                            style={{
                              height: `${lateHeight}%`,
                              background: '#f59e0b',
                              transition: 'height 0.4s ease',
                            }}
                          />
                        )}
                        <div
                          title={`Present: ${t.present}`}
                          style={{
                            height: `${Math.max(presentHeight, t.total > 0 ? 5 : 0)}%`,
                            background: 'var(--ns-blue)',
                            transition: 'height 0.4s ease',
                          }}
                        />
                      </div>

                      {/* Day Label */}
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {t.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Historical attendance synced directly from Shift Rosters & Freshness Check selfies.
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Tickets & Facilities ── */}
      {activeTab === 'FACILITIES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
          {/* Card: Concerns by Status / Category */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Tickets & Issue Management
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Open tickets, complaints & investigations</span>
              </div>
              <Link
                href="/dashboard/concerns/manage"
                style={{ fontSize: '0.72rem', color: 'var(--ns-blue)', fontWeight: 600, textDecoration: 'none' }}
              >
                Ticketing Desk →
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem' }}>
              <DonutChart
                segments={data.concernBreakdown}
                size={120}
                strokeWidth={20}
                centerLabel={data.openConcerns + data.openIncidents}
                centerSub="Open"
              />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data.concernBreakdown.map((item) => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                        {item.label}
                      </span>
                      <span style={{ fontWeight: 700, color: item.color }}>{item.count}</span>
                    </div>
                    <ProgressBar
                      value={item.count}
                      max={Math.max(data.openConcerns + data.openIncidents, 1)}
                      color={item.color}
                      height={6}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-light)',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Teacher Concerns: <strong>{data.openConcerns}</strong></span>
              <span>Formal Incidents: <strong>{data.openIncidents}</strong></span>
            </div>
          </div>

          {/* Card: High Priority Action Summary */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: '1.4rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    Action Items & Attention Alerts
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Items requiring immediate operations oversight</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: data.pendingReformatSeats > 0 ? 'rgba(244,196,48,0.1)' : 'rgba(23,185,120,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${data.pendingReformatSeats > 0 ? 'rgba(214,164,28,0.3)' : 'rgba(23,185,120,0.2)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💻</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Workstations Needing IT Reformat
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: data.pendingReformatSeats > 0 ? 'var(--ns-gold-dark)' : 'var(--ns-green)' }}>
                    {data.pendingReformatSeats}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: data.openIncidents > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(23,185,120,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${data.openIncidents > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(23,185,120,0.2)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🚨</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Open Incident Tickets
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: data.openIncidents > 0 ? '#dc2626' : 'var(--ns-green)' }}>
                    {data.openIncidents}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(0,82,204,0.06)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-blue)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🪑</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Available Free Workstations
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ns-blue)' }}>
                    {data.availableSeats}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.85rem', textAlign: 'right' }}>
              <Link
                href="/dashboard/management"
                style={{ fontSize: '0.75rem', color: 'var(--ns-blue)', fontWeight: 600, textDecoration: 'none' }}
              >
                Open Full Executive Dashboard →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

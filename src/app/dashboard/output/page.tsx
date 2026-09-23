import React from 'react';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';

export const metadata = {
  title: 'Daily Output Reports | Netspeak Portal',
};

export default async function DailyOutputPage() {
  await requirePermission(PERMISSIONS.OUTPUT_READ);

  const outputs = await prisma.dailyOutput.findMany({
    orderBy: { date: 'desc' },
    include: {
      teacher: {
        select: {
          id: true,
          displayName: true,
          realFullName: true,
          department: true,
          projectType: true,
        },
      },
    },
    take: 100,
  });

  const totalReports = outputs.length;
  const totalOpenSlots = outputs.reduce((acc, o) => acc + o.openSlots, 0);
  const totalBookedSlots = outputs.reduce((acc, o) => acc + o.bookedSlots, 0);
  const overallBookingRate = totalOpenSlots > 0 ? ((totalBookedSlots / totalOpenSlots) * 100).toFixed(1) : '0.0';
  const totalTardiness = outputs.reduce((acc, o) => acc + o.classTardiness, 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Teacher Daily Output Reports
        </h1>
        <p style={{ color: 'var(--foreground-muted)', fontSize: '0.95rem' }}>
          Consolidated shift output entries, open vs booked slots compliance, and class attendance exceptions.
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Total Reports Submitted</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px' }}>{totalReports}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--ns-blue)' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Total Open Slots</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: 'var(--ns-blue)' }}>{totalOpenSlots}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--success)' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Total Booked Slots</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#0F766E' }}>{totalBookedSlots}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Overall Booking Rate</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>{overallBookingRate}%</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Class Tardiness Exceptions</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#DC2626' }}>{totalTardiness}</div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Teacher</th>
              <th style={{ padding: '12px 16px' }}>Open Slots</th>
              <th style={{ padding: '12px 16px' }}>Booked Slots</th>
              <th style={{ padding: '12px 16px' }}>Booking %</th>
              <th style={{ padding: '12px 16px' }}>Exceptions (Tardy / Absent / Leave)</th>
              <th style={{ padding: '12px 16px' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {outputs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                  No Daily Output reports have been submitted yet.
                </td>
              </tr>
            ) : (
              outputs.map((out) => {
                const rate = out.openSlots > 0 ? ((out.bookedSlots / out.openSlots) * 100).toFixed(0) : '0';
                return (
                  <tr key={out.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {new Date(out.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ display: 'block' }}>{out.teacher.displayName}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                        {out.teacher.projectType} • {out.teacher.department}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{out.openSlots}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--success)' }}>{out.bookedSlots}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        fontWeight: 600,
                      }}>
                        {rate}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: out.classTardiness > 0 ? '#f87171' : 'inherit' }}>
                        {out.classTardiness}
                      </span>
                      {' / '}
                      <span style={{ color: out.absentClasses > 0 ? '#f87171' : 'inherit' }}>
                        {out.absentClasses}
                      </span>
                      {' / '}
                      <span style={{ color: out.earlyLeaveClasses > 0 ? '#f87171' : 'inherit' }}>
                        {out.earlyLeaveClasses}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>
                      {out.remarks || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

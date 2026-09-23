import React from 'react';
import { requirePermission, PERMISSIONS, hasPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import AttendanceRosterTable from '@/components/attendance/AttendanceRosterTable';
import { resolveBranchFilter } from '@/lib/branches';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Teacher Attendance | Netspeak Portal',
};

function normalizeDate(d = new Date()) {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

interface PageProps {
  searchParams: Promise<{ branch?: string }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const user = await requirePermission(PERMISSIONS.ATTENDANCE_READ);
  const canVerify = hasPermission(user, PERMISSIONS.ATTENDANCE_VERIFY);
  const resolvedParams = await searchParams;
  const branchFilter = resolveBranchFilter(user, resolvedParams.branch);

  const today = normalizeDate();

  // Fetch all approved teachers and their attendance for today (filtered by branch)
  const teachers = await prisma.teacherProfile.findMany({
    where: {
      registrationStatus: 'APPROVED',
      ...branchFilter,
    },
    include: {
      shiftSchedule: true,
      attendances: {
        where: { date: today },
      },
    },
    orderBy: { displayName: 'asc' },
  });

  const roster = teachers.map((t) => ({
    teacherId: t.id,
    displayName: t.displayName,
    realFullName: t.realFullName,
    cellphone: t.cellphone,
    department: t.department,
    projectType: t.projectType,
    shiftName: t.shiftSchedule?.name || 'Standard (08:00 - 17:00)',
    attendance: t.attendances[0] || null,
  }));

  const totalScheduled = roster.length;
  const presentCount = roster.filter((r) => r.attendance?.timeIn).length;
  const lateCount = roster.filter((r) => r.attendance?.isLate).length;
  const earlyOutCount = roster.filter((r) => r.attendance?.isEarlyOut).length;
  const noLoginCount = roster.filter((r) => !r.attendance?.timeIn).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Teacher Attendance & Freshness Roster
        </h1>
        <p style={{ color: 'var(--foreground-muted)', fontSize: '0.95rem' }}>
          Real-time daily operations tracking, T-30 arrival verification, T-0 tardiness evaluation, and shift adherence.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Total Scheduled</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px' }}>{totalScheduled}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--success)' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Present (Timed In)</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#0F766E' }}>{presentCount}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Late Arrivals</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#B45309' }}>{lateCount}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #f97316' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Early Out</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#C2410C' }}>{earlyOutCount}</div>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>No Login / Pending</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#DC2626' }}>{noLoginCount}</div>
        </div>
      </div>

      {/* Interactive Roster Table */}
      <AttendanceRosterTable initialRoster={roster} canVerify={canVerify} />
    </div>
  );
}

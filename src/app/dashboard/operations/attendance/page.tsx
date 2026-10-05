import React from 'react';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import StaffAttendanceRoster from '@/components/operations/StaffAttendanceRoster';

export const dynamic = 'force-dynamic';

export default async function StaffAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);

  const params = await searchParams;
  const now = new Date();

  // Determine the date to view — default to today (Philippine time, UTC+8)
  let targetDate: Date;
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    const [y, m, d] = params.date.split('-').map(Number);
    targetDate = new Date(y, m - 1, d);
  } else {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Fetch attendance for the target date only
  const startOfDay = targetDate;
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  const attendances = await prisma.staffAttendance.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      staffProfile: {
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [
      { staffProfile: { roleType: 'asc' } },
      { staffProfile: { user: { fullName: 'asc' } } },
    ],
  });

  const serialized = attendances.map((item: any) => ({
    id: item.id,
    date: item.date.toISOString(),
    timeIn: item.timeIn ? item.timeIn.toISOString() : null,
    timeOut: item.timeOut ? item.timeOut.toISOString() : null,
    status: item.status,
    isLate: item.isLate,
    lateMinutes: item.lateMinutes,
    isChecklistComplete: item.isChecklistComplete,
    absenceReason: item.absenceReason,
    notes: item.notes,
    staffProfile: {
      id: item.staffProfile.id,
      roleType: item.staffProfile.roleType,
      branch: item.staffProfile.branch,
      department: item.staffProfile.department,
      user: {
        fullName: item.staffProfile.user.fullName,
        email: item.staffProfile.user.email,
      },
    },
  }));

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const viewDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const isToday = viewDateStr === todayStr;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            Unified Admin &amp; IT Staff Attendance
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Centralized attendance roster, checklist verification, and absence reconciliation for operational personnel.
          </p>
        </div>

        {/* Date Navigation */}
        <form method="GET" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="att-date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Viewing Date:
          </label>
          <input
            id="att-date"
            type="date"
            name="date"
            defaultValue={viewDateStr}
            max={todayStr}
            style={{
              padding: '0.4rem 0.65rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.4rem 0.85rem',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Go
          </button>
          {!isToday && (
            <a
              href="/dashboard/operations/attendance"
              style={{
                padding: '0.4rem 0.65rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Back to Today
            </a>
          )}
        </form>
      </div>

      <StaffAttendanceRoster attendances={serialized} viewDate={viewDateStr} />
    </div>
  );
}

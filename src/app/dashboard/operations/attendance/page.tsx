import React from 'react';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import StaffAttendanceRoster from '@/components/operations/StaffAttendanceRoster';

export default async function StaffAttendancePage() {
  await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);

  const attendances = await prisma.staffAttendance.findMany({
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
    orderBy: { date: 'desc' },
    take: 100,
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          Unified Admin &amp; IT Staff Attendance
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Centralized attendance roster, checklist verification, and absence reconciliation for operational personnel.
        </p>
      </div>

      <StaffAttendanceRoster attendances={serialized} />
    </div>
  );
}

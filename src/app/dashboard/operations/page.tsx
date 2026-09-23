import React from 'react';
import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import StaffOperationsDesk from '@/components/operations/StaffOperationsDesk';
import { getOrCreateStaffProfileAction } from '@/actions/staffOperations';

export default async function OperationsDeskPage() {
  await requirePermission(PERMISSIONS.OPERATIONS_RECORD);
  const user = await requireAuth();

  const profileRes = await getOrCreateStaffProfileAction();
  const profile = profileRes.profile;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayAttendance = await prisma.staffAttendance.findUnique({
    where: {
      staffProfileId_date: {
        staffProfileId: profile.id,
        date: today,
      },
    },
    include: {
      checklistResponses: true,
    },
  });

  const profileData = {
    id: profile.id,
    roleType: profile.roleType,
    branch: profile.branch,
    department: profile.department,
    user: {
      fullName: user.fullName,
      username: user.username,
      email: user.email,
    },
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          Operational Workstation &amp; Checklists
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Manage your daily shift arrival, mandatory end-of-shift checklist compliance, and departures.
        </p>
      </div>

      <StaffOperationsDesk
        profile={profileData}
        todayAttendance={todayAttendance ? JSON.parse(JSON.stringify(todayAttendance)) : null}
      />
    </div>
  );
}

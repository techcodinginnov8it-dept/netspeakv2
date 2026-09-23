import React from 'react';
import { requirePermission, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { getShiftSchedulesAction } from '@/actions/shifts';
import ShiftManagementClient from '@/components/shifts/ShiftManagementClient';

export const metadata = {
  title: 'Shift Schedules | Netspeak Portal',
  description: 'Manage teacher shift schedule templates for the Netspeak ESL portal.',
};

export default async function ShiftsPage() {
  const user = await requirePermission(PERMISSIONS.ATTENDANCE_READ);
  const canManage = hasPermission(user, PERMISSIONS.ATTENDANCE_MANAGE);

  const shifts = await getShiftSchedulesAction();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <ShiftManagementClient initialShifts={shifts} canManage={canManage} />
    </div>
  );
}

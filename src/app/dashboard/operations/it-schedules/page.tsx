import React from 'react';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import ITSchedulesClient from '@/components/operations/ITSchedulesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'IT Weekly & Monthly Checklists | Netspeak Portal',
};

export default async function ITSchedulesPage() {
  await requirePermission(PERMISSIONS.OPERATIONS_RECORD);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get IT staff's attendance records for the current week and month
  // to check for submitted weekly/monthly checklist items
  const [weeklySubmissions, monthlySubmissions] = await Promise.all([
    prisma.staffChecklistResponse.findMany({
      where: {
        taskCategory: 'WEEKLY',
        completedAt: { gte: startOfWeek },
      },
      include: {
        attendance: {
          include: {
            staffProfile: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.staffChecklistResponse.findMany({
      where: {
        taskCategory: 'MONTHLY',
        completedAt: { gte: startOfMonth },
      },
      include: {
        attendance: {
          include: {
            staffProfile: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    }),
  ]);

  // Get today's attendance ID for the current user to allow submission
  // We pass the raw data to the client component
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <ITSchedulesClient
        weeklySubmissions={weeklySubmissions.map(s => ({
          id: s.id,
          taskKey: s.taskKey,
          taskLabel: s.taskLabel,
          isCompleted: s.isCompleted,
          completedAt: s.completedAt?.toISOString() || null,
          notes: s.notes || null,
          submittedBy: s.attendance?.staffProfile?.user?.fullName || 'Unknown',
        }))}
        monthlySubmissions={monthlySubmissions.map(s => ({
          id: s.id,
          taskKey: s.taskKey,
          taskLabel: s.taskLabel,
          isCompleted: s.isCompleted,
          completedAt: s.completedAt?.toISOString() || null,
          notes: s.notes || null,
          submittedBy: s.attendance?.staffProfile?.user?.fullName || 'Unknown',
        }))}
      />
    </div>
  );
}

import React from 'react';
import { requirePermission, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import TeacherProfileDetail from '@/components/teachers/TeacherProfileDetail';
import { notFound } from 'next/navigation';
import { getShiftSchedulesAction } from '@/actions/shifts';

export const metadata = {
  title: 'Teacher Profile | Netspeak Portal',
};

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.TEACHERS_READ);
  const resolvedParams = await params;

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: resolvedParams.id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
        },
      },
      shiftSchedule: true,
    },
  });

  if (!teacher) {
    notFound();
  }

  const allShifts = await getShiftSchedulesAction();
  const canReview = hasPermission(user, PERMISSIONS.TEACHERS_REVIEW);
  const canApprove = hasPermission(user, PERMISSIONS.TEACHERS_APPROVE);
  const canUpdate = hasPermission(user, PERMISSIONS.TEACHERS_UPDATE);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <TeacherProfileDetail
        teacher={teacher}
        allShifts={allShifts}
        canReview={canReview}
        canApprove={canApprove}
        canUpdate={canUpdate}
      />
    </div>
  );
}

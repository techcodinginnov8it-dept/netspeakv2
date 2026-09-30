'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, ROLES } from '@/lib/auth/rbac';
import { resolveBranchFilter } from '@/lib/branches';
import { recordAuditLog } from '@/lib/audit/auditLogger';
import { revalidatePath } from 'next/cache';
import type { IncentiveType } from '@prisma/client';

export type TodayBirthdayTeacher = {
  id: string;
  realFullName: string;
  displayName: string;
  birthday: Date;
  branch: string | null;
  department: string;
  projectType: string;
  incentives: {
    id: string;
    type: IncentiveType;
    amountPhp: any;
    grantedByName: string;
    grantedAt: Date;
  }[];
};

/**
 * Get active teachers whose birthday is today in Manila time (§5)
 */
export async function getTodayBirthdaysAction(): Promise<TodayBirthdayTeacher[]> {
  const user = await requireAuth();

  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();

  const branchFilter = resolveBranchFilter(user);

  // Fetch approved active teachers
  const teachers = await prisma.teacherProfile.findMany({
    where: {
      registrationStatus: 'APPROVED',
      ...branchFilter,
    },
    include: {
      incentives: {
        where: {
          grantedAt: {
            gte: new Date(now.getFullYear(), 0, 1), // Current calendar year
          },
        },
        select: {
          id: true,
          type: true,
          amountPhp: true,
          grantedByName: true,
          grantedAt: true,
        },
      },
    },
  });

  // Filter teachers whose birthday matches currentMonth and currentDay
  const birthdayTeachers = teachers.filter((t) => {
    const bday = new Date(t.birthday);
    return bday.getMonth() === currentMonth && bday.getDate() === currentDay;
  });

  return birthdayTeachers.map((t) => ({
    id: t.id,
    realFullName: t.realFullName,
    displayName: t.displayName,
    birthday: t.birthday,
    branch: t.branch,
    department: t.department,
    projectType: t.projectType,
    incentives: t.incentives,
  }));
}

/**
 * Grant a Birthday Incentive to a teacher (§5)
 * Direct action for Managers and Center Admins: Cash Voucher / In-Kind Token
 */
export async function grantTeacherIncentiveAction(
  teacherId: string,
  type: IncentiveType,
  amountPhp: number,
  description: string
) {
  const user = await requirePermission('teachers:review');

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { id: true, realFullName: true, displayName: true, branch: true },
  });

  if (!teacher) {
    throw new Error('Teacher profile not found');
  }

  const incentive = await prisma.teacherIncentive.create({
    data: {
      teacherId,
      type,
      amountPhp,
      description: description.trim() || `Birthday ${type.replace(/_/g, ' ')} incentive granted.`,
      grantedById: user.id,
      grantedByName: user.fullName,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'GRANT_BIRTHDAY_INCENTIVE',
    module: 'operations',
    entityType: 'TeacherIncentive',
    entityId: incentive.id,
    details: `Granted ${type} (₱${amountPhp}) to ${teacher.realFullName} (${teacher.displayName})`,
    newValue: JSON.stringify({ type, amountPhp, description }),
  });

  revalidatePath('/dashboard');
  return { success: true, incentive };
}

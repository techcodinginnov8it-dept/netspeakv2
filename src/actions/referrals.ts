'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, ROLES } from '@/lib/auth/rbac';
import { resolveBranchFilter } from '@/lib/branches';
import { recordAuditLog } from '@/lib/audit/auditLogger';
import { revalidatePath } from 'next/cache';
import type { ReferralStatus, ReferralFeeStatus } from '@prisma/client';

export type ReferralRecord = {
  id: string;
  realFullName: string;
  displayName: string;
  branch: string | null;
  projectType: string;
  department: string;
  launchDate: Date | null;
  registrationStatus: string;
  isReferred: boolean;
  referringTeacherName: string | null;
  referredByTeacherId: string | null;
  referredByTeacher?: {
    id: string;
    realFullName: string;
    displayName: string;
    branch: string | null;
  } | null;
  referralStatus: ReferralStatus;
  referralFeeStatus: ReferralFeeStatus;
  referralNotes: string | null;
  createdAt: Date;
};

/**
 * Fetch all referral records across the system or branch-scoped (§XXI)
 */
export async function getReferralRecordsAction() {
  const user = await requireAuth();

  const branchFilter = resolveBranchFilter(user);

  const records = await prisma.teacherProfile.findMany({
    where: {
      isReferred: true,
      ...branchFilter,
    },
    include: {
      referredByTeacher: {
        select: {
          id: true,
          realFullName: true,
          displayName: true,
          branch: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return records;
}

/**
 * Update referral fee status and eligibility notes (§XXI)
 * Gated by teachers:review or management
 */
export async function updateReferralStatusAction(
  teacherId: string,
  referralStatus: ReferralStatus,
  referralFeeStatus: ReferralFeeStatus,
  referralNotes?: string
) {
  const user = await requirePermission('teachers:review');

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      realFullName: true,
      referralStatus: true,
      referralFeeStatus: true,
      branch: true,
    },
  });

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  const updated = await prisma.teacherProfile.update({
    where: { id: teacherId },
    data: {
      referralStatus,
      referralFeeStatus,
      referralNotes: referralNotes || null,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'UPDATE_REFERRAL_STATUS',
    module: 'recruitment',
    entityType: 'TeacherProfile',
    entityId: teacherId,
    details: `Updated referral status to ${referralStatus}, fee status to ${referralFeeStatus} for ${teacher.realFullName}`,
    oldValue: JSON.stringify({
      referralStatus: teacher.referralStatus,
      referralFeeStatus: teacher.referralFeeStatus,
    }),
    newValue: JSON.stringify({
      referralStatus,
      referralFeeStatus,
      referralNotes,
    }),
  });

  revalidatePath('/dashboard/teachers');
  revalidatePath('/dashboard/management');

  return { success: true, teacher: updated };
}

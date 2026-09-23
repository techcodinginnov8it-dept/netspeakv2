'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { StaffRoleType, StaffAttendanceStatus } from '@prisma/client';
import { ADMIN_DAILY_CHECKLIST, IT_DAILY_CHECKLIST } from '@/lib/operations/checklists';

/**
 * Ensures or retrieves the StaffProfile for the authenticated user
 */
export async function getOrCreateStaffProfileAction() {
  const user = await requireAuth();

  let profile = await prisma.staffProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    const isIT = user.roles.includes('IT');
    const roleType: StaffRoleType = isIT ? StaffRoleType.IT : StaffRoleType.ADMIN;

    profile = await prisma.staffProfile.create({
      data: {
        userId: user.id,
        roleType,
        branch: 'Main Branch',
        department: isIT ? 'Information Technology' : 'Operations & Center Admin',
      },
    });
  }

  return { success: true, profile };
}

/**
 * Record Staff Time In (§9.1, §28.1)
 */
export async function recordStaffTimeInAction() {
  await requirePermission(PERMISSIONS.OPERATIONS_RECORD);
  const profileRes = await getOrCreateStaffProfileAction();
  const profile = profileRes.profile;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let attendance = await prisma.staffAttendance.findUnique({
    where: {
      staffProfileId_date: {
        staffProfileId: profile.id,
        date: today,
      },
    },
  });

  if (attendance && attendance.timeIn) {
    return { success: false, error: 'Time-in has already been recorded for today.' };
  }

  // Standard daytime shift begins at 08:00
  const shiftHour = 8;
  const isLate = now.getHours() > shiftHour || (now.getHours() === shiftHour && now.getMinutes() > 0);
  const lateMinutes = isLate ? (now.getHours() - shiftHour) * 60 + now.getMinutes() : 0;

  if (attendance) {
    attendance = await prisma.staffAttendance.update({
      where: { id: attendance.id },
      data: {
        timeIn: now,
        status: isLate ? StaffAttendanceStatus.LATE : StaffAttendanceStatus.PRESENT,
        isLate,
        lateMinutes,
      },
    });
  } else {
    attendance = await prisma.staffAttendance.create({
      data: {
        staffProfileId: profile.id,
        date: today,
        timeIn: now,
        status: isLate ? StaffAttendanceStatus.LATE : StaffAttendanceStatus.PRESENT,
        isLate,
        lateMinutes,
      },
    });
  }

  revalidatePath('/dashboard/operations');
  revalidatePath('/dashboard/operations/attendance');
  return { success: true, attendance };
}

/**
 * Submit or update checklist items (§9.2, §28.1, §29)
 */
const submitChecklistSchema = z.object({
  attendanceId: z.string().min(1),
  items: z.array(
    z.object({
      taskCategory: z.string(),
      taskKey: z.string(),
      taskLabel: z.string(),
      isCompleted: z.boolean(),
      notes: z.string().optional(),
    })
  ),
});

export async function submitStaffChecklistAction(data: z.infer<typeof submitChecklistSchema>) {
  await requirePermission(PERMISSIONS.OPERATIONS_RECORD);
  const parsed = submitChecklistSchema.parse(data);

  const attendance = await prisma.staffAttendance.findUnique({
    where: { id: parsed.attendanceId },
    include: { staffProfile: true },
  });

  if (!attendance) {
    return { success: false, error: 'Staff attendance record not found.' };
  }

  const now = new Date();

  for (const item of parsed.items) {
    await prisma.staffChecklistResponse.upsert({
      where: {
        attendanceId_taskKey: {
          attendanceId: parsed.attendanceId,
          taskKey: item.taskKey,
        },
      },
      update: {
        isCompleted: item.isCompleted,
        completedAt: item.isCompleted ? now : null,
        notes: item.notes || null,
      },
      create: {
        attendanceId: parsed.attendanceId,
        taskCategory: item.taskCategory,
        taskKey: item.taskKey,
        taskLabel: item.taskLabel,
        isCompleted: item.isCompleted,
        completedAt: item.isCompleted ? now : null,
        notes: item.notes || null,
      },
    });
  }

  // Check if all mandatory daily tasks for this role are fulfilled
  const role = attendance.staffProfile.roleType;
  const mandatoryDefs = role === StaffRoleType.IT ? IT_DAILY_CHECKLIST : ADMIN_DAILY_CHECKLIST;

  const responses = await prisma.staffChecklistResponse.findMany({
    where: { attendanceId: parsed.attendanceId },
  });

  const allMandatoryDone = mandatoryDefs.every((def) => {
    const resp = responses.find((r: { taskKey: string; isCompleted: boolean }) => r.taskKey === def.key);
    return resp && resp.isCompleted;
  });

  await prisma.staffAttendance.update({
    where: { id: parsed.attendanceId },
    data: {
      isChecklistComplete: allMandatoryDone,
      checklistCompletedAt: allMandatoryDone ? now : null,
    },
  });

  revalidatePath('/dashboard/operations');
  revalidatePath('/dashboard/operations/attendance');
  return { success: true, isChecklistComplete: allMandatoryDone };
}

/**
 * Record Staff Time Out (§9.2, §28.2)
 * STRICT LOCKOUT: Time out is rejected if end-of-shift checklist is not completed!
 */
export async function recordStaffTimeOutAction(attendanceId: string) {
  await requirePermission(PERMISSIONS.OPERATIONS_RECORD);

  const attendance = await prisma.staffAttendance.findUnique({
    where: { id: attendanceId },
    include: { staffProfile: true, checklistResponses: true },
  });

  if (!attendance) {
    return { success: false, error: 'Attendance record not found.' };
  }

  if (!attendance.timeIn) {
    return { success: false, error: 'Cannot record Time Out before Time In.' };
  }

  if (attendance.timeOut) {
    return { success: false, error: 'Time Out has already been recorded for today.' };
  }

  // §9.2 & §28.2 Strict requirement: Checklist MUST be complete before logout
  if (!attendance.isChecklistComplete) {
    const roleTitle = attendance.staffProfile.roleType === 'IT' ? 'IT End-of-Shift Checklist' : 'Admin End-of-Shift Checklist';
    return {
      success: false,
      error: `Time Out restricted! Incomplete checklist items detected. You must complete the mandatory ${roleTitle} before logout.`,
    };
  }

  const now = new Date();

  await prisma.staffAttendance.update({
    where: { id: attendanceId },
    data: {
      timeOut: now,
    },
  });

  revalidatePath('/dashboard/operations');
  revalidatePath('/dashboard/operations/attendance');
  return { success: true };
}

/**
 * Reconcile Staff Attendance / Record Absence Reason (§10, §30)
 */
export async function reconcileStaffAttendanceAction(
  attendanceId: string,
  status: StaffAttendanceStatus,
  absenceReason?: string,
  notes?: string
) {
  await requirePermission(PERMISSIONS.OPERATIONS_MANAGE);

  await prisma.staffAttendance.update({
    where: { id: attendanceId },
    data: {
      status,
      absenceReason: absenceReason || null,
      notes: notes || null,
    },
  });

  revalidatePath('/dashboard/operations/attendance');
  return { success: true };
}

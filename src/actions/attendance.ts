'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, ROLES, hasRole } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getManilaToday, getManilaShiftBoundaries } from '@/lib/timezone';

function normalizeDate(date: Date = new Date()): Date {
  return getManilaToday();
}

function getShiftBoundaries(baseDate: Date, startTimeStr: string, endTimeStr: string) {
  return getManilaShiftBoundaries(baseDate, startTimeStr, endTimeStr);
}

export type TimeInResult = {
  success?: boolean;
  error?: string;
  isLate?: boolean;
  lateMinutes?: number;
  arrivalTimestamp?: string;
  attendanceId?: string;
};

/**
 * Teacher Freshness Check Time In Action
 * - Validates selfie evidence
 * - Enforces T-30 early login rule (cannot log in before T-30)
 * - Evaluates arrival relative to T-0 (marks LATE if arriving after T-0)
 * - Creates / updates TeacherAttendance record
 */
export async function recordFreshnessCheckAction(photoBase64: string): Promise<TimeInResult> {
  try {
    const user = await requireAuth();

    // Verify teacher profile exists
    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
      include: { shiftSchedule: true },
    });

    if (!teacher) {
      return { error: 'No teacher profile linked to your user account.' };
    }

    if (!photoBase64 || photoBase64.trim().length < 50) {
      return { error: 'A valid Freshness Check camera capture is required for time-in.' };
    }

    const now = new Date();
    const today = normalizeDate(now);

    // Fallback default shift: 08:00 - 17:00 if none explicitly assigned
    const startTimeStr = teacher.shiftSchedule?.startTime || '08:00';
    const endTimeStr = teacher.shiftSchedule?.endTime || '17:00';

    const { scheduledStart, scheduledEnd, tMinus30 } = getShiftBoundaries(now, startTimeStr, endTimeStr);

    // Rule: T-30 Check
    // The early login window opens 30 minutes before the scheduled shift
    if (now < tMinus30) {
      const minutesUntilOpen = Math.ceil((tMinus30.getTime() - now.getTime()) / (60 * 1000));
      return {
        error: `Early login window (T-30) is not yet open. Your window opens 30 minutes before shift start (${startTimeStr}). Please return in ${minutesUntilOpen} minute(s).`,
      };
    }

    // Check if already timed in today
    const existing = await prisma.teacherAttendance.findUnique({
      where: {
        teacherId_date: {
          teacherId: teacher.id,
          date: today,
        },
      },
    });

    if (existing && existing.timeIn) {
      return {
        error: `You have already completed Freshness Check today at ${new Date(existing.timeIn).toLocaleTimeString()}.`,
      };
    }

    // Rule: T-0 Evaluation (Late vs On Time)
    let isLate = false;
    let lateMinutes = 0;
    let status: 'PRESENT' | 'LATE' = 'PRESENT';

    if (now > scheduledStart) {
      isLate = true;
      lateMinutes = Math.floor((now.getTime() - scheduledStart.getTime()) / (60 * 1000));
      status = 'LATE';
    }

    const attendance = await prisma.teacherAttendance.upsert({
      where: {
        teacherId_date: {
          teacherId: teacher.id,
          date: today,
        },
      },
      update: {
        userId: user.id,
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
        timeIn: now,
        timeInPhoto: photoBase64,
        status,
        isLate,
        lateMinutes,
      },
      create: {
        teacherId: teacher.id,
        userId: user.id,
        date: today,
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
        timeIn: now,
        timeInPhoto: photoBase64,
        status,
        isLate,
        lateMinutes,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/attendance');

    return {
      success: true,
      isLate,
      lateMinutes,
      arrivalTimestamp: now.toLocaleTimeString(),
      attendanceId: attendance.id,
    };
  } catch (err: any) {
    console.error('Freshness check error:', err);
    return { error: err.message || 'Failed to record freshness check.' };
  }
}

export type TimeOutResult = {
  success?: boolean;
  error?: string;
  isEarlyOut?: boolean;
  earlyOutMinutes?: number;
  logoutTimestamp?: string;
};

/**
 * Teacher Shift Logout Action
 * - Restricts logout during active shift hours
 * - Logout only allowed starting 15 minutes before shift end (T-15) or at exact shift end
 * - Early departure requires explicit reason and flags EARLY_OUT
 */
export async function recordTeacherLogoutAction(reason?: string): Promise<TimeOutResult> {
  try {
    const user = await requireAuth();

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
      include: { shiftSchedule: true },
    });

    if (!teacher) {
      return { error: 'No teacher profile linked to your user account.' };
    }

    const now = new Date();
    const today = normalizeDate(now);

    const attendance = await prisma.teacherAttendance.findUnique({
      where: {
        teacherId_date: {
          teacherId: teacher.id,
          date: today,
        },
      },
    });

    if (!attendance || !attendance.timeIn) {
      return { error: 'Cannot record logout because no time-in event was recorded for today.' };
    }

    if (attendance.timeOut) {
      return { error: `You have already timed out today at ${new Date(attendance.timeOut).toLocaleTimeString()}.` };
    }

    const startTimeStr = teacher.shiftSchedule?.startTime || '08:00';
    const endTimeStr = teacher.shiftSchedule?.endTime || '17:00';
    const { scheduledEnd, tMinus15End } = getShiftBoundaries(now, startTimeStr, endTimeStr);

    let isEarlyOut = false;
    let earlyOutMinutes = 0;

    // Check if current time is before T-15 before shift end
    if (now < tMinus15End) {
      if (!reason || reason.trim().length < 5) {
        return {
          error: `Logout is locked during active shift hours. Logout becomes available 15 minutes before shift end (${tMinus15End.toLocaleTimeString()}). To depart early, please specify an Early Time-Off reason.`,
        };
      }
      isEarlyOut = true;
      earlyOutMinutes = Math.ceil((scheduledEnd.getTime() - now.getTime()) / (60 * 1000));
    }

    const newStatus = isEarlyOut ? 'EARLY_OUT' : attendance.status;

    await prisma.teacherAttendance.update({
      where: { id: attendance.id },
      data: {
        timeOut: now,
        isEarlyOut,
        earlyOutMinutes,
        status: newStatus,
        absenceReason: isEarlyOut ? reason?.trim() : attendance.absenceReason,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/attendance');

    return {
      success: true,
      isEarlyOut,
      earlyOutMinutes,
      logoutTimestamp: now.toLocaleTimeString(),
    };
  } catch (err: any) {
    console.error('Logout recording error:', err);
    return { error: err.message || 'Failed to record shift logout.' };
  }
}

/**
 * Admin / Manager: Verify and reconcile teacher attendance
 */
export async function verifyTeacherAttendanceAction(
  attendanceId: string,
  data: {
    status?: 'PRESENT' | 'LATE' | 'EARLY_OUT' | 'ABSENT_VALID' | 'ABSENT_INVALID' | 'NO_LOGOUT' | 'SRD' | 'APPROVED_REST_DAY';
    adminRemarks?: string;
    absenceReason?: string;
  }
) {
  const user = await requirePermission('attendance:verify');

  const attendance = await prisma.teacherAttendance.findUnique({
    where: { id: attendanceId },
  });

  if (!attendance) {
    throw new Error('Attendance record not found.');
  }

  await prisma.teacherAttendance.update({
    where: { id: attendanceId },
    data: {
      status: data.status || attendance.status,
      adminRemarks: data.adminRemarks !== undefined ? data.adminRemarks : attendance.adminRemarks,
      absenceReason: data.absenceReason !== undefined ? data.absenceReason : attendance.absenceReason,
      isVerifiedByAdmin: true,
      verifiedById: user.id,
      verifiedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/attendance');
  return { success: true };
}

/**
 * Fetches attendance roster for a specific date (defaults to today)
 */
export async function getAttendanceRosterAction(targetDateStr?: string) {
  await requirePermission('attendance:read');

  const targetDate = targetDateStr ? normalizeDate(new Date(targetDateStr)) : normalizeDate(new Date());

  // Fetch all active approved teachers
  const teachers = await prisma.teacherProfile.findMany({
    where: { registrationStatus: 'APPROVED' },
    include: {
      shiftSchedule: true,
      attendances: {
        where: { date: targetDate },
      },
      user: {
        select: { username: true, email: true },
      },
    },
    orderBy: { displayName: 'asc' },
  });

  return teachers.map((t) => {
    const attendance = t.attendances[0] || null;
    return {
      teacherId: t.id,
      displayName: t.displayName,
      realFullName: t.realFullName,
      cellphone: t.cellphone,
      department: t.department,
      projectType: t.projectType,
      shiftName: t.shiftSchedule?.name || 'Standard (08:00 - 17:00)',
      attendance,
    };
  });
}

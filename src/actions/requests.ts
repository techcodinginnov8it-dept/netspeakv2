'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

function normalizeDate(d: Date): Date {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

const SRDRequestSchema = z.object({
  originalRestDay: z.string().min(1, 'Original rest day is required'),
  dateNotWorking: z.string().min(1, 'Date not working is required'),
  switchedWorkDate: z.string().min(1, 'Switched work date is required'),
  reason: z.string().min(5, 'A clear reason is required (at least 5 characters)'),
});

/**
 * Submit Switch Rest Day (SRD) Request
 */
export async function submitSRDRequestAction(formData: FormData) {
  try {
    const user = await requirePermission('requests:submit');

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
    });

    if (!teacher) {
      return { error: 'No teacher profile linked to your user account.' };
    }

    const rawData = {
      originalRestDay: formData.get('originalRestDay') as string,
      dateNotWorking: formData.get('dateNotWorking') as string,
      switchedWorkDate: formData.get('switchedWorkDate') as string,
      reason: formData.get('reason') as string,
    };

    const parsed = SRDRequestSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: 'Validation failed. Please verify dates and reason.' };
    }

    const notWorkingDate = normalizeDate(new Date(parsed.data.dateNotWorking));
    const workDate = normalizeDate(new Date(parsed.data.switchedWorkDate));

    if (notWorkingDate.getTime() === workDate.getTime()) {
      return { error: 'The date not working and swapped work date cannot be the same day.' };
    }

    const request = await prisma.switchRestDayRequest.create({
      data: {
        teacherId: teacher.id,
        originalRestDay: parsed.data.originalRestDay,
        dateNotWorking: notWorkingDate,
        switchedWorkDate: workDate,
        reason: parsed.data.reason.trim(),
        status: 'PENDING',
      },
    });

    revalidatePath('/dashboard/requests');
    return { success: true, requestId: request.id };
  } catch (err: any) {
    console.error('SRD request error:', err);
    return { error: err.message || 'Failed to submit SRD request.' };
  }
}

/**
 * Operations Manager: Approve SRD Request
 * Automatically synchronizes attendance and master schedule:
 * - Marks the date not working with status `SRD` in TeacherAttendance
 */
export async function approveSRDRequestAction(requestId: string, remarks?: string) {
  const user = await requirePermission('requests:approve');

  const req = await prisma.switchRestDayRequest.findUnique({
    where: { id: requestId },
    include: { teacher: true },
  });

  if (!req) {
    throw new Error('SRD request not found.');
  }

  if (req.status === 'APPROVED') {
    throw new Error('This SRD request is already approved.');
  }

  // Update in transaction: Approve request + update attendance record for target date
  await prisma.$transaction(async (tx) => {
    await tx.switchRestDayRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approverId: user.id,
        approverRemarks: remarks?.trim() || null,
        approvedAt: new Date(),
      },
    });

    // Synchronize attendance: Mark dateNotWorking as SRD
    await tx.teacherAttendance.upsert({
      where: {
        teacherId_date: {
          teacherId: req.teacherId,
          date: req.dateNotWorking,
        },
      },
      update: {
        status: 'SRD',
        absenceReason: `Approved SRD (Swapped to ${new Date(req.switchedWorkDate).toLocaleDateString()})`,
        adminRemarks: remarks?.trim() || 'SRD auto-synchronized',
      },
      create: {
        teacherId: req.teacherId,
        date: req.dateNotWorking,
        status: 'SRD',
        absenceReason: `Approved SRD (Swapped to ${new Date(req.switchedWorkDate).toLocaleDateString()})`,
        adminRemarks: remarks?.trim() || 'SRD auto-synchronized',
      },
    });
  });

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard/attendance');
  return { success: true };
}

/**
 * Reject SRD Request with remarks
 */
export async function rejectSRDRequestAction(requestId: string, remarks: string) {
  const user = await requirePermission('requests:approve');

  if (!remarks || remarks.trim().length < 3) {
    throw new Error('A reason is required to reject an SRD request.');
  }

  await prisma.switchRestDayRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      approverId: user.id,
      approverRemarks: remarks.trim(),
      approvedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/requests');
  return { success: true };
}

const EarlyTimeOffSchema = z.object({
  shiftDate: z.string().min(1, 'Shift date is required'),
  timeOffStart: z.string().min(1, 'Time off start timestamp is required'),
  reason: z.string().min(5, 'Reason is required (at least 5 characters)'),
  checklistAcknowledged: z.boolean().refine((val) => val === true, 'You must acknowledge the checklist to prevent client tardiness.'),
});

/**
 * Teacher: Submit Early Time-Off (ETO) Request
 * Enforces 30-minute review window with auto-approval
 */
export async function submitEarlyTimeOffAction(formData: FormData) {
  try {
    const user = await requirePermission('requests:submit');

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
    });

    if (!teacher) {
      return { error: 'No teacher profile found.' };
    }

    const rawData = {
      shiftDate: formData.get('shiftDate') as string,
      timeOffStart: formData.get('timeOffStart') as string,
      reason: formData.get('reason') as string,
      checklistAcknowledged: formData.get('checklistAcknowledged') === 'true' || formData.get('checklistAcknowledged') === 'on',
    };

    const parsed = EarlyTimeOffSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: 'Please check your input values and confirm the checklist acknowledgment.' };
    }

    const shiftDate = normalizeDate(new Date(parsed.data.shiftDate));
    const timeOffStart = new Date(parsed.data.timeOffStart);

    // Auto-approval expiry: 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const req = await prisma.earlyTimeOffRequest.create({
      data: {
        teacherId: teacher.id,
        shiftDate,
        timeOffStart,
        reason: parsed.data.reason.trim(),
        checklistAcknowledged: true,
        expiresAt,
        status: 'PENDING',
      },
    });

    revalidatePath('/dashboard/requests');
    return { success: true, requestId: req.id };
  } catch (err: any) {
    console.error('Early time-off submission error:', err);
    return { error: err.message || 'Failed to submit Early Time-Off request.' };
  }
}

/**
 * Automatically evaluates pending Early Time-Off requests older than 30 minutes
 * and marks them AUTO_APPROVED according to specification rule
 */
export async function checkEarlyTimeOffAutoApprovalsAction() {
  const now = new Date();
  const expired = await prisma.earlyTimeOffRequest.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
  });

  for (const item of expired) {
    await prisma.earlyTimeOffRequest.update({
      where: { id: item.id },
      data: {
        status: 'AUTO_APPROVED',
        approverRemarks: 'System auto-approved (30-minute review window elapsed without rejection)',
        approvedAt: now,
      },
    });
  }

  if (expired.length > 0) {
    revalidatePath('/dashboard/requests');
  }

  return { autoApprovedCount: expired.length };
}

/**
 * Approve Early Time-Off
 */
export async function approveEarlyTimeOffAction(requestId: string, remarks?: string) {
  const user = await requirePermission('requests:approve');

  await prisma.earlyTimeOffRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      approverId: user.id,
      approverRemarks: remarks?.trim() || null,
      approvedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/requests');
  return { success: true };
}

/**
 * Reject Early Time-Off
 */
export async function rejectEarlyTimeOffAction(requestId: string, remarks: string) {
  const user = await requirePermission('requests:approve');

  if (!remarks || remarks.trim().length < 3) {
    throw new Error('A reason is required to reject an Early Time-Off request.');
  }

  await prisma.earlyTimeOffRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      approverId: user.id,
      approverRemarks: remarks.trim(),
      approvedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/requests');
  return { success: true };
}

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

    // Notify managers of new SRD request
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: { role: { name: { in: ['ADMIN', 'OPERATIONS_MANAGER', 'SYSTEM_ADMINISTRATOR'] } } },
        },
      },
      select: { id: true },
    });
    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          title: 'New Switch Rest Day (SRD) Request',
          message: `${teacher.displayName} requested to switch rest day (${parsed.data.originalRestDay}) to work on ${workDate.toLocaleDateString()}.`,
          type: 'REQUEST_STATUS' as any,
          priority: 'NORMAL' as any,
          link: '/dashboard/requests',
        })),
      });
    }

    revalidatePath('/dashboard/requests');
    revalidatePath('/dashboard/notifications');
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

  if (req.teacher?.userId) {
    await prisma.notification.create({
      data: {
        userId: req.teacher.userId,
        title: 'Switch Rest Day (SRD) Approved',
        message: `Your SRD request to switch rest day and work on ${new Date(req.switchedWorkDate).toLocaleDateString()} was approved.`,
        type: 'REQUEST_STATUS' as any,
        priority: 'NORMAL' as any,
        link: '/dashboard/requests',
      },
    });
  }

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard/attendance');
  revalidatePath('/dashboard/notifications');
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

  const req = await prisma.switchRestDayRequest.findUnique({
    where: { id: requestId },
    include: { teacher: true },
  });

  if (!req) {
    throw new Error('SRD request not found.');
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

  if (req.teacher?.userId) {
    await prisma.notification.create({
      data: {
        userId: req.teacher.userId,
        title: 'Switch Rest Day (SRD) Rejected',
        message: `Your SRD request was rejected: "${remarks.trim()}".`,
        type: 'REQUEST_STATUS' as any,
        priority: 'HIGH' as any,
        link: '/dashboard/requests',
      },
    });
  }

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard/notifications');
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

    // Notify managers of urgent ETO request
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: { role: { name: { in: ['ADMIN', 'OPERATIONS_MANAGER', 'SYSTEM_ADMINISTRATOR'] } } },
        },
      },
      select: { id: true },
    });
    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          title: 'Urgent Early Time-Off (ETO) Request',
          message: `${teacher.displayName} submitted an Early Time-Off request for ${new Date(shiftDate).toLocaleDateString()}. Subject to 30-min auto-approval window.`,
          type: 'REQUEST_STATUS' as any,
          priority: 'URGENT' as any,
          link: '/dashboard/requests',
        })),
      });
    }

    revalidatePath('/dashboard/requests');
    revalidatePath('/dashboard/notifications');
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
    include: { teacher: true },
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

    if (item.teacher?.userId) {
      await prisma.notification.create({
        data: {
          userId: item.teacher.userId,
          title: 'Early Time-Off (ETO) Auto-Approved',
          message: 'Your Early Time-Off request was auto-approved as the 30-minute manager review window elapsed.',
          type: 'REQUEST_STATUS' as any,
          priority: 'NORMAL' as any,
          link: '/dashboard/requests',
        },
      });
    }
  }

  if (expired.length > 0) {
    revalidatePath('/dashboard/requests');
    revalidatePath('/dashboard/notifications');
  }

  return { autoApprovedCount: expired.length };
}

/**
 * Approve Early Time-Off
 */
export async function approveEarlyTimeOffAction(requestId: string, remarks?: string) {
  const user = await requirePermission('requests:approve');

  const req = await prisma.earlyTimeOffRequest.findUnique({
    where: { id: requestId },
    include: { teacher: true },
  });
  if (!req) throw new Error('Early time-off request not found.');

  await prisma.earlyTimeOffRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      approverId: user.id,
      approverRemarks: remarks?.trim() || null,
      approvedAt: new Date(),
    },
  });

  if (req.teacher?.userId) {
    await prisma.notification.create({
      data: {
        userId: req.teacher.userId,
        title: 'Early Time-Off (ETO) Approved',
        message: 'Your Early Time-Off request has been approved by management.',
        type: 'REQUEST_STATUS' as any,
        priority: 'NORMAL' as any,
        link: '/dashboard/requests',
      },
    });
  }

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard/notifications');
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

  const req = await prisma.earlyTimeOffRequest.findUnique({
    where: { id: requestId },
    include: { teacher: true },
  });
  if (!req) throw new Error('Early time-off request not found.');

  await prisma.earlyTimeOffRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      approverId: user.id,
      approverRemarks: remarks.trim(),
      approvedAt: new Date(),
    },
  });

  if (req.teacher?.userId) {
    await prisma.notification.create({
      data: {
        userId: req.teacher.userId,
        title: 'Early Time-Off (ETO) Rejected',
        message: `Your Early Time-Off request was rejected: "${remarks.trim()}".`,
        type: 'REQUEST_STATUS' as any,
        priority: 'HIGH' as any,
        link: '/dashboard/requests',
      },
    });
  }

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard/notifications');
  return { success: true };
}

const CashLoanRequestSchema = z.object({
  amount: z.coerce.number().min(1, 'Loan amount must be greater than zero'),
  termMonths: z.coerce.number().int().min(1, 'At least 1 month is required').max(24, 'Loan term cannot exceed 24 months'),
  reason: z.string().min(5, 'A clear reason is required'),
  termsAcknowledged: z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true' || value === 'on' || value === '1';
    return Boolean(value);
  }, z.boolean().refine((value) => value === true, 'You must acknowledge the repayment terms before submitting.')),
});

export async function submitCashLoanRequestAction(formData: FormData) {
  try {
    const user = await requirePermission('requests:submit');

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
    });

    if (!teacher) {
      return { error: 'No teacher profile found for your account.' };
    }

    const rawData = {
      amount: formData.get('amount'),
      termMonths: formData.get('termMonths'),
      reason: formData.get('reason'),
      termsAcknowledged: formData.get('termsAcknowledged'),
    };

    const parsed = CashLoanRequestSchema.safeParse(rawData);
    if (!parsed.success) {
      console.error('Cash loan validation failed:', parsed.error.flatten());
      return { error: 'Please check the loan details and acknowledge the repayment terms.' };
    }

    const deductionPerCycle = Number((parsed.data.amount / parsed.data.termMonths).toFixed(2));
    const repaymentSchedule = `Paid over ${parsed.data.termMonths} month(s) at PHP ${deductionPerCycle.toFixed(2)} per cycle`;

    const request = await prisma.cashLoanRequest.create({
      data: {
        teacherId: teacher.id,
        amount: parsed.data.amount,
        termMonths: parsed.data.termMonths,
        reason: parsed.data.reason.trim(),
        deductionPerCycle,
        repaymentSchedule,
        termsAcknowledged: true,
        status: 'PENDING',
      },
    });

    // Notify managers of new Cash Loan request
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: { role: { name: { in: ['ADMIN', 'OPERATIONS_MANAGER', 'SYSTEM_ADMINISTRATOR'] } } },
        },
      },
      select: { id: true },
    });
    if (managers.length > 0) {
      await prisma.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          title: 'New Cash Loan Request',
          message: `${teacher.displayName} requested a Cash Loan of PHP ${Number(parsed.data.amount).toLocaleString()} (${parsed.data.termMonths} months).`,
          type: 'REQUEST_STATUS' as any,
          priority: 'NORMAL' as any,
          link: '/dashboard/requests',
        })),
      });
    }

    revalidatePath('/dashboard/requests');
    revalidatePath('/dashboard/notifications');
    return { success: true, requestId: request.id };
  } catch (error: any) {
    console.error('Cash loan submission failed:', error);
    return { error: error.message || 'Failed to submit cash loan request.' };
  }
}

export async function approveCashLoanRequestAction(requestId: string, remarks?: string) {
  const user = await requirePermission('requests:approve');

  const request = await prisma.cashLoanRequest.findUnique({
    where: { id: requestId },
    include: { teacher: true },
  });
  if (!request) {
    throw new Error('Cash loan request not found.');
  }

  await prisma.cashLoanRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      approverId: user.id,
      approverRemarks: remarks?.trim() || null,
      approvedAt: new Date(),
    },
  });

  if (request.teacher?.userId) {
    await prisma.notification.create({
      data: {
        userId: request.teacher.userId,
        title: 'Cash Loan Request Approved',
        message: `Your Cash Loan request for PHP ${Number(request.amount).toLocaleString()} has been approved.`,
        type: 'REQUEST_STATUS' as any,
        priority: 'NORMAL' as any,
        link: '/dashboard/requests',
      },
    });
  }

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard/notifications');
  return { success: true };
}

export async function rejectCashLoanRequestAction(requestId: string, remarks: string) {
  const user = await requirePermission('requests:approve');

  if (!remarks || remarks.trim().length < 3) {
    throw new Error('A rejection reason is required.');
  }

  const request = await prisma.cashLoanRequest.findUnique({
    where: { id: requestId },
    include: { teacher: true },
  });
  if (!request) {
    throw new Error('Cash loan request not found.');
  }

  await prisma.cashLoanRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      approverId: user.id,
      approverRemarks: remarks.trim(),
      approvedAt: new Date(),
    },
  });

  if (request.teacher?.userId) {
    await prisma.notification.create({
      data: {
        userId: request.teacher.userId,
        title: 'Cash Loan Request Rejected',
        message: `Your Cash Loan request was rejected: "${remarks.trim()}".`,
        type: 'REQUEST_STATUS' as any,
        priority: 'HIGH' as any,
        link: '/dashboard/requests',
      },
    });
  }

  revalidatePath('/dashboard/requests');
  revalidatePath('/dashboard/notifications');
  return { success: true };
}

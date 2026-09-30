'use server';

import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { checkEarlyTimeOffAutoApprovalsAction } from './requests';
import { generateDailyStaffOperationsSummaryAction } from './staffOperations';


/**
 * Internal evaluator used by both the admin UI and the protected cron endpoint.
 * This keeps the logic in one place and allows the route to validate a secret instead
 * of relying on a logged-in user session.
 */
export async function evaluateScheduledAlertsInternal() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const generatedAlerts: string[] = [];

  // 1. Scan Teachers without Logout for today if shift ended (§17, §44)
  const openAttendances = await prisma.teacherAttendance.findMany({
    where: {
      date: today,
      timeIn: { not: null },
      timeOut: null,
    },
    include: {
      teacher: {
        include: { user: true },
      },
    },
  });

  for (const att of openAttendances) {
    if (att.teacher.user) {
      // Check if alert already created today to maintain idempotency
      const existingAlert = await prisma.notification.findFirst({
        where: {
          userId: att.teacher.user.id,
          type: NotificationType.NO_LOGOUT,
          createdAt: { gte: today },
        },
      });

      if (!existingAlert) {
        await prisma.notification.create({
          data: {
            userId: att.teacher.user.id,
            title: 'Shift Departure Reminder: No Logout Recorded',
            message: 'Your shift has elapsed without recorded sign-off. Please submit your daily slot output and confirm departure.',
            type: NotificationType.NO_LOGOUT,
            priority: NotificationPriority.HIGH,
            link: '/dashboard/output',
          },
        });
        generatedAlerts.push(`No-Logout notification dispatched to ${att.teacher.displayName}`);
      }
    }
  }

  // 2. Scan Staff (Admin / IT) with Incomplete Checklists past shift hour (§9.2, §28.2, §44)
  const staffOpen = await prisma.staffAttendance.findMany({
    where: {
      date: today,
      timeIn: { not: null },
      isChecklistComplete: false,
    },
    include: {
      staffProfile: {
        include: { user: true },
      },
    },
  });

  for (const staff of staffOpen) {
    const existingChecklistAlert = await prisma.notification.findFirst({
      where: {
        userId: staff.staffProfile.user.id,
        type: NotificationType.CHECKLIST_INCOMPLETE,
        createdAt: { gte: today },
      },
    });

    if (!existingChecklistAlert) {
      await prisma.notification.create({
        data: {
          userId: staff.staffProfile.user.id,
          title: 'Mandatory End-of-Shift Checklist Pending',
          message: `Incomplete ${staff.staffProfile.roleType} checklist detected. Time Out remains restricted until all items are verified.`,
          type: NotificationType.CHECKLIST_INCOMPLETE,
          priority: NotificationPriority.URGENT,
          link: '/dashboard/operations',
        },
      });
      generatedAlerts.push(`Incomplete checklist alert sent to ${staff.staffProfile.user.fullName}`);
    }
  }

  // 3. Scan Upcoming Simulation Drills within 3 days (§32, §44)
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const upcomingDrills = await prisma.simulationDrill.findMany({
    where: {
      scheduledDate: {
        gte: now,
        lte: threeDaysFromNow,
      },
      status: 'SCHEDULED',
    },
  });

  if (upcomingDrills.length > 0) {
    // Notify all Center Admins & IT
    const opsStaff = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: { name: { in: ['ADMIN', 'IT', 'OPERATIONS_MANAGER'] } },
          },
        },
      },
      select: { id: true },
    });

    for (const drill of upcomingDrills) {
      for (const staffUser of opsStaff) {
        const existingDrillAlert = await prisma.notification.findFirst({
          where: {
            userId: staffUser.id,
            type: NotificationType.SIMULATION_REMINDER,
            metadata: drill.id,
          },
        });

        if (!existingDrillAlert) {
          await prisma.notification.create({
            data: {
              userId: staffUser.id,
              title: `Upcoming Drill: ${drill.title}`,
              message: `Scheduled ${drill.drillType.replace(/_/g, ' ')} simulation on ${drill.scheduledDate.toLocaleDateString()}. Confirm readiness and attendance roster.`,
              type: NotificationType.SIMULATION_REMINDER,
              priority: NotificationPriority.NORMAL,
              link: '/dashboard/simulations',
              metadata: drill.id,
            },
          });
        }
      }
      generatedAlerts.push(`Simulation countdown reminder dispatched for "${drill.title}"`);
    }
  }

  // 4. D-006 Fix: Auto-approve ETO requests past 30-minute review window (§16, §44)
  const etoResult = await checkEarlyTimeOffAutoApprovalsAction();
  if (etoResult.autoApprovedCount > 0) {
    generatedAlerts.push(`Auto-approved ${etoResult.autoApprovedCount} Early Time-Off request(s) past review window`);
  }

  // 5. D-005 Fix: NO_LOGIN detection — teachers with no Time-In past T+15 of shift start (§44)
  const activeTeachers = await prisma.teacherProfile.findMany({
    where: { registrationStatus: 'APPROVED', userId: { not: null } },
    include: {
      shiftSchedule: true,
      user: true,
      attendances: { where: { date: today } },
    },
  });

  for (const teacher of activeTeachers) {
    const todayAttendance = teacher.attendances[0];
    if (todayAttendance?.timeIn) continue; // Already logged in

    const startTimeStr = teacher.shiftSchedule?.startTime || '08:00';
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const shiftStart = new Date(today);
    shiftStart.setHours(startH, startM, 0, 0);
    const t15AfterStart = new Date(shiftStart.getTime() + 15 * 60 * 1000);

    if (now < t15AfterStart) continue; // Shift hasn't started + grace yet
    if (!teacher.user) continue;

    const existingNoLogin = await prisma.notification.findFirst({
      where: {
        userId: teacher.user.id,
        type: NotificationType.NO_LOGIN,
        createdAt: { gte: today },
      },
    });

    if (!existingNoLogin) {
      await prisma.notification.create({
        data: {
          userId: teacher.user.id,
          title: 'Shift Started — No Login Recorded',
          message: `Your shift started at ${startTimeStr} and no Freshness Check has been recorded. Please log in immediately or contact your center admin.`,
          type: NotificationType.NO_LOGIN,
          priority: NotificationPriority.HIGH,
          link: '/dashboard',
        },
      });
      generatedAlerts.push(`No-Login alert dispatched to ${teacher.displayName}`);
    }
  }

  // 6. Slot Opening Compliance & 3-Day Reminders (§XIX)
  // Teachers must open slots 1 month in advance. Send reminder 3 days before deadline.
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const targetMonthStr = nextMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const deadlineForNextMonth = new Date(now.getFullYear(), now.getMonth(), 28); // 28th of current month
  const tMinus3Deadline = new Date(deadlineForNextMonth.getTime() - 3 * 24 * 60 * 60 * 1000);

  if (now >= tMinus3Deadline && now <= deadlineForNextMonth) {
    for (const teacher of activeTeachers) {
      if (!teacher.user) continue;

      const compliance = await prisma.slotOpeningCompliance.findUnique({
        where: {
          teacherId_targetMonth: {
            teacherId: teacher.id,
            targetMonth: targetMonthStr,
          },
        },
      });

      if (!compliance || !compliance.isCompliant) {
        const existingSlotReminder = await prisma.notification.findFirst({
          where: {
            userId: teacher.user.id,
            type: NotificationType.SLOT_DEADLINE,
            createdAt: { gte: tMinus3Deadline },
          },
        });

        if (!existingSlotReminder) {
          await prisma.notification.create({
            data: {
              userId: teacher.user.id,
              title: `Slot Opening Deadline: ${targetMonthStr}`,
              message: `Urgent (§XIX): You must open your required teaching slots for ${targetMonthStr} before ${deadlineForNextMonth.toLocaleDateString()}. Please update your schedule immediately.`,
              type: NotificationType.SLOT_DEADLINE,
              priority: NotificationPriority.URGENT,
              link: '/dashboard/output',
            },
          });
          generatedAlerts.push(`Slot opening 3-day reminder dispatched to ${teacher.displayName}`);
        }
      }
    }
  }

  // 7. Daily Executive Staff Operations Summary (§XXVII)
  // Fire after 18:00 PHT (end of standard admin shift) once per day
  const phtHour = (now.getUTCHours() + 8) % 24; // Convert UTC to PHT UTC+8
  if (phtHour >= 18) {
    const summaryResult = await generateDailyStaffOperationsSummaryAction().catch(() => null);
    if (summaryResult?.dispatched) {
      generatedAlerts.push(`Daily executive summary dispatched to ${summaryResult.dispatched} Operations Manager(s)`);
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/notifications');
  return {
    success: true,
    alertsDispatched: generatedAlerts.length,
    log: generatedAlerts,
  };
}

/**
 * Admin/UI entry point enforcing RBAC before evaluation.
 */
export async function runScheduledAlertsEvaluationAction() {
  await requirePermission(PERMISSIONS.SYSTEM_JOBS);
  return evaluateScheduledAlertsInternal();
}

'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

function normalizeDate(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const DailyOutputSchema = z.object({
  date: z.string().optional(),
  openSlots: z.number().int().min(0, 'Open slots cannot be negative'),
  bookedSlots: z.number().int().min(0, 'Booked slots cannot be negative'),
  classTardiness: z.number().int().min(0).default(0),
  absentClasses: z.number().int().min(0).default(0),
  earlyLeaveClasses: z.number().int().min(0).default(0),
  remarks: z.string().optional(),
  announcementAcknowledged: z.boolean().default(true),
});

export type DailyOutputResult = {
  success?: boolean;
  error?: string;
  outputId?: string;
};

/**
 * Submit or update daily output report
 * Enforces:
 * - 48-hour editing window restriction post-shift
 * - Announcement acknowledgment
 */
export async function submitDailyOutputAction(
  data: z.infer<typeof DailyOutputSchema>
): Promise<DailyOutputResult> {
  try {
    const user = await requirePermission('output:submit');

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
    });

    if (!teacher) {
      return { error: 'No teacher profile associated with this account.' };
    }

    const parsed = DailyOutputSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid output report values. Please review input numbers.' };
    }

    const {
      date: dateStr,
      openSlots,
      bookedSlots,
      classTardiness,
      absentClasses,
      earlyLeaveClasses,
      remarks,
      announcementAcknowledged,
    } = parsed.data;

    const targetDate = dateStr ? normalizeDate(new Date(dateStr)) : normalizeDate();

    // Check if existing record exists
    const existing = await prisma.dailyOutput.findUnique({
      where: {
        teacherId_date: {
          teacherId: teacher.id,
          date: targetDate,
        },
      },
    });

    const now = new Date();

    if (existing) {
      // Rule: 48-Hour edit window post-shift
      const diffHours = (now.getTime() - new Date(existing.createdAt).getTime()) / (1000 * 60 * 60);
      if (diffHours > 48) {
        return {
          error: 'Daily output reports can only be edited/corrected for up to 48 hours after submission. This report is now locked.',
        };
      }

      const updated = await prisma.dailyOutput.update({
        where: { id: existing.id },
        data: {
          openSlots,
          bookedSlots,
          classTardiness,
          absentClasses,
          earlyLeaveClasses,
          remarks: remarks?.trim(),
          announcementAcknowledged,
        },
      });

      revalidatePath('/dashboard');
      revalidatePath('/dashboard/output');
      return { success: true, outputId: updated.id };
    }

    // Create new daily output record
    const created = await prisma.dailyOutput.create({
      data: {
        teacherId: teacher.id,
        date: targetDate,
        openSlots,
        bookedSlots,
        classTardiness,
        absentClasses,
        earlyLeaveClasses,
        remarks: remarks?.trim(),
        announcementAcknowledged,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/output');
    return { success: true, outputId: created.id };
  } catch (err: any) {
    console.error('Daily output submission error:', err);
    return { error: err.message || 'Failed to submit daily output.' };
  }
}

/**
 * Get active announcements for acknowledgment
 */
export async function getActiveAnnouncementsAction() {
  await requireAuth();
  return prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

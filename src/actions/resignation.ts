'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ResignationReason, ResignationWorkflowStatus } from '@prisma/client';

const ResignationFormSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  branch: z.string().min(2, 'Branch is required'),
  project: z.string().min(2, 'Project is required'),
  effectivityDate: z.string().min(1, 'Effectivity date is required'),
  reason: z.nativeEnum(ResignationReason),
  resignationLetter: z.string().min(10, 'Resignation letter content is required'),
  signature: z.string().min(1, 'Signature is required'),
  remarks: z.string().optional(),
});

export type ResignationActionResult = {
  success?: boolean;
  error?: string;
  resignationId?: string;
};

/**
 * Teacher submits their resignation
 */
export async function submitTeacherResignationAction(
  data: z.infer<typeof ResignationFormSchema>
): Promise<ResignationActionResult> {
  try {
    const user = await requirePermission('resignation:submit');

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
    });

    if (!teacher) {
      return { error: 'No active teacher profile found for this account.' };
    }

    // Check if there is already an active resignation
    const existing = await prisma.teacherResignation.findFirst({
      where: {
        teacherId: teacher.id,
        status: {
          notIn: [ResignationWorkflowStatus.WITHDRAWN, ResignationWorkflowStatus.DEACTIVATED],
        },
      },
    });

    if (existing) {
      return { error: 'You already have an active resignation under review.' };
    }

    const parsed = ResignationFormSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid form submission.' };
    }

    const {
      fullName,
      branch,
      project,
      effectivityDate,
      reason,
      resignationLetter,
      signature,
      remarks,
    } = parsed.data;

    const effDate = new Date(effectivityDate);
    if (isNaN(effDate.getTime())) {
      return { error: 'Invalid effectivity date.' };
    }

    const created = await prisma.teacherResignation.create({
      data: {
        teacherId: teacher.id,
        fullName: fullName.trim(),
        branch: branch.trim(),
        project: project.trim(),
        dateFiled: new Date(),
        effectivityDate: effDate,
        reason,
        resignationLetter: resignationLetter.trim(),
        signature: signature.trim(),
        remarks: remarks?.trim() || null,
        status: ResignationWorkflowStatus.SUBMITTED,
      },
    });

    revalidatePath('/dashboard/resignation');
    revalidatePath('/dashboard/resignation/monitoring');
    return { success: true, resignationId: created.id };
  } catch (err: any) {
    console.error('Submit resignation error:', err);
    return { error: err.message || 'Failed to submit resignation.' };
  }
}

/**
 * Teacher books an open Exit Interview slot
 */
export async function bookExitInterviewSlotAction(
  resignationId: string,
  slotId: string
): Promise<ResignationActionResult> {
  try {
    const user = await requireAuth();

    const resignation = await prisma.teacherResignation.findUnique({
      where: { id: resignationId },
      include: { teacher: true },
    });

    if (!resignation) {
      return { error: 'Resignation record not found.' };
    }

    // Teacher can book their own, or Admin can book on their behalf
    const isOwner = resignation.teacher.userId === user.id;
    const isManager = user.permissions.includes('resignation:manage') || user.roles.includes('SYSTEM_ADMINISTRATOR');

    if (!isOwner && !isManager) {
      return { error: 'Unauthorized to book exit interview for this record.' };
    }

    const slot = await prisma.exitInterviewSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot || slot.isBooked) {
      return { error: 'Selected exit interview slot is unavailable or already taken.' };
    }

    // Free previously booked slot if any
    await prisma.exitInterviewSlot.updateMany({
      where: { resignationId },
      data: { isBooked: false, resignationId: null },
    });

    // Book selected slot
    await prisma.exitInterviewSlot.update({
      where: { id: slotId },
      data: {
        isBooked: true,
        resignationId,
      },
    });

    await prisma.teacherResignation.update({
      where: { id: resignationId },
      data: {
        status: ResignationWorkflowStatus.EXIT_INTERVIEW_SCHEDULED,
      },
    });

    revalidatePath('/dashboard/resignation');
    revalidatePath('/dashboard/resignation/monitoring');
    return { success: true };
  } catch (err: any) {
    console.error('Book exit interview slot error:', err);
    return { error: err.message || 'Failed to book slot.' };
  }
}

/**
 * Operations Assistant opens an Exit Interview slot
 */
export async function createExitInterviewSlotAction(
  slotDateTimeStr: string,
  interviewerName: string = 'Operations Manager Assistant'
): Promise<ResignationActionResult> {
  try {
    await requirePermission('exit_interview:manage');

    const dt = new Date(slotDateTimeStr);
    if (isNaN(dt.getTime())) {
      return { error: 'Invalid date/time provided for exit interview slot.' };
    }

    await prisma.exitInterviewSlot.create({
      data: {
        slotDateTime: dt,
        interviewerName: interviewerName.trim() || 'Operations Manager Assistant',
        isBooked: false,
      },
    });

    revalidatePath('/dashboard/resignation/monitoring');
    revalidatePath('/dashboard/resignation');
    return { success: true };
  } catch (err: any) {
    console.error('Create slot error:', err);
    return { error: err.message || 'Failed to create slot.' };
  }
}

/**
 * Manager updates resignation workflow stage & review notes
 */
export async function updateResignationStatusAction(
  resignationId: string,
  status: ResignationWorkflowStatus,
  reviewNotes?: string
): Promise<ResignationActionResult> {
  try {
    const user = await requirePermission('resignation:manage');

    await prisma.teacherResignation.update({
      where: { id: resignationId },
      data: {
        status,
        reviewNotes: reviewNotes ? reviewNotes.trim() : undefined,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/resignation/monitoring');
    return { success: true };
  } catch (err: any) {
    console.error('Update resignation status error:', err);
    return { error: err.message || 'Failed to update resignation status.' };
  }
}

/**
 * Complete Exit Interview
 */
export async function completeExitInterviewAction(
  slotId: string,
  interviewNotes: string
): Promise<ResignationActionResult> {
  try {
    await requirePermission('exit_interview:manage');

    const slot = await prisma.exitInterviewSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot || !slot.resignationId) {
      return { error: 'Exit interview slot not linked to a resignation.' };
    }

    await prisma.exitInterviewSlot.update({
      where: { id: slotId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        interviewNotes: interviewNotes.trim(),
      },
    });

    await prisma.teacherResignation.update({
      where: { id: slot.resignationId },
      data: {
        status: ResignationWorkflowStatus.EXIT_INTERVIEW_COMPLETED,
        tpcapNotified: true,
        tpcapNotifiedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/resignation/monitoring');
    return { success: true };
  } catch (err: any) {
    console.error('Complete exit interview error:', err);
    return { error: err.message || 'Failed to complete exit interview.' };
  }
}

/**
 * Complete IT Clearance (PC reformat, access revocation)
 * §27: Automatically transitions the resigned teacher's workstation to PENDING_REFORMAT
 */
export async function completeITClearanceAction(
  resignationId: string,
  itRemarks: string
): Promise<ResignationActionResult> {
  try {
    await requirePermission('resignation:manage');

    const resignation = await prisma.teacherResignation.findUnique({
      where: { id: resignationId },
      include: { teacher: { include: { seatingAssignments: { include: { workstation: true } } } } },
    });

    if (!resignation) {
      return { error: 'Resignation record not found.' };
    }

    // D-001 Fix: Auto-transition the resigned teacher's workstation to PENDING_REFORMAT
    // This ensures IT knows which PC needs reformatting without manual intervention
    const activeAssignment = resignation.teacher.seatingAssignments.find(
      (a) => !a.unassignedAt && a.workstation.status === 'OCCUPIED'
    );

    await prisma.$transaction(async (tx) => {
      // Mark IT clearance complete on resignation record
      await tx.teacherResignation.update({
        where: { id: resignationId },
        data: {
          itCleared: true,
          itClearedAt: new Date(),
          itRemarks: itRemarks.trim(),
          status: ResignationWorkflowStatus.IT_CLEARANCE_PENDING,
        },
      });

      // Auto-set workstation to PENDING_REFORMAT if found
      if (activeAssignment) {
        await tx.workstation.update({
          where: { id: activeAssignment.workstationId },
          data: {
            status: 'PENDING_REFORMAT',
            notes: `Resigned teacher ${resignation.fullName} — IT clearance completed. Awaiting reformat.`,
          },
        });

        // Mark the seating assignment as vacated
        await tx.seatingAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            unassignedAt: new Date(),
            unassignedReason: 'RESIGNED',
          },
        });
      }
    });

    revalidatePath('/dashboard/resignation/monitoring');
    revalidatePath('/dashboard/seating');
    return { success: true };
  } catch (err: any) {
    console.error('Complete IT clearance error:', err);
    return { error: err.message || 'Failed to complete IT clearance.' };
  }
}

/**
 * Final step in offboarding: Deactivate Resigned Teacher account & profile
 */
export async function deactivateResignedTeacherAction(
  resignationId: string
): Promise<ResignationActionResult> {
  try {
    const user = await requirePermission('resignation:manage');

    const resignation = await prisma.teacherResignation.findUnique({
      where: { id: resignationId },
      include: { teacher: true },
    });

    if (!resignation) {
      return { error: 'Resignation not found.' };
    }

    // Deactivate User account if linked
    if (resignation.teacher.userId) {
      await prisma.user.update({
        where: { id: resignation.teacher.userId },
        data: { isActive: false },
      });
    }

    // Mark resignation as DEACTIVATED
    await prisma.teacherResignation.update({
      where: { id: resignationId },
      data: {
        status: ResignationWorkflowStatus.DEACTIVATED,
        deactivatedAt: new Date(),
        deactivatedById: user.id,
      },
    });

    revalidatePath('/dashboard/resignation/monitoring');
    revalidatePath('/dashboard/teachers');
    return { success: true };
  } catch (err: any) {
    console.error('Deactivate resigned teacher error:', err);
    return { error: err.message || 'Failed to deactivate teacher.' };
  }
}

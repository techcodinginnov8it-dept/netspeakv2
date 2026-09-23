'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  ConcernCategory,
  TicketUrgency,
  TicketStatus,
  IncidentCategory,
  IncidentStatus,
} from '@prisma/client';

// ----------------------------------------------------
// Teacher Concerns Schemas & Actions (§20)
// ----------------------------------------------------

const TeacherConcernSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.nativeEnum(ConcernCategory),
  urgency: z.nativeEnum(TicketUrgency).default(TicketUrgency.NORMAL),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  attachmentUrl: z.string().optional(),
});

export type TicketActionResult = {
  success?: boolean;
  error?: string;
  ticketId?: string;
};

/**
 * Teacher submits a concern ticket (§20)
 */
export async function submitTeacherConcernAction(
  data: z.infer<typeof TeacherConcernSchema>
): Promise<TicketActionResult> {
  try {
    const user = await requirePermission('concerns:submit');

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
    });

    if (!teacher) {
      return { error: 'No linked teacher profile found for this user account.' };
    }

    const parsed = TeacherConcernSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid ticket submission.' };
    }

    const created = await prisma.teacherConcernTicket.create({
      data: {
        teacherId: teacher.id,
        title: parsed.data.title.trim(),
        category: parsed.data.category,
        urgency: parsed.data.urgency,
        description: parsed.data.description.trim(),
        attachmentUrl: parsed.data.attachmentUrl?.trim() || null,
        status: TicketStatus.SUBMITTED,
      },
    });

    revalidatePath('/dashboard/concerns');
    revalidatePath('/dashboard/concerns/manage');
    return { success: true, ticketId: created.id };
  } catch (err: any) {
    console.error('Submit concern error:', err);
    return { error: err.message || 'Failed to submit concern ticket.' };
  }
}

/**
 * Operations Manager updates concern ticket lifecycle status & assignee (§20)
 * Cycle: SUBMITTED -> ASSIGNED -> UNDER_REVIEW -> ACTION_TAKEN -> RESOLVED -> CLOSED
 */
export async function updateTeacherConcernStatusAction(
  ticketId: string,
  status: TicketStatus,
  actionTaken?: string,
  resolutionNotes?: string,
  assignedToName?: string
): Promise<TicketActionResult> {
  try {
    const user = await requirePermission('concerns:manage');

    const isResolvedOrClosed = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;

    await prisma.teacherConcernTicket.update({
      where: { id: ticketId },
      data: {
        status,
        actionTaken: actionTaken ? actionTaken.trim() : undefined,
        resolutionNotes: resolutionNotes ? resolutionNotes.trim() : undefined,
        assignedToName: assignedToName ? assignedToName.trim() : undefined,
        resolvedAt: isResolvedOrClosed ? new Date() : undefined,
        resolvedById: isResolvedOrClosed ? user.id : undefined,
      },
    });

    revalidatePath('/dashboard/concerns');
    revalidatePath('/dashboard/concerns/manage');
    return { success: true };
  } catch (err: any) {
    console.error('Update concern status error:', err);
    return { error: err.message || 'Failed to update ticket status.' };
  }
}

// ----------------------------------------------------
// Incident Report Tickets Schemas & Actions (§19)
// ----------------------------------------------------

const IncidentReportSchema = z.object({
  incidentDate: z.string().min(1, 'Incident date is required'),
  incidentTime: z.string().min(1, 'Incident time is required'),
  branch: z.string().min(2, 'Branch is required'),
  personInvolved: z.string().min(2, 'Person(s) involved is required'),
  category: z.nativeEnum(IncidentCategory),
  description: z.string().min(5, 'Incident description is required'),
  evidenceUrl: z.string().optional(),
  actionTaken: z.string().optional(),
  remarks: z.string().optional(),
});

/**
 * Report a formal incident (§19)
 */
export async function reportIncidentAction(
  data: z.infer<typeof IncidentReportSchema>
): Promise<TicketActionResult> {
  try {
    const user = await requirePermission('incidents:report');

    const parsed = IncidentReportSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid incident report.' };
    }

    const {
      incidentDate,
      incidentTime,
      branch,
      personInvolved,
      category,
      description,
      evidenceUrl,
      actionTaken,
      remarks,
    } = parsed.data;

    const dt = new Date(incidentDate);
    if (isNaN(dt.getTime())) {
      return { error: 'Invalid incident date format.' };
    }

    const created = await prisma.incidentReportTicket.create({
      data: {
        incidentDate: dt,
        incidentTime: incidentTime.trim(),
        reporterId: user.id,
        reporterName: user.fullName || user.username,
        branch: branch.trim(),
        personInvolved: personInvolved.trim(),
        category,
        description: description.trim(),
        evidenceUrl: evidenceUrl?.trim() || null,
        actionTaken: actionTaken?.trim() || null,
        remarks: remarks?.trim() || null,
        status: IncidentStatus.REPORTED,
      },
    });

    revalidatePath('/dashboard/concerns/manage');
    return { success: true, ticketId: created.id };
  } catch (err: any) {
    console.error('Report incident error:', err);
    return { error: err.message || 'Failed to file incident report.' };
  }
}

/**
 * Update incident investigation & resolution status (§19)
 */
export async function updateIncidentStatusAction(
  ticketId: string,
  status: IncidentStatus,
  actionTaken?: string,
  remarks?: string
): Promise<TicketActionResult> {
  try {
    const user = await requirePermission('incidents:manage');

    const isResolved = status === IncidentStatus.RESOLVED;

    await prisma.incidentReportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        actionTaken: actionTaken ? actionTaken.trim() : undefined,
        remarks: remarks ? remarks.trim() : undefined,
        resolvedAt: isResolved ? new Date() : undefined,
        resolvedById: isResolved ? user.id : undefined,
      },
    });

    revalidatePath('/dashboard/concerns/manage');
    return { success: true };
  } catch (err: any) {
    console.error('Update incident status error:', err);
    return { error: err.message || 'Failed to update incident report.' };
  }
}

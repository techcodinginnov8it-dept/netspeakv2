'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireAuth } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SeatStatus } from '@prisma/client';

export type SeatingActionResult = {
  success?: boolean;
  error?: string;
};

const AddWorkstationSchema = z.object({
  branch: z.string().min(2, 'Branch is required'),
  workstationNo: z.string().min(1, 'Workstation number is required'),
  seatNo: z.string().min(1, 'Seat number is required'),
  specs: z.string().optional(),
  notes: z.string().optional(),
});

export async function addWorkstationAction(
  data: z.infer<typeof AddWorkstationSchema>
): Promise<SeatingActionResult> {
  try {
    await requirePermission('seating:manage');
    const parsed = AddWorkstationSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid workstation data.' };
    }
    const { branch, workstationNo, seatNo, specs, notes } = parsed.data;

    const existing = await prisma.workstation.findUnique({
      where: { branch_workstationNo: { branch, workstationNo } },
    });
    if (existing) {
      return { error: `${workstationNo} already exists in ${branch}.` };
    }

    await prisma.workstation.create({
      data: { branch, workstationNo, seatNo, specs: specs?.trim() || null, notes: notes?.trim() || null, status: SeatStatus.AVAILABLE },
    });

    revalidatePath('/dashboard/seating');
    revalidatePath('/dashboard/seating/manage');
    return { success: true };
  } catch (err: any) {
    console.error('addWorkstationAction error:', err);
    return { error: err.message || 'Failed to add workstation.' };
  }
}

export async function updateWorkstationStatusAction(
  workstationId: string,
  status: SeatStatus,
  notes?: string
): Promise<SeatingActionResult> {
  try {
    await requirePermission('seating:manage');
    await prisma.workstation.update({
      where: { id: workstationId },
      data: { status, notes: notes !== undefined ? notes.trim() : undefined },
    });
    revalidatePath('/dashboard/seating');
    revalidatePath('/dashboard/seating/manage');
    return { success: true };
  } catch (err: any) {
    console.error('updateWorkstationStatusAction error:', err);
    return { error: err.message || 'Failed to update workstation status.' };
  }
}

export async function deleteWorkstationAction(
  workstationId: string
): Promise<SeatingActionResult> {
  try {
    await requirePermission('seating:manage');
    const ws = await prisma.workstation.findUnique({
      where: { id: workstationId },
      include: { assignment: true },
    });
    if (!ws) return { error: 'Workstation not found.' };
    if (ws.assignment) return { error: 'Cannot delete a workstation with an active assignment. Unassign the teacher first.' };
    if (ws.status !== SeatStatus.AVAILABLE) {
      return { error: 'Only AVAILABLE workstations can be deleted.' };
    }
    await prisma.workstation.delete({ where: { id: workstationId } });
    revalidatePath('/dashboard/seating/manage');
    return { success: true };
  } catch (err: any) {
    console.error('deleteWorkstationAction error:', err);
    return { error: err.message || 'Failed to delete workstation.' };
  }
}

const AssignSchema = z.object({
  workstationId: z.string().min(1),
  teacherId: z.string().min(1),
  schedule: z.string().optional(),
});

export async function assignTeacherToSeatAction(
  data: z.infer<typeof AssignSchema>
): Promise<SeatingActionResult> {
  try {
    const actor = await requirePermission('seating:manage');
    const parsed = AssignSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid assignment data.' };
    }
    const { workstationId, teacherId, schedule } = parsed.data;

    const ws = await prisma.workstation.findUnique({
      where: { id: workstationId },
      include: { assignment: true },
    });
    if (!ws) return { error: 'Workstation not found.' };
    if (ws.assignment) return { error: 'This workstation is already occupied. Unassign the current teacher first.' };
    if (ws.status === SeatStatus.UNDER_REFORMAT || ws.status === SeatStatus.PENDING_REFORMAT) {
      return { error: 'Workstation is pending/under reformat. Mark it AVAILABLE before assigning.' };
    }

    const existingAssignment = await prisma.seatingAssignment.findFirst({ where: { teacherId, unassignedAt: null } });
    if (existingAssignment) {
      return { error: 'This teacher already has a seat assignment. Unassign them first.' };
    }

    await prisma.$transaction([
      prisma.seatingAssignment.create({
        data: {
          workstationId,
          teacherId,
          schedule: schedule?.trim() || null,
          assignedById: actor.id,
          assignedAt: new Date(),
        },
      }),
      prisma.workstation.update({
        where: { id: workstationId },
        data: { status: SeatStatus.OCCUPIED },
      }),
    ]);

    revalidatePath('/dashboard/seating');
    revalidatePath('/dashboard/seating/manage');
    return { success: true };
  } catch (err: any) {
    console.error('assignTeacherToSeatAction error:', err);
    return { error: err.message || 'Failed to assign teacher.' };
  }
}

export async function unassignTeacherAction(
  workstationId: string,
  reason: 'RESIGNED' | 'AWOL' | 'TRANSFER' | 'MANUAL'
): Promise<SeatingActionResult> {
  try {
    const actor = await requirePermission('seating:manage');
    const ws = await prisma.workstation.findUnique({
      where: { id: workstationId },
      include: { assignment: true },
    });
    if (!ws) return { error: 'Workstation not found.' };
    if (!ws.assignment) return { error: 'No active assignment on this workstation.' };

    const needsReformat = reason === 'RESIGNED' || reason === 'AWOL';
    const newStatus: SeatStatus = needsReformat ? SeatStatus.PENDING_REFORMAT : SeatStatus.AVAILABLE;

    await prisma.$transaction([
      prisma.seatingAssignment.update({
        where: { id: ws.assignment.id },
        data: { unassignedAt: new Date(), unassignedById: actor.id, unassignedReason: reason },
      }),
      prisma.workstation.update({
        where: { id: workstationId },
        data: { status: newStatus },
      }),
    ]);

    revalidatePath('/dashboard/seating');
    revalidatePath('/dashboard/seating/manage');
    return { success: true };
  } catch (err: any) {
    console.error('unassignTeacherAction error:', err);
    return { error: err.message || 'Failed to unassign teacher.' };
  }
}

export async function triggerResignationSeatingCleanup(
  teacherId: string,
  reason: 'RESIGNED' | 'AWOL' = 'RESIGNED'
): Promise<void> {
  try {
    const assignment = await prisma.seatingAssignment.findFirst({
      where: { teacherId, unassignedAt: null },
      include: { workstation: true },
    });
    if (!assignment) return;
    await prisma.$transaction([
      prisma.seatingAssignment.update({
        where: { id: assignment.id },
        data: { unassignedAt: new Date(), unassignedReason: reason },
      }),
      prisma.workstation.update({
        where: { id: assignment.workstationId },
        data: { status: SeatStatus.PENDING_REFORMAT },
      }),
    ]);
    revalidatePath('/dashboard/seating');
    revalidatePath('/dashboard/seating/manage');
  } catch (err) {
    console.error('triggerResignationSeatingCleanup error:', err);
  }
}

export type TeacherSeatInfo = {
  workstationNo: string;
  seatNo: string;
  branch: string;
  schedule: string | null;
  status: SeatStatus;
  assignedAt: string;
};

export async function getMySeatingAssignmentAction(): Promise<{
  data?: TeacherSeatInfo;
  error?: string;
}> {
  try {
    const user = await requireAuth();
    const teacher = await prisma.teacherProfile.findFirst({ where: { userId: user.id } });
    if (!teacher) return { error: 'No teacher profile found.' };
    const assignment = await prisma.seatingAssignment.findFirst({
      where: { teacherId: teacher.id, unassignedAt: null },
      include: { workstation: true },
    });
    if (!assignment) return {};
    return {
      data: {
        workstationNo: assignment.workstation.workstationNo,
        seatNo: assignment.workstation.seatNo,
        branch: assignment.workstation.branch,
        schedule: assignment.schedule,
        status: assignment.workstation.status,
        assignedAt: assignment.assignedAt.toISOString(),
      },
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch seat assignment.' };
  }
}

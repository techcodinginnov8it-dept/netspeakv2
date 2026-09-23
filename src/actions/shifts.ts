'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ShiftScheduleRecord = {
  id: string;
  name: string;
  startTime: string; // "HH:MM" in Manila (PHT) time
  endTime: string;   // "HH:MM" in Manila (PHT) time
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { teachers: number };
};

export type ShiftActionResult = {
  success?: boolean;
  error?: string;
  shift?: ShiftScheduleRecord;
};

// ─────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$|^00:00$/;

const ShiftSchema = z.object({
  name: z.string().min(3, 'Shift name must be at least 3 characters'),
  startTime: z.string().regex(TIME_REGEX, 'Start time must be HH:MM (e.g. 08:00)'),
  endTime: z.string().regex(TIME_REGEX, 'End time must be HH:MM (e.g. 17:00)'),
  description: z.string().optional(),
});

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

/**
 * Fetch all shift schedules with teacher count.
 * Used by both admin management page and teacher profile dropdowns.
 */
export async function getShiftSchedulesAction(): Promise<ShiftScheduleRecord[]> {
  const shifts = await prisma.shiftSchedule.findMany({
    orderBy: { startTime: 'asc' },
    include: {
      _count: { select: { teachers: true } },
    },
  });
  return shifts;
}

// ─────────────────────────────────────────────
// Mutations — require attendance:manage permission
// ─────────────────────────────────────────────

/**
 * Create a new shift template.
 */
export async function createShiftScheduleAction(formData: FormData): Promise<ShiftActionResult> {
  await requirePermission('attendance:manage');

  const raw = {
    name: formData.get('name'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    description: formData.get('description') || undefined,
  };

  const parsed = ShiftSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { error: firstError || 'Invalid shift data.' };
  }

  const { name, startTime, endTime, description } = parsed.data;

  // Check uniqueness
  const existing = await prisma.shiftSchedule.findUnique({ where: { name } });
  if (existing) {
    return { error: `A shift named "${name}" already exists.` };
  }

  const shift = await prisma.shiftSchedule.create({
    data: { name, startTime, endTime, description: description ?? null },
    include: { _count: { select: { teachers: true } } },
  });

  revalidatePath('/dashboard/shifts');
  return { success: true, shift };
}

/**
 * Update an existing shift template.
 */
export async function updateShiftScheduleAction(
  id: string,
  formData: FormData
): Promise<ShiftActionResult> {
  await requirePermission('attendance:manage');

  const raw = {
    name: formData.get('name'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    description: formData.get('description') || undefined,
  };

  const parsed = ShiftSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { error: firstError || 'Invalid shift data.' };
  }

  const { name, startTime, endTime, description } = parsed.data;

  // Check uniqueness among OTHER records
  const conflict = await prisma.shiftSchedule.findFirst({
    where: { name, NOT: { id } },
  });
  if (conflict) {
    return { error: `A shift named "${name}" already exists.` };
  }

  const shift = await prisma.shiftSchedule.update({
    where: { id },
    data: { name, startTime, endTime, description: description ?? null },
    include: { _count: { select: { teachers: true } } },
  });

  revalidatePath('/dashboard/shifts');
  revalidatePath('/dashboard/teachers');
  return { success: true, shift };
}

/**
 * Delete a shift template. Blocked if teachers are assigned.
 */
export async function deleteShiftScheduleAction(id: string): Promise<ShiftActionResult> {
  await requirePermission('attendance:manage');

  const shift = await prisma.shiftSchedule.findUnique({
    where: { id },
    include: { _count: { select: { teachers: true } } },
  });

  if (!shift) return { error: 'Shift not found.' };
  if (shift._count.teachers > 0) {
    return {
      error: `Cannot delete: ${shift._count.teachers} teacher(s) are assigned to this shift. Re-assign them first.`,
    };
  }

  await prisma.shiftSchedule.delete({ where: { id } });
  revalidatePath('/dashboard/shifts');
  return { success: true };
}

/**
 * Assign (or clear) a shift schedule to a teacher profile.
 * Called from TeacherProfileDetail "Operational Setup" section.
 */
export async function assignTeacherShiftAction(
  teacherProfileId: string,
  shiftScheduleId: string | null
): Promise<ShiftActionResult> {
  await requirePermission('teachers:update');

  await prisma.teacherProfile.update({
    where: { id: teacherProfileId },
    data: { shiftScheduleId: shiftScheduleId || null },
  });

  revalidatePath('/dashboard/teachers');
  revalidatePath(`/dashboard/teachers/${teacherProfileId}`);
  return { success: true };
}

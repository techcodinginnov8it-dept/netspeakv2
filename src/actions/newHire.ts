'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireAuth } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { RequirementStatus, OnboardingStatus } from '@prisma/client';

import { STANDARD_REQUIREMENTS } from '@/lib/operations/onboardingConstants';

export type NewHireActionResult = { success?: boolean; error?: string; recordId?: string };

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeCompletion(statuses: RequirementStatus[]): number {
  if (statuses.length === 0) return 0;
  const done = statuses.filter(s => s === 'COMPLETED' || s === 'VERIFIED').length;
  return Math.round((done / statuses.length) * 100);
}

// ── Create new hire record + seed 18 requirement rows ────────────────────────

const CreateSchema = z.object({
  teacherId: z.string().optional(),
  teacherName: z.string().optional(),
  teacherEmail: z.string().optional(),
  startDate: z.string().min(1),
  branch: z.string().min(2),
  project: z.string().min(1),
});

export async function createNewHireRecordAction(
  data: z.infer<typeof CreateSchema>
): Promise<NewHireActionResult> {
  try {
    await requirePermission('newhire:manage');
    const parsed = CreateSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid data.' };

    const startDt = new Date(parsed.data.startDate);
    if (isNaN(startDt.getTime())) return { error: 'Invalid start date.' };

    let targetTeacherId = parsed.data.teacherId;

    // If teacherId is not supplied or is "NEW", create or resolve TeacherProfile
    if (!targetTeacherId || targetTeacherId === 'NEW') {
      const name = parsed.data.teacherName?.trim();
      if (!name) {
        return { error: 'Please choose an existing teacher or provide a teacher name.' };
      }

      const email = parsed.data.teacherEmail?.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@netspeak.ph`;
      
      // Check if profile exists with this name or email
      let teacher = await prisma.teacherProfile.findFirst({
        where: {
          OR: [
            { realFullName: { equals: name, mode: 'insensitive' } },
            { contactEmail: { equals: email, mode: 'insensitive' } },
          ],
        },
      });

      if (!teacher) {
        teacher = await prisma.teacherProfile.create({
          data: {
            realFullName: name,
            displayName: name,
            contactEmail: email,
            birthday: new Date('1998-01-01'),
            cellphone: `+639${Math.floor(100000000 + Math.random() * 900000000)}`,
            emergencyContactName: 'N/A',
            emergencyContactPhone: '+639000000000',
            address: 'Netspeak Operations Facility',
            schoolAttended: 'N/A',
            course: 'Education',
            major: 'General',
            branch: parsed.data.branch.trim(),
            projectType: (['FTEX', 'FT', 'TTP'].includes(parsed.data.project.trim().toUpperCase())
              ? parsed.data.project.trim().toUpperCase()
              : 'FT') as any,
            department: 'DOMESTIC',
            registrationStatus: 'APPROVED',
          },
        });
      }

      targetTeacherId = teacher.id;
    }

    const existing = await prisma.newHireRecord.findUnique({ where: { teacherId: targetTeacherId } });
    if (existing) return { error: 'This teacher already has an onboarding record.' };

    const record = await prisma.newHireRecord.create({
      data: {
        teacherId: targetTeacherId,
        startDate: startDt,
        branch: parsed.data.branch.trim(),
        project: parsed.data.project.trim(),
        status: OnboardingStatus.IN_PROGRESS,
        completionPct: 0,
        requirements: {
          create: STANDARD_REQUIREMENTS.map(r => ({
            requirementKey: r.key,
            label: r.label,
            status: RequirementStatus.PENDING,
          })),
        },
      },
    });

    revalidatePath('/dashboard/onboarding');
    revalidatePath('/dashboard/onboarding/manage');
    revalidatePath('/dashboard/management');
    return { success: true, recordId: record.id };
  } catch (err: any) {
    console.error('createNewHireRecordAction error:', err);
    return { error: err.message || 'Failed to create onboarding record.' };
  }
}

// ── Update a single requirement status ──────────────────────────────────────

export async function updateRequirementStatusAction(
  requirementId: string,
  status: RequirementStatus,
  notes?: string
): Promise<NewHireActionResult> {
  try {
    const actor = await requirePermission('newhire:manage');

    await prisma.newHireRequirement.update({
      where: { id: requirementId },
      data: {
        status,
        completedAt: (status === 'COMPLETED' || status === 'VERIFIED') ? new Date() : null,
        verifiedById: status === 'VERIFIED' ? actor.id : undefined,
        verifiedAt: status === 'VERIFIED' ? new Date() : undefined,
        notes: notes?.trim() || undefined,
      },
    });

    // Recompute completion %
    const req = await prisma.newHireRequirement.findUnique({ where: { id: requirementId } });
    if (req) {
      const allReqs = await prisma.newHireRequirement.findMany({ where: { recordId: req.recordId } });
      const pct = computeCompletion(allReqs.map(r => r.status));
      const allVerified = allReqs.every(r => r.status === 'VERIFIED' || r.status === 'COMPLETED');
      await prisma.newHireRecord.update({
        where: { id: req.recordId },
        data: {
          completionPct: pct,
          status: allVerified ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS,
        },
      });
    }

    revalidatePath('/dashboard/onboarding');
    revalidatePath('/dashboard/onboarding/manage');
    revalidatePath('/dashboard/management');
    return { success: true };
  } catch (err: any) {
    console.error('updateRequirementStatusAction error:', err);
    return { error: err.message || 'Failed to update requirement.' };
  }
}

// ── Grant slot eligibility (Admin verification step per spec) ─────────────────

export async function verifyAndGrantSlotEligibilityAction(
  recordId: string,
  notes?: string
): Promise<NewHireActionResult> {
  try {
    const actor = await requirePermission('newhire:manage');

    const record = await prisma.newHireRecord.findUnique({ where: { id: recordId } });
    if (!record) return { error: 'Onboarding record not found.' };

    // Enforce 3-day minimum window per spec
    const startDate = record.startDate;
    const threeDaysLater = new Date(startDate);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    if (new Date() < threeDaysLater) {
      return { error: `Cannot grant eligibility before ${threeDaysLater.toLocaleDateString('en-PH')} (3-day minimum requirement window).` };
    }

    await prisma.newHireRecord.update({
      where: { id: recordId },
      data: {
        slotsEligible: true,
        slotsEligibleAt: new Date(),
        verifiedById: actor.id,
        verifiedAt: new Date(),
        status: OnboardingStatus.SLOTS_ELIGIBLE,
        notes: notes?.trim() || undefined,
      },
    });

    revalidatePath('/dashboard/onboarding');
    revalidatePath('/dashboard/onboarding/manage');
    revalidatePath('/dashboard/management');
    return { success: true };
  } catch (err: any) {
    console.error('verifyAndGrantSlotEligibilityAction error:', err);
    return { error: err.message || 'Failed to grant slot eligibility.' };
  }
}

// ── Summary counts for dashboard ─────────────────────────────────────────────

export type NewHireSummary = {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  slotsEligible: number;
};

export async function getNewHireSummaryAction(): Promise<NewHireSummary> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [total, inProgress, completed, overdue, slotsEligible] = await Promise.all([
    prisma.newHireRecord.count(),
    prisma.newHireRecord.count({
      where: {
        status: 'IN_PROGRESS',
        startDate: { gt: threeDaysAgo },
        slotsEligible: false,
      },
    }),
    prisma.newHireRecord.count({ where: { status: 'COMPLETED' } }),
    prisma.newHireRecord.count({
      where: {
        OR: [
          { status: 'OVERDUE' },
          {
            status: 'IN_PROGRESS',
            startDate: { lte: threeDaysAgo },
            slotsEligible: false,
          },
        ],
      },
    }),
    prisma.newHireRecord.count({
      where: {
        OR: [
          { status: 'SLOTS_ELIGIBLE' },
          { slotsEligible: true },
        ],
      },
    }),
  ]);

  return { total, inProgress, completed, overdue, slotsEligible };
}

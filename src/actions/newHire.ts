'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireAuth } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { RequirementStatus, OnboardingStatus } from '@prisma/client';

// Standard 18 requirements per §34
const STANDARD_REQUIREMENTS = [
  { key: 'BANK_ACCOUNT',          label: 'Bank Account' },
  { key: 'CONTRACT_SIGNING',      label: 'Contract Signing' },
  { key: 'VALID_ID',              label: 'Valid ID' },
  { key: 'PROOF_OF_EDUCATION',    label: 'Proof of Education' },
  { key: 'PROFESSIONAL_PICTURE',  label: 'Professional Picture' },
  { key: 'INTRO_RECORDING',       label: 'Intro Recording' },
  { key: 'NBI_CLEARANCE',         label: 'NBI Clearance' },
  { key: 'SELF_VIDEO_INTRO',      label: 'Self-Video Introduction' },
  { key: 'SK12_TAGGING',          label: 'SK12 Tagging' },
  { key: 'TPCAP_TAGGING',         label: 'TPCAP Tagging' },
  { key: 'SPECIAL_TAGGINGS',      label: 'Additional Special Taggings' },
  { key: 'GLOBAL_TEACHER_TAGGING',label: 'Global Teacher Tagging' },
  { key: 'FLOWERS',               label: 'Flowers' },
  { key: 'SIGNED_DOUBLE_SA',      label: 'Signed Double SA' },
  { key: 'TTP_ORIENTATION',       label: 'TTP Orientation' },
  { key: 'TESOL',                 label: 'TESOL' },
  { key: 'ZTP_TRAINING',          label: 'ZTP Training' },
  { key: 'LEARNING_HUB',          label: 'Learning Hub' },
] as const;

export type NewHireActionResult = { success?: boolean; error?: string; recordId?: string };

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeCompletion(statuses: RequirementStatus[]): number {
  if (statuses.length === 0) return 0;
  const done = statuses.filter(s => s === 'COMPLETED' || s === 'VERIFIED').length;
  return Math.round((done / statuses.length) * 100);
}

// ── Create new hire record + seed 18 requirement rows ────────────────────────

const CreateSchema = z.object({
  teacherId: z.string().min(1),
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

    const existing = await prisma.newHireRecord.findUnique({ where: { teacherId: parsed.data.teacherId } });
    if (existing) return { error: 'This teacher already has an onboarding record.' };

    const startDt = new Date(parsed.data.startDate);
    if (isNaN(startDt.getTime())) return { error: 'Invalid start date.' };

    const record = await prisma.newHireRecord.create({
      data: {
        teacherId: parsed.data.teacherId,
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
    return { success: true };
  } catch (err: any) {
    console.error('updateRequirementStatusAction error:', err);
    return { error: err.message || 'Failed to update requirement.' };
  }
}

// ── Grant slot eligibility (Admin verification step per §34) ─────────────────

export async function verifyAndGrantSlotEligibilityAction(
  recordId: string,
  notes?: string
): Promise<NewHireActionResult> {
  try {
    const actor = await requirePermission('newhire:manage');

    const record = await prisma.newHireRecord.findUnique({ where: { id: recordId } });
    if (!record) return { error: 'Onboarding record not found.' };

    // Enforce 3-day minimum window per §34
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
  const [total, inProgress, completed, overdue, slotsEligible] = await Promise.all([
    prisma.newHireRecord.count(),
    prisma.newHireRecord.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.newHireRecord.count({ where: { status: 'COMPLETED' } }),
    prisma.newHireRecord.count({ where: { status: 'OVERDUE' } }),
    prisma.newHireRecord.count({ where: { status: 'SLOTS_ELIGIBLE' } }),
  ]);
  return { total, inProgress, completed, overdue, slotsEligible };
}

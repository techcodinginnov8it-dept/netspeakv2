'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requireRole, ROLES } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit/auditLogger';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address: string | null;
  contactNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const BranchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  code: z.string().min(2, 'Branch code must be at least 2 characters').max(10),
  address: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

/**
 * Get all branches
 */
export async function getBranchesAction(): Promise<{
  success: boolean;
  branches?: BranchRecord[];
  error?: string;
}> {
  try {
    await requireAuth();

    const records = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });

    const branches: BranchRecord[] = records.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      contactNumber: b.contactNumber,
      isActive: b.isActive,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    return { success: true, branches };
  } catch (err: any) {
    console.error('getBranchesAction error:', err);
    return { success: false, error: err.message || 'Failed to fetch branches' };
  }
}

/**
 * Create a new branch (System Administrator & Management only)
 */
export async function createBranchAction(formData: {
  name: string;
  code: string;
  address?: string | null;
  contactNumber?: string | null;
  isActive?: boolean;
}): Promise<{ success: boolean; branch?: BranchRecord; error?: string }> {
  try {
    const user = await requireRole([ROLES.SYSTEM_ADMINISTRATOR, ROLES.MANAGEMENT]);

    const validated = BranchSchema.parse(formData);

    const existingName = await prisma.branch.findUnique({
      where: { name: validated.name },
    });
    if (existingName) {
      return { success: false, error: `Branch with name "${validated.name}" already exists.` };
    }

    const existingCode = await prisma.branch.findUnique({
      where: { code: validated.code.toUpperCase() },
    });
    if (existingCode) {
      return { success: false, error: `Branch code "${validated.code.toUpperCase()}" is already in use.` };
    }

    const created = await prisma.branch.create({
      data: {
        name: validated.name,
        code: validated.code.toUpperCase(),
        address: validated.address || null,
        contactNumber: validated.contactNumber || null,
        isActive: validated.isActive ?? true,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'BRANCH_CREATE',
      module: 'branches',
      entityType: 'Branch',
      entityId: created.id,
      details: `Created branch ${created.name} (${created.code})`,
      newValue: {
        name: created.name,
        code: created.code,
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');

    return {
      success: true,
      branch: {
        id: created.id,
        name: created.name,
        code: created.code,
        address: created.address,
        contactNumber: created.contactNumber,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error('createBranchAction error:', err);
    return { success: false, error: err.message || 'Failed to create branch' };
  }
}

/**
 * Update an existing branch
 */
export async function updateBranchAction(params: {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  contactNumber?: string | null;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireRole([ROLES.SYSTEM_ADMINISTRATOR, ROLES.MANAGEMENT]);

    const existing = await prisma.branch.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return { success: false, error: 'Branch not found' };
    }

    const updated = await prisma.branch.update({
      where: { id: params.id },
      data: {
        name: params.name,
        code: params.code.toUpperCase(),
        address: params.address || null,
        contactNumber: params.contactNumber || null,
        isActive: params.isActive,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: 'BRANCH_UPDATE',
      module: 'branches',
      entityType: 'Branch',
      entityId: updated.id,
      details: `Updated branch ${updated.name} (${updated.code}) - isActive: ${updated.isActive}`,
      oldValue: { name: existing.name, code: existing.code, isActive: existing.isActive },
      newValue: { name: updated.name, code: updated.code, isActive: updated.isActive },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('updateBranchAction error:', err);
    return { success: false, error: err.message || 'Failed to update branch' };
  }
}

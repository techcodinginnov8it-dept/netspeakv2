'use server';

import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit/auditLogger';
import { revalidatePath } from 'next/cache';

export interface SystemSettingItem {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updatedAt: string;
}

/**
 * Fetches all system configuration settings (§4, §27)
 */
export async function getSystemSettingsAction(): Promise<{ success: boolean; settings?: SystemSettingItem[]; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.SYSTEM_SETTINGS);

    const records = await prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    const settings: SystemSettingItem[] = records.map((r) => ({
      id: r.id,
      key: r.key,
      value: r.value,
      category: r.category,
      description: r.description,
      updatedAt: r.updatedAt.toISOString(),
    }));

    return { success: true, settings };
  } catch (error: any) {
    console.error('getSystemSettingsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch settings' };
  }
}

/**
 * Updates a specific system configuration setting (§4, §27, §42)
 */
export async function updateSystemSettingAction(params: {
  key: string;
  value: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission(PERMISSIONS.SYSTEM_SETTINGS);

    const existing = await prisma.systemSetting.findUnique({
      where: { key: params.key },
    });

    if (!existing) {
      return { success: false, error: `Setting with key "${params.key}" not found.` };
    }

    const updated = await prisma.systemSetting.update({
      where: { key: params.key },
      data: {
        value: params.value,
        updatedById: user.id,
      },
    });

    // Record audit log entry
    await recordAuditLog({
      userId: user.id,
      action: 'SETTINGS_UPDATE',
      module: 'system',
      entityType: 'SystemSetting',
      entityId: updated.id,
      details: `Updated setting ${params.key} to "${params.value}"`,
      oldValue: { value: existing.value },
      newValue: { value: params.value },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/reports');

    return { success: true };
  } catch (error: any) {
    console.error('updateSystemSettingAction error:', error);
    return { success: false, error: error.message || 'Failed to update setting' };
  }
}

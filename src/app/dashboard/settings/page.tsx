import React from 'react';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { getSystemSettingsAction } from '@/actions/settings';
import { getBranchesAction } from '@/actions/branches';
import SystemSettingsView from '@/components/settings/SystemSettingsView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requirePermission(PERMISSIONS.SYSTEM_SETTINGS);

  const [settingsRes, branchesRes] = await Promise.all([
    getSystemSettingsAction(),
    getBranchesAction(),
  ]);

  const settings = settingsRes.success && settingsRes.settings ? settingsRes.settings : [];
  const branches = branchesRes.success && branchesRes.branches ? branchesRes.branches : [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <SystemSettingsView initialSettings={settings} initialBranches={branches} />
    </div>
  );
}

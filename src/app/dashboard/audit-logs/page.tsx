import React from 'react';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { getAuditLogsAction } from '@/actions/audit';
import AuditLogViewer from '@/components/audit/AuditLogViewer';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
  await requirePermission(PERMISSIONS.AUDIT_VIEW);

  const res = await getAuditLogsAction({ limit: 100 });
  const logs = res.success && res.logs ? res.logs : [];
  const totalCount = res.totalCount || 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <AuditLogViewer initialLogs={logs} totalCount={totalCount} />
    </div>
  );
}

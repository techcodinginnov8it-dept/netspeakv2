'use server';

import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFilterParams {
  module?: string;
  action?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetches paginated audit logs (§42)
 */
export async function getAuditLogsAction(params?: AuditLogFilterParams): Promise<{
  success: boolean;
  logs?: AuditLogItem[];
  totalCount?: number;
  error?: string;
}> {
  try {
    await requirePermission(PERMISSIONS.AUDIT_VIEW);

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    const where: any = {};
    if (params?.module && params.module !== 'ALL') {
      where.module = params.module;
    }
    if (params?.action && params.action !== 'ALL') {
      where.action = params.action;
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { details: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [records, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const logs: AuditLogItem[] = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user?.fullName || 'System / Automated',
      userEmail: r.user?.email || null,
      action: r.action,
      module: r.module,
      entityType: r.entityType,
      entityId: r.entityId,
      details: r.details,
      oldValue: r.oldValue,
      newValue: r.newValue,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, logs, totalCount };
  } catch (error: any) {
    console.error('getAuditLogsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch audit logs' };
  }
}

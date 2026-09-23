import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export interface AuditEventParams {
  userId?: string | null;
  action: string;      // e.g. 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'RECONCILE', 'SETTINGS_UPDATE'
  module: string;      // e.g. 'attendance', 'requests', 'teachers', 'operations', 'system', 'reports', 'settings'
  entityType: string;  // e.g. 'TeacherAttendance', 'DailyOutput', 'SwitchRestDayRequest', 'SystemSetting'
  entityId?: string | null;
  details?: string | null;
  oldValue?: any;
  newValue?: any;
}

/**
 * Records an audit trail log in the database (§42).
 * Fails gracefully without breaking callers if database insert fails.
 */
export async function recordAuditLog(params: AuditEventParams): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    try {
      const headerList = await headers();
      ipAddress = headerList.get('x-forwarded-for') || headerList.get('x-real-ip') || null;
      userAgent = headerList.get('user-agent') || null;
    } catch {
      // Ignored if called in non-HTTP background/script context
    }

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details || null,
        oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('AuditLogger error: Failed to record audit log:', error);
  }
}

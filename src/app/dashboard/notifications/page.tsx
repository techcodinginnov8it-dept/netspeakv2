import React from 'react';
import { prisma } from '@/lib/db';
import { requireAuth, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default async function NotificationsPage() {
  const user = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const canBroadcast = hasPermission(user, PERMISSIONS.NOTIFICATIONS_BROADCAST);
  const canRunJobs = hasPermission(user, PERMISSIONS.SYSTEM_JOBS);

  const serialized = notifications.map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    priority: n.priority,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          Notification Center &amp; Alerts
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Review personal operational alerts, broadcast notices, and automated reminder schedules.
        </p>
      </div>

      <NotificationCenter
        notifications={serialized}
        canBroadcast={canBroadcast}
        canRunJobs={canRunJobs}
      />
    </div>
  );
}

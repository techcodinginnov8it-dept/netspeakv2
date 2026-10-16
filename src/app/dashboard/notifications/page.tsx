import React from 'react';
import { prisma } from '@/lib/db';
import { requireAuth, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Alert Center — Netspeak Portal',
};

export default async function NotificationsPage() {
  const user = await requireAuth();

  const canRunJobs = hasPermission(user, PERMISSIONS.SYSTEM_JOBS);
  const canManageAnnouncements =
    hasPermission(user, PERMISSIONS.ANNOUNCEMENTS_MANAGE) ||
    hasPermission(user, PERMISSIONS.ANNOUNCEMENTS_CREATE);
  const canBroadcast = hasPermission(user, PERMISSIONS.NOTIFICATIONS_BROADCAST);

  const [notifications, announcements] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.announcement.findMany({
      where: canManageAnnouncements ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const serializedNotifications = notifications.map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    priority: n.priority,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));

  const serializedAnnouncements = announcements.map((a: any) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          Alert Center
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Personal notifications, system alerts, and center broadcasts.
        </p>
      </div>

      <NotificationCenter
        userId={user.id}
        notifications={serializedNotifications}
        announcements={serializedAnnouncements}
        canRunJobs={canRunJobs}
        canManageAnnouncements={canManageAnnouncements}
        canBroadcast={canBroadcast}
      />
    </div>
  );
}

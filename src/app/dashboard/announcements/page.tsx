import { requireAuth, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import AnnouncementManager from '@/components/announcements/AnnouncementManager';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Announcements — Netspeak Portal',
};

export default async function AnnouncementsPage() {
  const user = await requireAuth();

  const canManage = hasPermission(user, PERMISSIONS.ANNOUNCEMENTS_MANAGE);
  const canCreate = hasPermission(user, PERMISSIONS.ANNOUNCEMENTS_CREATE);

  if (!canManage && !canCreate) {
    redirect('/dashboard');
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <AnnouncementManager
        initialAnnouncements={announcements.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        }))}
        canManage={canManage}
      />
    </div>
  );
}

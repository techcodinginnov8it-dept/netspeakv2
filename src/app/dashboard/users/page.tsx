import React from 'react';
import { requirePermission, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import UserManagementSection from '@/components/users/UserManagementSection';

export const metadata = {
  title: 'User & Access Management — Netspeak Portal',
};

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await requirePermission(PERMISSIONS.USERS_READ);

  const canCreate = hasPermission(user, PERMISSIONS.USERS_CREATE);
  const canToggle = hasPermission(user, PERMISSIONS.USERS_UPDATE);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', animation: 'fadeInUp 0.35s ease' }}>
      <UserManagementSection
        users={users}
        roles={roles}
        canCreate={canCreate}
        canToggle={canToggle}
        currentUserId={user.id}
      />
    </div>
  );
}

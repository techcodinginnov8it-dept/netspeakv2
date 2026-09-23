'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { NotificationType, NotificationPriority } from '@prisma/client';

/**
 * Fetch current user notifications with unread counter
 */
export async function getUserNotificationsAction() {
  const user = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return {
    success: true,
    notifications: JSON.parse(JSON.stringify(notifications)),
    unreadCount,
  };
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsReadAction(notificationId: string) {
  const user = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/notifications');
  return { success: true };
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsAsReadAction() {
  const user = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/notifications');
  return { success: true };
}

/**
 * Centralized Notification Dispatcher (§36)
 * Emits in-app alerts to a specific user, role, or broadcast group
 */
const dispatchNotificationSchema = z.object({
  targetUserId: z.string().optional(),
  targetRole: z.string().optional(), // e.g. "TEACHER", "ADMIN", "IT", "MANAGEMENT", "ALL"
  title: z.string().min(3),
  message: z.string().min(3),
  type: z.nativeEnum(NotificationType).default(NotificationType.SYSTEM_NOTICE),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  link: z.string().optional(),
  metadata: z.string().optional(),
});

export async function dispatchNotificationAction(data: z.infer<typeof dispatchNotificationSchema>) {
  await requirePermission(PERMISSIONS.NOTIFICATIONS_BROADCAST);
  const parsed = dispatchNotificationSchema.parse(data);

  const recipientIds: string[] = [];

  if (parsed.targetUserId) {
    recipientIds.push(parsed.targetUserId);
  } else if (parsed.targetRole && parsed.targetRole !== 'ALL') {
    const usersInRole = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: { name: parsed.targetRole },
          },
        },
      },
      select: { id: true },
    });
    recipientIds.push(...usersInRole.map((u: { id: string }) => u.id));
  } else {
    // Broadcast to ALL active users
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    recipientIds.push(...allUsers.map((u: { id: string }) => u.id));
  }

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(recipientIds));

  if (uniqueIds.length === 0) {
    return { success: false, error: 'No active recipients found for target.' };
  }

  await prisma.notification.createMany({
    data: uniqueIds.map((uId) => ({
      userId: uId,
      title: parsed.title,
      message: parsed.message,
      type: parsed.type,
      priority: parsed.priority,
      link: parsed.link || null,
      metadata: parsed.metadata || null,
    })),
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/notifications');
  return { success: true, count: uniqueIds.length };
}

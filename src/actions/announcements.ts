'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AnnouncementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  content: z.string().min(5, 'Content must be at least 5 characters'),
  isActive: z.boolean().default(true),
});

export type AnnouncementResult = {
  success?: boolean;
  error?: string;
  announcementId?: string;
};

/**
 * Create a new announcement / policy notice
 */
export async function createAnnouncementAction(
  data: z.infer<typeof AnnouncementSchema>
): Promise<AnnouncementResult> {
  try {
    await requirePermission('announcements:create');

    const parsed = AnnouncementSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid announcement data.' };
    }

    const created = await prisma.announcement.create({
      data: {
        title: parsed.data.title.trim(),
        content: parsed.data.content.trim(),
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/announcements');
    return { success: true, announcementId: created.id };
  } catch (err: any) {
    console.error('Create announcement error:', err);
    return { error: err.message || 'Failed to create announcement.' };
  }
}

/**
 * Update an existing announcement
 */
export async function updateAnnouncementAction(
  id: string,
  data: z.infer<typeof AnnouncementSchema>
): Promise<AnnouncementResult> {
  try {
    await requirePermission('announcements:manage');

    const parsed = AnnouncementSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid announcement data.' };
    }

    await prisma.announcement.update({
      where: { id },
      data: {
        title: parsed.data.title.trim(),
        content: parsed.data.content.trim(),
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/announcements');
    return { success: true, announcementId: id };
  } catch (err: any) {
    console.error('Update announcement error:', err);
    return { error: err.message || 'Failed to update announcement.' };
  }
}

/**
 * Toggle announcement active status
 */
export async function toggleAnnouncementStatusAction(
  id: string,
  isActive: boolean
): Promise<AnnouncementResult> {
  try {
    await requirePermission('announcements:manage');

    await prisma.announcement.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/announcements');
    return { success: true, announcementId: id };
  } catch (err: any) {
    console.error('Toggle announcement status error:', err);
    return { error: err.message || 'Failed to toggle announcement status.' };
  }
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncementAction(
  id: string
): Promise<AnnouncementResult> {
  try {
    await requirePermission('announcements:manage');

    await prisma.announcement.delete({
      where: { id },
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/announcements');
    return { success: true, announcementId: id };
  } catch (err: any) {
    console.error('Delete announcement error:', err);
    return { error: err.message || 'Failed to delete announcement.' };
  }
}

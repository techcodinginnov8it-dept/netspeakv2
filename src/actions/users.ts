'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/password';
import { revalidatePath } from 'next/cache';

const CreateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, and hyphens'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleName: z.string().min(1, 'Role is required'),
});

export type UserActionState = {
  error?: string;
  success?: string;
};

/**
 * Server Action: Create a new user with assigned role (Requires users:create permission)
 * For ADMIN and IT roles, a StaffProfile is also created with the selected branch so
 * resolveBranchFilter can correctly scope their data access.
 */
export async function createUserAction(
  prevState: UserActionState | null,
  formData: FormData
): Promise<UserActionState> {
  try {
    await requirePermission(PERMISSIONS.USERS_CREATE);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' };
  }

  const rawData = {
    fullName: formData.get('fullName'),
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    roleName: formData.get('roleName'),
  };

  const parsed = CreateUserSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid form data' };
  }

  const { fullName, username, email, password, roleName } = parsed.data;

  // Branch is required for ADMIN and IT roles — it drives branch-scoped data access
  const branchValue = (formData.get('branch') as string | null)?.trim() || null;
  const isStaffRole = roleName === 'ADMIN' || roleName === 'IT';
  if (isStaffRole && !branchValue) {
    return { error: 'Branch assignment is required for ADMIN and IT accounts.' };
  }

  // Check unique email and username
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { username },
      ],
    },
  });

  if (existingUser) {
    return { error: 'A user with that email or username already exists' };
  }

  // Find target role
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    return { error: `Role '${roleName}' does not exist` };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      username,
      email: email.toLowerCase(),
      passwordHash,
      isActive: true,
      userRoles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });

  // For ADMIN and IT roles, create a StaffProfile with the assigned branch.
  // This is critical — without it, resolveBranchFilter cannot scope their queries.
  if (isStaffRole && branchValue) {
    await prisma.staffProfile.create({
      data: {
        userId: newUser.id,
        roleType: roleName === 'IT' ? 'IT' : 'ADMIN',
        branch: branchValue,
        department: roleName === 'IT' ? 'Information Technology' : 'Operations & Center Admin',
      },
    });
  }

  revalidatePath('/dashboard');
  return { success: `User '${username}' created successfully` };
}

/**
 * Server Action: Toggle user activation status (Requires users:update permission)
 */
export async function toggleUserStatusAction(userId: string): Promise<UserActionState> {
  try {
    await requirePermission(PERMISSIONS.USERS_UPDATE);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { error: 'User not found' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  // If deactivated, invalidate all active sessions for that user
  if (user.isActive) {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  revalidatePath('/dashboard');
  return { success: `User '${user.username}' status updated` };
}

/**
 * Server Action: Update or create a StaffProfile branch for an ADMIN/IT user.
 * Used to fix existing accounts that have wrong/missing branch assignments.
 */
export async function updateUserBranchAction(userId: string, branch: string): Promise<UserActionState> {
  try {
    await requirePermission(PERMISSIONS.USERS_UPDATE);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unauthorized' };
  }

  if (!branch || branch.trim() === '') {
    return { error: 'A valid branch name is required.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) {
    return { error: 'User not found' };
  }

  const roleNames = user.userRoles.map((ur) => ur.role.name);
  const isStaffRole = roleNames.includes('ADMIN') || roleNames.includes('IT');
  if (!isStaffRole) {
    return { error: 'Branch assignment is only applicable to ADMIN and IT roles.' };
  }

  const roleType = roleNames.includes('IT') ? 'IT' : 'ADMIN';

  await prisma.staffProfile.upsert({
    where: { userId },
    update: { branch: branch.trim() },
    create: {
      userId,
      roleType,
      branch: branch.trim(),
      department: roleType === 'IT' ? 'Information Technology' : 'Operations & Center Admin',
    },
  });

  // Invalidate existing sessions so the user gets fresh branch data on next login
  await prisma.session.deleteMany({ where: { userId } });

  revalidatePath('/dashboard');
  return { success: `Branch updated to '${branch}'. The user must log in again.` };
}

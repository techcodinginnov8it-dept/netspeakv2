import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { generateSessionToken } from './password';
import { Prisma } from '@prisma/client';

/**
 * Retry a Prisma operation once on P1001 (can't reach database).
 * Supabase PgBouncer drops idle connections; the first call after a gap
 * will fail with P1001, but a single retry is almost always successful.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P1001'
    ) {
      // Wait briefly then retry
      await new Promise((r) => setTimeout(r, 500));
      return await fn();
    }
    throw err;
  }
}

export const SESSION_COOKIE_NAME = 'netspeak_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

import { AuthenticatedUser } from './types';
export type { AuthenticatedUser };

/**
 * Create a new database session and set HTTP-only cookie
 */
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await withRetry(() =>
    prisma.session.create({
      data: {
        token,
        userId,
        expiresAt,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    })
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

/**
 * Invalidate current session from database and clear cookie
 */
export async function invalidateSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await withRetry(() => prisma.session.deleteMany({ where: { token } }));
    } catch {
      // Ignore if session record already deleted
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

/**
 * Retrieve the currently authenticated user from the active session
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await withRetry(() =>
    prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            staffProfile: {
              select: { branch: true },
            },
            teacherProfile: {
              select: { branch: true },
            },
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  );

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    try {
      await prisma.session.delete({ where: { id: session.id } });
    } catch {
      // Ignore cleanup error
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const { user } = session;

  // Check if user is active
  if (!user.isActive) {
    return null;
  }

  const roles: string[] = [];
  const permissionsSet = new Set<string>();

  for (const ur of user.userRoles) {
    roles.push(ur.role.name);
    for (const rp of ur.role.rolePermissions) {
      permissionsSet.add(rp.permission.name);
    }
  }

  const userBranch = user.staffProfile?.branch || user.teacherProfile?.branch || null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    isActive: user.isActive,
    roles,
    permissions: Array.from(permissionsSet),
    branch: userBranch,
  };
}

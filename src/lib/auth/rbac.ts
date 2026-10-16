import { AuthenticatedUser, getCurrentUser } from './session';
import { redirect } from 'next/navigation';
import { ROLES, PERMISSIONS, type SystemRole } from './types';

export { ROLES, PERMISSIONS, type SystemRole };

/**
 * Check if user possesses a specific permission
 */
export function hasPermission(user: AuthenticatedUser | null, permission: string): boolean {
  if (!user || !user.isActive) return false;
  // System Administrator has universal access
  if (user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR)) return true;
  return user.permissions.includes(permission);
}

/**
 * Check if user possesses a specific role
 */
export function hasRole(user: AuthenticatedUser | null, role: string): boolean {
  if (!user || !user.isActive) return false;
  if (user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR)) return true;
  return user.roles.includes(role);
}

/**
 * Server-side guard: Ensures the user is authenticated, otherwise redirects to /login
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Server-side guard: Ensures user possesses a specific permission.
 * Redirects to /dashboard instead of throwing, to avoid React error #441
 * (unhandled Server Component exceptions in production).
 */
export async function requirePermission(permission: string): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) {
    redirect('/dashboard');
  }
  return user;
}

/**
 * Server-side guard: Ensures user possesses at least one of the specified roles.
 * Redirects to /dashboard instead of throwing, to avoid React error #441
 * (unhandled Server Component exceptions in production).
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  const hasAllowedRole = allowedRoles.some((r) => hasRole(user, r));
  if (!hasAllowedRole) {
    redirect('/dashboard');
  }
  return user;
}

/**
 * Safe permission check for use inside Server Actions that return data (not redirects).
 * Unlike requirePermission(), this does NOT call redirect() — it returns null on failure
 * so the action can return { error: '...' } without the redirect being swallowed by
 * startTransition on the client.
 *
 * Usage in a Server Action:
 *   const user = await checkPermission(PERMISSIONS.SOME_PERMISSION);
 *   if (!user) return { error: 'Unauthorized.' };
 */
export async function checkPermission(permission: string): Promise<AuthenticatedUser | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) return null;
  return user;
}

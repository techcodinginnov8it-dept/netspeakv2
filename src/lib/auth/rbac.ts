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
 * Server-side guard: Ensures user possesses a specific permission
 */
export async function requirePermission(permission: string): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) {
    throw new Error(`Unauthorized: Missing required permission [${permission}]`);
  }
  return user;
}

/**
 * Server-side guard: Ensures user possesses at least one of the specified roles
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  const hasAllowedRole = allowedRoles.some((r) => hasRole(user, r));
  if (!hasAllowedRole) {
    throw new Error(`Unauthorized: Missing required role [${allowedRoles.join(', ')}]`);
  }
  return user;
}

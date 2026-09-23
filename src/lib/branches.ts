import { prisma } from '@/lib/db';
import { AuthenticatedUser, ROLES } from '@/lib/auth/types';

/**
 * Netspeak Branch Registry & Definitions
 * Active Branches: Atimonan, Lopez, Sto. Tomas, Mauban, San Pablo, Gumaca
 */

export interface BranchInfo {
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
}

export const INITIAL_BRANCHES: BranchInfo[] = [
  { name: 'Atimonan', code: 'ATN', isActive: true },
  { name: 'Lopez', code: 'LPZ', isActive: true },
  { name: 'Sto. Tomas', code: 'STO', isActive: true },
  { name: 'Mauban', code: 'MBN', isActive: true },
  { name: 'San Pablo', code: 'SPB', isActive: true },
  { name: 'Gumaca', code: 'GMC', isActive: true },
];

export const BRANCH_NAMES = INITIAL_BRANCHES.map((b) => b.name);

/**
 * Normalizes branch name to ensure consistent matching
 */
export function normalizeBranch(branch?: string | null): string {
  if (!branch) return 'Atimonan';
  const match = INITIAL_BRANCHES.find(
    (b) => b.name.toLowerCase() === branch.trim().toLowerCase()
  );
  return match ? match.name : branch.trim();
}

/**
 * Fetches all active branches from the database with fallback to INITIAL_BRANCHES
 */
export async function getActiveBranches(): Promise<Array<{ id: string; name: string; code: string; address: string | null; isActive: boolean }>> {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });
    if (branches && branches.length > 0) {
      return branches;
    }
  } catch (err) {
    console.error('Failed to query branches from database, using fallback:', err);
  }

  return INITIAL_BRANCHES.map((b, idx) => ({
    id: `static-${idx}`,
    name: b.name,
    code: b.code,
    address: b.address || null,
    isActive: b.isActive,
  }));
}

/**
 * Resolves branch scoping condition for queries.
 * - SYSTEM_ADMINISTRATOR or MANAGEMENT:
 *   If explicitBranch is provided (e.g. from branch selector), scope to it.
 *   If explicitBranch is null or 'ALL', return empty object (all branches).
 * - Branch Admin or Center Staff:
 *   Scope strictly to their assigned branch.
 */
export function resolveBranchFilter(
  user: AuthenticatedUser,
  explicitBranch?: string | null
): { branch?: string } {
  const isGlobalAdmin =
    user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) ||
    user.roles.includes(ROLES.MANAGEMENT);

  if (isGlobalAdmin) {
    if (explicitBranch && explicitBranch !== 'ALL') {
      return { branch: explicitBranch };
    }
    return {};
  }

  // Branch Admins and other staff are strictly scoped to their assigned branch
  if (user.branch) {
    return { branch: user.branch };
  }

  return {};
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  branch?: string | null;
}

/**
 * System roles defined in Netspeak-System-Specification.md
 */
export const ROLES = {
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  IT: 'IT',
  MANAGEMENT: 'MANAGEMENT',
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
} as const;

export type SystemRole = typeof ROLES[keyof typeof ROLES];

/**
 * Standard system permissions
 */
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  ROLES_ASSIGN: 'roles:assign',
  DASHBOARD_VIEW: 'dashboard:view',
  SYSTEM_SETTINGS: 'system:settings',
  TEACHERS_READ: 'teachers:read',
  TEACHERS_CREATE: 'teachers:create',
  TEACHERS_UPDATE: 'teachers:update',
  TEACHERS_REVIEW: 'teachers:review',
  TEACHERS_APPROVE: 'teachers:approve',
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_RECORD: 'attendance:record',
  ATTENDANCE_VERIFY: 'attendance:verify',
  ATTENDANCE_MANAGE: 'attendance:manage',
  OUTPUT_SUBMIT: 'output:submit',
  OUTPUT_READ: 'output:read',
  REQUESTS_SUBMIT: 'requests:submit',
  REQUESTS_APPROVE: 'requests:approve',
  ANNOUNCEMENTS_CREATE: 'announcements:create',
  ANNOUNCEMENTS_MANAGE: 'announcements:manage',
  RESIGNATION_SUBMIT: 'resignation:submit',
  RESIGNATION_VIEW: 'resignation:view',
  RESIGNATION_MANAGE: 'resignation:manage',
  EXIT_INTERVIEW_MANAGE: 'exit_interview:manage',
  CONCERNS_SUBMIT: 'concerns:submit',
  CONCERNS_MANAGE: 'concerns:manage',
  INCIDENTS_REPORT: 'incidents:report',
  INCIDENTS_MANAGE: 'incidents:manage',
  SEATING_READ: 'seating:read',
  SEATING_MANAGE: 'seating:manage',
  NEWHIRE_VIEW: 'newhire:view',
  NEWHIRE_MANAGE: 'newhire:manage',
  MANAGEMENT_DASHBOARD: 'management:dashboard',
  OPERATIONS_RECORD: 'operations:record',
  OPERATIONS_MANAGE: 'operations:manage',
  SIMULATIONS_MANAGE: 'simulations:manage',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_BROADCAST: 'notifications:broadcast',
  SYSTEM_JOBS: 'system:jobs',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  AUDIT_VIEW: 'audit:view',
} as const;

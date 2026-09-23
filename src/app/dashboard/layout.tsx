import { requireAuth } from '@/lib/auth/rbac';
import { hasPermission, PERMISSIONS, ROLES } from '@/lib/auth/rbac';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar, { type SidebarPermissions, type SidebarUser } from '@/components/layout/AppSidebar';
import { getActiveBranches } from '@/lib/branches';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const branches = await getActiveBranches();

  const isTeacher = user.roles.includes(ROLES.TEACHER);

  /* Compute all sidebar permissions server-side — passed as plain props */
  const perms: SidebarPermissions = {
    canManageUsers:           hasPermission(user, PERMISSIONS.USERS_READ),
    canSubmitOutput:          isTeacher && hasPermission(user, PERMISSIONS.OUTPUT_SUBMIT),
    canReadOutput:            hasPermission(user, PERMISSIONS.OUTPUT_READ),
    canSubmitRequests:        hasPermission(user, PERMISSIONS.REQUESTS_SUBMIT),
    canApproveRequests:       hasPermission(user, PERMISSIONS.REQUESTS_APPROVE),
    canManageAnnouncements:   hasPermission(user, PERMISSIONS.ANNOUNCEMENTS_MANAGE) || hasPermission(user, PERMISSIONS.ANNOUNCEMENTS_CREATE),
    canSubmitResignation:     isTeacher && hasPermission(user, PERMISSIONS.RESIGNATION_SUBMIT),
    canManageResignation:     hasPermission(user, PERMISSIONS.RESIGNATION_MANAGE) || hasPermission(user, PERMISSIONS.RESIGNATION_VIEW),
    canSubmitConcerns:        isTeacher && hasPermission(user, PERMISSIONS.CONCERNS_SUBMIT),
    canManageTickets:         hasPermission(user, PERMISSIONS.CONCERNS_MANAGE) || hasPermission(user, PERMISSIONS.INCIDENTS_MANAGE),
    canViewSeating:           isTeacher && hasPermission(user, PERMISSIONS.SEATING_READ),
    canManageSeating:         hasPermission(user, PERMISSIONS.SEATING_MANAGE),
    canViewOnboarding:        hasPermission(user, PERMISSIONS.NEWHIRE_VIEW),
    canManageOnboarding:      hasPermission(user, PERMISSIONS.NEWHIRE_MANAGE),
    canViewManagementDashboard: hasPermission(user, PERMISSIONS.MANAGEMENT_DASHBOARD),
    canRecordOperations:      hasPermission(user, PERMISSIONS.OPERATIONS_RECORD),
    canManageOperations:      hasPermission(user, PERMISSIONS.OPERATIONS_MANAGE),
    canManageShifts:          hasPermission(user, PERMISSIONS.ATTENDANCE_MANAGE),
    canManageSimulations:     hasPermission(user, PERMISSIONS.SIMULATIONS_MANAGE),
    canReadNotifications:     hasPermission(user, PERMISSIONS.NOTIFICATIONS_READ),
    canBroadcastNotifications: hasPermission(user, PERMISSIONS.NOTIFICATIONS_BROADCAST),
    canViewReports:           hasPermission(user, PERMISSIONS.REPORTS_VIEW),
    canViewAudit:             hasPermission(user, PERMISSIONS.AUDIT_VIEW),
    canManageSettings:        hasPermission(user, PERMISSIONS.SYSTEM_SETTINGS),
  };

  const sidebarUser: SidebarUser = {
    fullName: user.fullName,
    email:    user.email,
    roles:    user.roles,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>
      <AppHeader user={user} branches={branches} />
      <div style={{ display: 'flex', flex: 1 }}>
        <AppSidebar user={sidebarUser} perms={perms} />
        <main style={{
          flex: 1,
          padding: '1.75rem 2rem',
          overflowY: 'auto',
          background: 'var(--bg-page)',
          minHeight: 'calc(100vh - 64px)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

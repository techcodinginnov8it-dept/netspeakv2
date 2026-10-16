import { requireAuth } from '@/lib/auth/rbac';
import { hasPermission, PERMISSIONS, ROLES } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar, { type SidebarPermissions, type SidebarUser } from '@/components/layout/AppSidebar';
import { getActiveBranches } from '@/lib/branches';
import { checkSubscriptionStatus } from '@/lib/subscription';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Evaluate monthly subscription status
  const subStatus = await checkSubscriptionStatus();
  const isSuperAdmin = user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) || user.roles.includes(ROLES.ADMIN);

  // If subscription is locked, block non-admin users completely from the dashboard.
  // Super admins are redirected to the billing desk (/subscription-locked or /dashboard/subscription).
  if (subStatus.isLocked && !isSuperAdmin) {
    redirect('/subscription-locked');
  }

  const branches = await getActiveBranches();


  const isTeacher = user.roles.includes(ROLES.TEACHER);

  // Check if teacher is currently timed in without time out (active on duty)
  let isDutyLocked = false;
  if (isTeacher) {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const teacherProfile = await prisma.teacherProfile.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });

      if (teacherProfile) {
        const activeAttendance = await prisma.teacherAttendance.findUnique({
          where: {
            teacherId_date: {
              teacherId: teacherProfile.id,
              date: today,
            },
          },
          select: { timeIn: true, timeOut: true },
        });

        if (activeAttendance?.timeIn && !activeAttendance.timeOut) {
          isDutyLocked = true;
        }
      }
    } catch (err) {
      console.error('[DashboardLayout] Failed to check duty status:', err);
      isDutyLocked = false;
    }
  }

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
    canViewOnboarding:        isTeacher || hasPermission(user, PERMISSIONS.NEWHIRE_VIEW),
    canManageOnboarding:      hasPermission(user, PERMISSIONS.NEWHIRE_MANAGE) || user.roles.includes(ROLES.MANAGEMENT) || user.roles.includes(ROLES.ADMIN) || user.roles.includes(ROLES.OPERATIONS_MANAGER),
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
      <AppHeader user={user} branches={branches} isDutyLocked={isDutyLocked} />
      
      {/* Grace period warning banner */}
      {subStatus.isGracePeriod && (
        <div style={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '0.625rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          color: '#92400e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700 }}>⚠️ Monthly Subscription Alert:</span>
            <span>
              Your monthly payment was due on {new Date(subStatus.dueDate).toLocaleDateString()}. 
              You have <strong>{subStatus.graceDaysRemaining} day(s)</strong> remaining before full system lockout.
            </span>
          </div>
          <Link
            href="/subscription-locked"
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#d97706',
              color: '#fff',
              borderRadius: '0.375rem',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.75rem',
            }}
          >
            Settle Payment
          </Link>
        </div>
      )}

      {/* Super admin locked banner */}
      {subStatus.isLocked && isSuperAdmin && (
        <div style={{
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          padding: '0.625rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          color: '#991b1b',
        }}>
          <div>
            <strong style={{ fontWeight: 700 }}>🔒 System Locked for Non-Admin Staff:</strong> Monthly subscription is overdue. Only administrators can access this panel.
          </div>
          <Link
            href="/subscription-locked"
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#dc2626',
              color: '#fff',
              borderRadius: '0.375rem',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.75rem',
            }}
          >
            Manage Billing & Unlock
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1 }}>
        <AppSidebar user={sidebarUser} perms={perms} />
        <main style={{
          flex: 1,
          padding: '1.75rem 2rem',
          overflowY: 'auto',
          background: 'var(--bg-page)',
          minHeight: 'calc(100vh - 62px)',
          backgroundImage: 'radial-gradient(at 0% 0%, hsla(228, 80%, 96%, 0.6) 0, transparent 60%), radial-gradient(at 100% 100%, hsla(155, 80%, 96%, 0.4) 0, transparent 60%)',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}


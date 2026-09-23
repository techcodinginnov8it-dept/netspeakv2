'use client';

import Link from 'next/link';

/* ----------------------------------------------------------------
   Types — receives pre-computed flags from the server layout
   ---------------------------------------------------------------- */
export interface SidebarPermissions {
  canManageUsers: boolean;
  canSubmitOutput: boolean;
  canReadOutput: boolean;
  canSubmitRequests: boolean;
  canApproveRequests: boolean;
  canManageAnnouncements: boolean;
  canSubmitResignation: boolean;
  canManageResignation: boolean;
  canSubmitConcerns: boolean;
  canManageTickets: boolean;
  canViewSeating: boolean;
  canManageSeating: boolean;
  canViewOnboarding: boolean;
  canManageOnboarding: boolean;
  canViewManagementDashboard: boolean;
  canRecordOperations: boolean;
  canManageOperations: boolean;
  canManageShifts: boolean;
  canManageSimulations: boolean;
  canReadNotifications: boolean;
  canBroadcastNotifications: boolean;
  canViewReports: boolean;
  canViewAudit: boolean;
  canManageSettings: boolean;
}

export interface SidebarUser {
  fullName: string;
  email: string;
  roles: string[];
}

/* ----------------------------------------------------------------
   Nav item helper
   ---------------------------------------------------------------- */
function NavItem({
  href,
  icon,
  label,
  accent,
}: {
  href: string;
  icon: string;
  label: string;
  accent?: 'blue' | 'green' | 'gold' | 'violet' | 'red';
}) {
  const accentColors: Record<string, string> = {
    blue:   'rgba(0, 82, 204, 0.16)',
    green:  'rgba(23, 185, 120, 0.16)',
    gold:   'rgba(244, 196, 48, 0.16)',
    violet: 'rgba(154, 138, 239, 0.16)',
    red:    'rgba(229, 62, 62, 0.14)',
  };

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.55rem 0.85rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.78)',
        textDecoration: 'none',
        transition: 'all 0.18s ease',
        fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = accent ? accentColors[accent] : 'rgba(255,255,255,0.1)';
        el.style.color = '#fff';
        el.style.transform = 'translateX(3px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = 'transparent';
        el.style.color = 'rgba(255,255,255,0.78)';
        el.style.transform = 'translateX(0)';
      }}
    >
      <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '0.62rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'rgba(255,255,255,0.35)',
      padding: '0 0.85rem',
      marginBottom: '0.25rem',
      marginTop: '0.2rem',
      fontFamily: 'var(--font-heading)',
    }}>
      {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.4rem 0' }} />;
}

/* ================================================================
   MAIN SIDEBAR CLIENT COMPONENT
   ================================================================ */
export default function AppSidebar({
  user,
  perms,
}: {
  user: SidebarUser;
  perms: SidebarPermissions;
}) {
  const {
    canManageUsers, canSubmitOutput, canReadOutput, canSubmitRequests,
    canApproveRequests, canManageAnnouncements, canSubmitResignation,
    canManageResignation, canSubmitConcerns, canManageTickets,
    canViewSeating, canManageSeating, canViewOnboarding, canManageOnboarding,
    canViewManagementDashboard, canRecordOperations, canManageOperations,
    canManageShifts, canManageSimulations, canReadNotifications,
    canBroadcastNotifications, canViewReports, canViewAudit, canManageSettings,
  } = perms;

  const showRequestsLink = canSubmitRequests || canApproveRequests;
  const showOutputLink   = canSubmitOutput || canReadOutput;
  const showAdmin        = canManageUsers || canManageOnboarding || canManageTickets || canManageSeating || canManageOperations;
  const primaryRole      = user.roles[0] || 'USER';

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'linear-gradient(180deg, #003A9E 0%, #0052CC 60%, #082E7C 100%)',
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: '2px 0 20px rgba(0,0,0,0.12)',
    }}>
      {/* Rainbow accent stripe */}
      <div style={{
        height: '3px',
        background: 'linear-gradient(90deg, #F4C430 0%, #3FD28F 40%, #9A8AEF 75%, #0052CC 100%)',
      }} />

      {/* User profile */}
      <div style={{
        padding: '1.1rem 0.85rem 0.9rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(244,196,48,0.85) 0%, rgba(63,210,143,0.85) 100%)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            flexShrink: 0,
          }}>
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '0.83rem',
              fontWeight: 600,
              color: '#fff',
              fontFamily: 'var(--font-heading)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.25,
            }}>
              {user.fullName}
            </div>
            <div style={{
              fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.5)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {primaryRole}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{
        flex: 1,
        padding: '0.65rem 0.4rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.05rem',
      }}>
        <SectionLabel label="Core" />
        <NavItem href="/dashboard" icon="🏠" label="Dashboard" accent="blue" />
        {canRecordOperations && <NavItem href="/dashboard/operations" icon="⚡" label="Operations Workstation" accent="blue" />}
        {canManageOperations && <NavItem href="/dashboard/operations/attendance" icon="👥" label="Staff Attendance" accent="blue" />}
        {canViewManagementDashboard && <NavItem href="/dashboard/management" icon="📊" label="Management Dashboard" accent="violet" />}

        {(showOutputLink || showRequestsLink || canReadNotifications || canViewReports) && (
          <>
            <Divider />
            <SectionLabel label="My Work" />
          </>
        )}
        {showOutputLink && <NavItem href="/dashboard/output" icon="📈" label="Daily Output Reports" accent="green" />}
        {showRequestsLink && <NavItem href="/dashboard/requests" icon="📝" label="Self-Service Requests" accent="blue" />}
        {canSubmitResignation && <NavItem href="/dashboard/resignation" icon="🚪" label="Resignation & Exit" accent="red" />}
        {canSubmitConcerns && <NavItem href="/dashboard/concerns" icon="🎫" label="My Concerns & Tickets" accent="gold" />}
        {canViewSeating && !canManageSeating && <NavItem href="/dashboard/seating" icon="🪑" label="My Seat Assignment" accent="violet" />}
        {canViewOnboarding && !canManageOnboarding && <NavItem href="/dashboard/onboarding" icon="📋" label="My Onboarding" accent="green" />}
        {canReadNotifications && <NavItem href="/dashboard/notifications" icon="🔔" label="Notifications" accent="gold" />}
        {canViewReports && <NavItem href="/dashboard/reports" icon="📈" label="Reports & Cut-Offs" accent="green" />}

        {canManageSimulations && (
          <>
            <Divider />
            <SectionLabel label="Operations" />
            <NavItem href="/dashboard/simulations" icon="🔄" label="Simulation Drills" accent="violet" />
          </>
        )}

        {showAdmin && (
          <>
            <Divider />
            <SectionLabel label="Administration" />
            {canManageOnboarding && <NavItem href="/dashboard/onboarding/manage" icon="🎓" label="New Hire Management" accent="green" />}
            <NavItem href="/dashboard/attendance" icon="⏰" label="Attendance & Shifts" accent="blue" />
            {canManageShifts && <NavItem href="/dashboard/shifts" icon="🕐" label="Shift Schedules" accent="green" />}
            <NavItem href="/dashboard/teachers" icon="👩‍🏫" label="Teacher Management" accent="blue" />
            {canManageResignation && <NavItem href="/dashboard/resignation/monitoring" icon="📋" label="Resignation Monitoring" accent="red" />}
            {canManageAnnouncements && <NavItem href="/dashboard/announcements" icon="📢" label="Announcements" accent="gold" />}
            {canManageTickets && <NavItem href="/dashboard/concerns/manage" icon="🗂️" label="Ticketing Desk" accent="gold" />}
            {canManageSeating && <NavItem href="/dashboard/seating/manage" icon="🗺️" label="Seating Arrangement" accent="violet" />}
            {canManageUsers && <NavItem href="/dashboard/users" icon="👥" label="User Management" accent="blue" />}
            {canBroadcastNotifications && <NavItem href="/dashboard/notifications" icon="📡" label="Broadcast Alerts" accent="gold" />}
          </>
        )}

        {(canViewAudit || canManageSettings) && (
          <>
            <Divider />
            <SectionLabel label="System" />
            {canViewAudit && <NavItem href="/dashboard/audit-logs" icon="📋" label="Audit Logs" accent="violet" />}
            {canManageSettings && <NavItem href="/dashboard/settings" icon="⚙️" label="System Settings" accent="blue" />}
          </>
        )}
      </div>

      {/* Bottom badge */}
      <div style={{ padding: '0.75rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.55rem 0.7rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3FD28F', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
              NETSPEAK PORTAL v2.0
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.2 }}>
              Developed by Innov8IT
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

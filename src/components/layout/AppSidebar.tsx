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
    blue:   'rgba(59, 130, 246, 0.18)',
    green:  'rgba(14, 165, 121, 0.18)',
    gold:   'rgba(245, 166, 35, 0.18)',
    violet: 'rgba(124, 111, 236, 0.18)',
    red:    'rgba(229, 62, 62, 0.16)',
  };

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.5rem 0.85rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.72)',
        textDecoration: 'none',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
        borderLeft: '2px solid transparent',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = accent ? accentColors[accent] : 'rgba(255,255,255,0.1)';
        el.style.color = '#fff';
        el.style.borderLeftColor = accent === 'blue' ? '#3b82f6' : accent === 'green' ? '#34d399' : accent === 'gold' ? '#f5a623' : accent === 'violet' ? '#7c6fec' : accent === 'red' ? '#ef4444' : '#3b82f6';
        el.style.paddingLeft = '1rem';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = 'transparent';
        el.style.color = 'rgba(255,255,255,0.72)';
        el.style.borderLeftColor = 'transparent';
        el.style.paddingLeft = '0.85rem';
      }}
    >
      <span style={{ fontSize: '0.95rem', flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '0.6rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'rgba(255,255,255,0.28)',
      padding: '0 0.85rem',
      marginBottom: '0.2rem',
      marginTop: '0.15rem',
      fontFamily: 'var(--font-heading)',
    }}>
      {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0.35rem 0.4rem' }} />;
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
      width: '238px',
      minWidth: '238px',
      background: 'linear-gradient(175deg, #0a2158 0%, #1240a8 50%, #0f1d55 100%)',
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: '2px 0 24px rgba(10, 33, 88, 0.22)',
    }}>
      {/* Top accent stripe — brand gradient */}
      <div style={{
        height: '3px',
        background: 'linear-gradient(90deg, #f5a623 0%, #34d399 35%, #7c6fec 70%, #3b82f6 100%)',
      }} />

      {/* User profile */}
      <div style={{
        padding: '1rem 0.85rem 0.85rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(245,166,35,0.9) 0%, rgba(52,211,153,0.9) 100%)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '0.82rem',
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
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.42)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: '1px',
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
        {(canRecordOperations || canManageOperations) && <NavItem href="/dashboard/operations/it-schedules" icon="🗓️" label="IT Schedules" accent="blue" />}
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
        {user.roles.includes('TEACHER') && <NavItem href="/dashboard/certificate" icon="📜" label="My Certificate" accent="gold" />}
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
      <div style={{ padding: '0.7rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.7rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#34d399',
            flexShrink: 0,
            boxShadow: '0 0 6px rgba(52,211,153,0.6)',
          }} />
          <div>
            <div style={{ fontSize: '0.67rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>
              NETSPEAK PORTAL v2.0
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.2 }}>
              Developed by Innov8IT
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

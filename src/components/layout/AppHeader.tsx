'use client';

import { logoutAction } from '@/actions/auth';
import { AuthenticatedUser, ROLES } from '@/lib/auth/types';
import NotificationBell from '@/components/notifications/NotificationBell';
import BranchSwitcher from '@/components/branches/BranchSwitcher';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface AppHeaderProps {
  user: AuthenticatedUser;
  branches?: Array<{ name: string; code: string }>;
  isDutyLocked?: boolean;
}

export default function AppHeader({ user, branches = [], isDutyLocked = false }: AppHeaderProps) {
  const primaryRole = user.roles[0] || 'USER';
  const searchParams = useSearchParams();
  const currentBranch = searchParams.get('branch') || 'ALL';
  const isSystemAdmin =
    user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) ||
    user.roles.includes(ROLES.MANAGEMENT);

  return (
    <header style={{
      height: '62px',
      background: 'linear-gradient(90deg, #0a2158 0%, #1240a8 40%, #1a56db 72%, #0ea579 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 24px rgba(10, 33, 88, 0.30)',
    }}>
      {/* Left — Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Company Logo */}
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '9px',
          background: '#ffffff',
          padding: '2px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <Image
            src="/logo.png"
            alt="Netspeak Logo"
            width={36}
            height={36}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        <div>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '1rem',
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}>
            Netspeak Portal
          </div>
          <div style={{
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.65)',
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            ESL Operations Management
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '1px',
          height: '28px',
          background: 'rgba(255,255,255,0.25)',
          margin: '0 0.25rem',
        }} />

        {/* Environment badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.65rem',
          padding: '3px 9px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(52, 211, 153, 0.18)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          color: 'rgba(255,255,255,0.95)',
          fontWeight: 600,
          letterSpacing: '0.04em',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
          LIVE
        </span>
      </div>

      {/* Right — User + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Branch Switcher / Indicator */}
        <BranchSwitcher
          branches={branches}
          currentBranch={currentBranch}
          isSystemAdmin={isSystemAdmin}
          userAssignedBranch={user.branch}
        />

        {/* Role badge */}
        <span style={{
          fontSize: '0.68rem',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.22)',
          color: 'rgba(255,255,255,0.9)',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.02em',
          backdropFilter: 'blur(8px)',
        }}>
          {primaryRole}
        </span>

        {/* User info */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            lineHeight: 1.2,
          }}>
            {user.fullName}
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.7)',
          }}>
            {user.email}
          </div>
        </div>

        {/* Avatar circle */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          border: '1.5px solid rgba(255,255,255,0.38)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'var(--font-heading)',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {user.fullName.charAt(0).toUpperCase()}
        </div>

        <NotificationBell />

        {isDutyLocked ? (
          <div
            title="Sign out is locked during active duty. You must submit your daily shift departure / time-out from the Teacher Attendance widget first."
            style={{
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              color: '#FEE2E2',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'not-allowed',
              userSelect: 'none',
            }}
          >
            <span>🔒</span>
            <span>On Duty (Locked)</span>
          </div>
        ) : (
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: 'rgba(255,255,255,0.9)',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                transition: 'all var(--ease-fast)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.5)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.28)';
              }}
            >
              Sign Out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

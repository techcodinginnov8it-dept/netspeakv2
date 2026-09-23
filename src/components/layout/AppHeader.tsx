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
}

export default function AppHeader({ user, branches = [] }: AppHeaderProps) {
  const primaryRole = user.roles[0] || 'USER';
  const searchParams = useSearchParams();
  const currentBranch = searchParams.get('branch') || 'ALL';
  const isSystemAdmin =
    user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) ||
    user.roles.includes(ROLES.MANAGEMENT);

  return (
    <header style={{
      height: '64px',
      background: 'var(--grad-brand)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 20px rgba(0, 82, 204, 0.25)',
    }}>
      {/* Left — Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Company Logo */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#FFFFFF',
          padding: '2px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
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
            fontSize: '1.05rem',
            color: '#fff',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}>
            Netspeak Portal
          </div>
          <div style={{
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.72)',
            fontWeight: 500,
            letterSpacing: '0.04em',
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
          fontSize: '0.68rem',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'rgba(255,255,255,0.92)',
          fontWeight: 600,
          letterSpacing: '0.03em',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3FD28F', display: 'inline-block' }} />
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
          fontSize: '0.72rem',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.28)',
          color: 'rgba(255,255,255,0.95)',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.02em',
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
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.22)',
          border: '2px solid rgba(255,255,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'var(--font-heading)',
          flexShrink: 0,
        }}>
          {user.fullName.charAt(0).toUpperCase()}
        </div>

        <NotificationBell />

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
      </div>
    </header>
  );
}

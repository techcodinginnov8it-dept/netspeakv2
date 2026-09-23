'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Props {
  branches: Array<{ name: string; code: string }>;
  currentBranch: string;
  isSystemAdmin: boolean;
  userAssignedBranch?: string | null;
}

export default function BranchSwitcher({
  branches,
  currentBranch,
  isSystemAdmin,
  userAssignedBranch,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleBranchChange = (newBranch: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newBranch === 'ALL') {
        params.delete('branch');
      } else {
        params.set('branch', newBranch);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      router.push(`${pathname}${query}`);
    });
  };

  // If not System Admin / Management, show a static branch tag
  if (!isSystemAdmin) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.14)',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          borderRadius: 'var(--radius-full)',
          padding: '3px 12px',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.02em',
        }}
        title={`Your session is scoped to ${userAssignedBranch || 'Atimonan'} Branch`}
      >
        <span style={{ fontSize: '0.85rem' }}>📍</span>
        <span>{userAssignedBranch || 'Atimonan'} Center</span>
      </div>
    );
  }

  // System Admin / Management gets the interactive Branch Switcher dropdown
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 8px',
        color: '#fff',
      }}
    >
      <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>🏢</span>
      <select
        value={currentBranch}
        onChange={(e) => handleBranchChange(e.target.value)}
        disabled={isPending}
        style={{
          background: 'transparent',
          color: '#fff',
          border: 'none',
          outline: 'none',
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          cursor: isPending ? 'wait' : 'pointer',
        }}
      >
        <option value="ALL" style={{ background: '#0a192f', color: '#fff' }}>
          🌐 All Branches (Global)
        </option>
        {branches.map((b) => (
          <option key={b.code} value={b.name} style={{ background: '#0a192f', color: '#fff' }}>
            📍 {b.name} ({b.code})
          </option>
        ))}
      </select>
      {isPending && (
        <span style={{ fontSize: '0.65rem', color: '#fef08a' }}>⏳</span>
      )}
    </div>
  );
}

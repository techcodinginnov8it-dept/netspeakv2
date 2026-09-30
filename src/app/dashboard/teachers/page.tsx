import React from 'react';
import { requirePermission, PERMISSIONS, hasPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import TeacherDirectoryTable from '@/components/teachers/TeacherDirectoryTable';
import ReferralMonitoringDesk from '@/components/teachers/ReferralMonitoringDesk';
import { resolveBranchFilter } from '@/lib/branches';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Teacher Management & Referrals | Netspeak Portal',
};

interface PageProps {
  searchParams: Promise<{ branch?: string; tab?: string }>;
}

export default async function TeachersPage({ searchParams }: PageProps) {
  const user = await requirePermission(PERMISSIONS.TEACHERS_READ);
  const resolvedParams = await searchParams;
  const currentTab = resolvedParams.tab || 'directory';
  const branchFilter = resolveBranchFilter(user, resolvedParams.branch);

  const canManageReferrals = hasPermission(user, PERMISSIONS.TEACHERS_REVIEW);

  const [teachers, referralRecords] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: branchFilter,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            isActive: true,
          },
        },
        shiftSchedule: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    }),
    prisma.teacherProfile.findMany({
      where: {
        isReferred: true,
        ...branchFilter,
      },
      include: {
        referredByTeacher: {
          select: {
            id: true,
            realFullName: true,
            displayName: true,
            branch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalTeachers = teachers.length;
  const pendingReview = teachers.filter((t) => t.registrationStatus === 'PENDING').length;
  const underReview = teachers.filter((t) => t.registrationStatus === 'UNDER_REVIEW').length;
  const activeTeachers = teachers.filter((t) => t.registrationStatus === 'APPROVED').length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Quick Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Teacher Management
          </h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.95rem' }}>
            Review incoming registrations, perform approval workflows, and monitor teacher referrals (§XXI).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/register" target="_blank" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
            + Public Registration Form ↗
          </Link>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <Link
          href="/dashboard/teachers?tab=directory"
          className={`btn ${currentTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '8px 18px' }}
        >
          📋 Teacher Directory ({totalTeachers})
        </Link>
        <Link
          href="/dashboard/teachers?tab=referrals"
          className={`btn ${currentTab === 'referrals' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '8px 18px' }}
        >
          🤝 Referral Monitoring (§XXI) ({referralRecords.length})
        </Link>
      </div>

      {currentTab === 'directory' ? (
        <>
          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Total Profiles</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px' }}>{totalTeachers}</div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--warning)' }}>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Pending Review</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#B45309' }}>{pendingReview}</div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--ns-blue)' }}>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Under Review</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: 'var(--ns-blue)' }}>{underReview}</div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--success)' }}>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>Approved & Active</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '4px', color: '#0F766E' }}>{activeTeachers}</div>
            </div>
          </div>

          {/* Directory Table */}
          <TeacherDirectoryTable teachers={teachers} />
        </>
      ) : (
        /* Referral Monitoring Desk */
        <ReferralMonitoringDesk
          referrals={referralRecords}
          canManage={canManageReferrals}
        />
      )}
    </div>
  );
}

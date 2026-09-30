import React from 'react';
import { requireAuth, ROLES } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import { getCertificateOfServiceAction } from '@/actions/certificates';
import CertificateOfServiceViewer from '@/components/teachers/CertificateOfServiceViewer';
import Link from 'next/link';

export const metadata = {
  title: 'My Certificate of Service | Netspeak Portal',
};

export default async function TeacherSelfCertificatePage() {
  const user = await requireAuth();

  const teacher = await prisma.teacherProfile.findFirst({
    where: { userId: user.id },
    select: { id: true, registrationStatus: true },
  });

  if (!teacher) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--bg-card)',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📜</div>
          <h2 style={{ margin: '0 0 0.5rem' }}>No Teacher Profile Linked</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
            Your account is not linked to a registered teacher profile.
          </p>
          <Link href="/dashboard" className="btn btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (teacher.registrationStatus !== 'APPROVED') {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--bg-card)',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ margin: '0 0 0.5rem' }}>Profile Pending Approval</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
            Your teacher profile is currently pending administrative review. Certificate of Service will be available once approved.
          </p>
          <Link href="/dashboard" className="btn btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const res = await getCertificateOfServiceAction(teacher.id);

  if (!res.success || !res.data) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center' }}>
        <div style={{
          background: 'var(--bg-card)',
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}>
          <h2 style={{ margin: '0 0 0.5rem', color: '#ef4444' }}>Unable to Generate Certificate</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
            {res.error || 'Failed to generate Certificate of Service.'}
          </p>
          <Link href="/dashboard" className="btn btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <CertificateOfServiceViewer cert={res.data} backHref="/dashboard" />
    </div>
  );
}

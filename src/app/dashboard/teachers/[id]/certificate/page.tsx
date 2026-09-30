import React from 'react';
import { requireAuth, hasPermission, PERMISSIONS, ROLES } from '@/lib/auth/rbac';
import { getCertificateOfServiceAction } from '@/actions/certificates';
import CertificateOfServiceViewer from '@/components/teachers/CertificateOfServiceViewer';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Certificate of Service | Netspeak Portal',
};

export default async function TeacherCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const resolvedParams = await params;

  const res = await getCertificateOfServiceAction(resolvedParams.id);

  if (!res.success || !res.data) {
    notFound();
  }

  const isTeacher = user.roles.includes(ROLES.TEACHER);
  const backHref = isTeacher ? '/dashboard' : `/dashboard/teachers/${resolvedParams.id}`;

  return (
    <div style={{ padding: '1rem 0' }}>
      <CertificateOfServiceViewer cert={res.data} backHref={backHref} />
    </div>
  );
}

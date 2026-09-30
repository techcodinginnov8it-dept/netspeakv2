'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, PERMISSIONS, ROLES } from '@/lib/auth/rbac';
import { resolveBranchFilter } from '@/lib/branches';

export interface CertificateOfServiceData {
  certificateNo: string;
  generatedDate: string; // ISO string
  realFullName: string;
  displayName: string;
  position: string;
  projectType: string;
  department: string;
  branch: string;
  startDate: string; // Formatted date string
  endDate: string; // Formatted date string or 'Present'
  tenureString: string;
  authorizedSignatory: string;
  signatoryTitle: string;
  companyName: string;
  companyTagline: string;
}

function calculateTenure(start: Date, end: Date): string {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30.4375);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0 && remainingMonths > 0) {
    return `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  } else if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
}

/**
 * Fetch and construct Certificate of Service data for a given teacher
 * Accessible to authorized staff (TEACHERS_READ) or the teacher themselves
 */
export async function getCertificateOfServiceAction(
  teacherId: string
): Promise<{ success?: boolean; data?: CertificateOfServiceData; error?: string }> {
  try {
    const currentUser = await requireAuth();

    // Check if user is the teacher or has staff view permission
    const isSelf = currentUser.roles.includes(ROLES.TEACHER);
    let teacherProfile: any = null;

    if (isSelf) {
      teacherProfile = await prisma.teacherProfile.findFirst({
        where: { id: teacherId, userId: currentUser.id },
        include: {
          resignations: {
            where: { status: { in: ['EXIT_INTERVIEW_COMPLETED', 'IT_CLEARANCE_PENDING', 'DEACTIVATED'] } },
            orderBy: { effectivityDate: 'desc' },
            take: 1,
          },
        },
      });
    } else {
      await requirePermission(PERMISSIONS.TEACHERS_READ);
      teacherProfile = await prisma.teacherProfile.findFirst({
        where: {
          id: teacherId,
          ...resolveBranchFilter(currentUser),
        },
        include: {
          resignations: {
            where: { status: { in: ['EXIT_INTERVIEW_COMPLETED', 'IT_CLEARANCE_PENDING', 'DEACTIVATED'] } },
            orderBy: { effectivityDate: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!teacherProfile) {
      return { error: 'Teacher record not found or access denied.' };
    }

    const startDateObj = teacherProfile.launchDate || teacherProfile.createdAt;
    const resignation = teacherProfile.resignations?.[0];
    const isEnded = resignation && (resignation.status === 'DEACTIVATED' || new Date(resignation.effectivityDate) <= new Date());
    const endDateObj = isEnded ? new Date(resignation.effectivityDate) : null;

    const startDateFormatted = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(startDateObj);

    const endDateFormatted = endDateObj
      ? new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }).format(endDateObj)
      : 'Present';

    const tenure = calculateTenure(startDateObj, endDateObj || new Date());

    // Generate deterministic certificate number based on ID and date
    const hashYear = new Date().getFullYear();
    const certSuffix = teacherProfile.id.replace(/-/g, '').substring(0, 6).toUpperCase();
    const certificateNo = `COS-NS-${hashYear}-${certSuffix}`;

    const data: CertificateOfServiceData = {
      certificateNo,
      generatedDate: new Date().toISOString(),
      realFullName: teacherProfile.realFullName,
      displayName: teacherProfile.displayName,
      position: `Online English Teacher (${teacherProfile.projectType})`,
      projectType: teacherProfile.projectType,
      department: teacherProfile.department === 'OVERSEAS' ? 'Overseas / Global Department' : 'Domestic Department',
      branch: teacherProfile.branch || 'Main Branch',
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      tenureString: tenure,
      authorizedSignatory: 'Operations Director',
      signatoryTitle: 'Human Resources & Operations Management',
      companyName: 'Netspeak Online Education Services Inc.',
      companyTagline: 'Excellence in English Language Teaching & Operations',
    };

    return { success: true, data };
  } catch (err: any) {
    console.error('getCertificateOfServiceAction error:', err);
    return { error: err.message || 'Failed to generate Certificate of Service.' };
  }
}

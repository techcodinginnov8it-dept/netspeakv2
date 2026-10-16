import { requireAuth, hasPermission, ROLES } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import TeacherOnboardingView, { OnboardingRecordProps } from '@/components/newhire/TeacherOnboardingView';
import { STANDARD_REQUIREMENTS } from '@/lib/operations/onboardingConstants';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await requireAuth();

  // If user has admin newhire:manage permission, redirect to management desk
  if (hasPermission(user, 'newhire:manage')) {
    redirect('/dashboard/onboarding/manage');
  }

  // Teacher self-view: find the teacher's profile and onboarding record
  let teacher = await prisma.teacherProfile.findFirst({
    where: {
      OR: [
        { userId: user.id },
        { contactEmail: { equals: user.email, mode: 'insensitive' } },
        { user: { email: { equals: user.email, mode: 'insensitive' } } },
      ],
    },
    include: {
      newHireRecord: {
        include: {
          requirements: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  // If teacher profile found without linked userId, link it now
  if (teacher && !teacher.userId) {
    await prisma.teacherProfile.update({
      where: { id: teacher.id },
      data: { userId: user.id },
    });
  }

  // If teacher profile exists but has no newHireRecord, create it now
  if (teacher && !teacher.newHireRecord) {
    const newRecord = await prisma.newHireRecord.create({
      data: {
        teacherId: teacher.id,
        startDate: new Date(),
        branch: teacher.branch || user.branch || 'MAIN',
        project: teacher.projectType || 'ESL Regular',
        status: 'IN_PROGRESS',
        completionPct: 0,
        requirements: {
          create: STANDARD_REQUIREMENTS.map((r) => ({
            requirementKey: r.key,
            label: r.label,
            status: 'PENDING',
          })),
        },
      },
      include: {
        requirements: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    (teacher as any).newHireRecord = newRecord;
  }

  // If no teacher profile exists at all for a user with TEACHER role, create profile + record
  if (!teacher && user.roles.includes(ROLES.TEACHER)) {
    const createdProfile = await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        realFullName: user.fullName || user.username,
        displayName: user.fullName || user.username,
        contactEmail: user.email,
        birthday: new Date('1998-01-01'),
        cellphone: `+639${Math.floor(100000000 + Math.random() * 900000000)}`,
        emergencyContactName: 'N/A',
        emergencyContactPhone: '+639000000000',
        address: 'Netspeak Operations Facility',
        schoolAttended: 'N/A',
        course: 'Education',
        major: 'General',
        registrationStatus: 'APPROVED',
        projectType: 'FT',
        department: 'DOMESTIC',
        newHireRecord: {
          create: {
            startDate: new Date(),
            branch: user.branch || 'MAIN',
            project: 'ESL Regular',
            status: 'IN_PROGRESS',
            completionPct: 0,
            requirements: {
              create: STANDARD_REQUIREMENTS.map((r) => ({
                requirementKey: r.key,
                label: r.label,
                status: 'PENDING',
              })),
            },
          },
        },
      },
      include: {
        newHireRecord: {
          include: {
            requirements: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
    teacher = createdProfile as any;
  }

  if (!teacher || !teacher.newHireRecord) {
    return <TeacherOnboardingView />;
  }

  const rec = teacher.newHireRecord;
  const formattedRecord: OnboardingRecordProps = {
    id: rec.id,
    startDate: rec.startDate.toISOString(),
    branch: rec.branch,
    project: rec.project,
    status: rec.status,
    completionPct: rec.completionPct,
    slotsEligible: rec.slotsEligible,
    slotsEligibleAt: rec.slotsEligibleAt ? rec.slotsEligibleAt.toISOString() : null,
    requirements: rec.requirements.map(r => ({
      id: r.id,
      requirementKey: r.requirementKey,
      label: r.label,
      status: r.status,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      notes: r.notes,
    })),
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 0' }}>
      <TeacherOnboardingView record={formattedRecord} />
    </div>
  );
}

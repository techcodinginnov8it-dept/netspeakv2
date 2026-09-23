import { requireAuth, hasPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import TeacherOnboardingView, { OnboardingRecordProps } from '@/components/newhire/TeacherOnboardingView';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await requireAuth();

  // If user has admin newhire:manage permission, redirect to management desk
  if (hasPermission(user, 'newhire:manage')) {
    redirect('/dashboard/onboarding/manage');
  }

  // Teacher self-view: find the teacher's profile and onboarding record
  const teacher = await prisma.teacherProfile.findFirst({
    where: { userId: user.id },
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

import { requireAuth, hasPermission, ROLES } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getNewHireSummaryAction } from '@/actions/newHire';
import NewHireDashboard, { AdminNewHireRecord, TeacherOption } from '@/components/newhire/NewHireDashboard';

export const dynamic = 'force-dynamic';

export default async function NewHireManagePage() {
  const user = await requireAuth();

  const isAuthorized =
    hasPermission(user, 'newhire:manage') ||
    user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) ||
    user.roles.includes(ROLES.ADMIN) ||
    user.roles.includes(ROLES.OPERATIONS_MANAGER) ||
    user.roles.includes(ROLES.MANAGEMENT);

  if (!isAuthorized) {
    redirect('/dashboard');
  }

  const [summary, rawRecords, teachers] = await Promise.all([
    getNewHireSummaryAction(),
    prisma.newHireRecord.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            realFullName: true,
            displayName: true,
            portalUsername: true,
            branch: true,
            user: {
              select: { email: true, fullName: true },
            },
          },
        },
        requirements: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    // Teachers without an onboarding record yet
    prisma.teacherProfile.findMany({
      where: { newHireRecord: null },
      select: {
        id: true,
        realFullName: true,
        displayName: true,
        portalUsername: true,
        branch: true,
        projectType: true,
      },
      orderBy: { realFullName: 'asc' },
    }),
  ]);

  const initialRecords: AdminNewHireRecord[] = rawRecords.map((r) => ({
    id: r.id,
    teacherId: r.teacherId,
    teacherName: r.teacher?.realFullName || 'Teacher',
    teacherEmail: r.teacher?.user?.email ?? r.teacher?.displayName ?? '',
    teacherSystemId: r.teacher?.portalUsername ?? '',
    startDate: r.startDate.toISOString(),
    branch: r.branch,
    project: r.project,
    status: r.status,
    completionPct: r.completionPct,
    slotsEligible: r.slotsEligible,
    slotsEligibleAt: r.slotsEligibleAt ? r.slotsEligibleAt.toISOString() : null,
    notes: r.notes,
    requirements: r.requirements.map((req) => ({
      id: req.id,
      requirementKey: req.requirementKey,
      label: req.label,
      status: req.status,
      completedAt: req.completedAt ? req.completedAt.toISOString() : null,
      verifiedById: req.verifiedById,
      verifiedAt: req.verifiedAt ? req.verifiedAt.toISOString() : null,
      notes: req.notes,
    })),
  }));

  const availableTeachers: TeacherOption[] = teachers.map((t) => ({
    id: t.id,
    fullName: t.realFullName,
    systemId: t.portalUsername ?? t.displayName,
    branch: t.projectType,
  }));

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 0' }}>
      <NewHireDashboard
        initialRecords={initialRecords}
        summary={summary}
        availableTeachers={availableTeachers}
      />
    </div>
  );
}

import { requireAuth, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import ResignationMonitoringDashboard from '@/components/resignation/ResignationMonitoringDashboard';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Resignation Monitoring — Netspeak Portal',
};

export default async function ResignationMonitoringPage() {
  const user = await requireAuth();

  const canView =
    hasPermission(user, PERMISSIONS.RESIGNATION_VIEW) ||
    hasPermission(user, PERMISSIONS.RESIGNATION_MANAGE);

  if (!canView) {
    redirect('/dashboard');
  }

  const [resignations, slots] = await Promise.all([
    prisma.teacherResignation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        exitInterviewSlot: true,
      },
    }),
    prisma.exitInterviewSlot.findMany({
      orderBy: { slotDateTime: 'desc' },
    }),
  ]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <ResignationMonitoringDashboard
        initialResignations={resignations.map((r) => ({
          id: r.id,
          teacherId: r.teacherId,
          fullName: r.fullName,
          branch: r.branch,
          project: r.project,
          dateFiled: r.dateFiled.toISOString(),
          effectivityDate: r.effectivityDate.toISOString(),
          reason: r.reason,
          status: r.status,
          resignationLetter: r.resignationLetter,
          signature: r.signature,
          reviewNotes: r.reviewNotes,
          tpcapNotified: r.tpcapNotified,
          itCleared: r.itCleared,
          itRemarks: r.itRemarks,
          deactivatedAt: r.deactivatedAt?.toISOString() || null,
          exitInterviewSlot: r.exitInterviewSlot
            ? {
                id: r.exitInterviewSlot.id,
                slotDateTime: r.exitInterviewSlot.slotDateTime.toISOString(),
                interviewerName: r.exitInterviewSlot.interviewerName,
                isCompleted: r.exitInterviewSlot.isCompleted,
                interviewNotes: r.exitInterviewSlot.interviewNotes,
              }
            : null,
        }))}
        initialSlots={slots.map((s) => ({
          id: s.id,
          slotDateTime: s.slotDateTime.toISOString(),
          interviewerName: s.interviewerName,
          isBooked: s.isBooked,
          isCompleted: s.isCompleted,
        }))}
      />
    </div>
  );
}

import { requireAuth, hasPermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import OperationsTicketingDesk from '@/components/tickets/OperationsTicketingDesk';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Support & Incident Desk — Netspeak Portal',
};

export default async function OperationsTicketingPage() {
  const user = await requireAuth();

  const canManageConcerns = hasPermission(user, PERMISSIONS.CONCERNS_MANAGE);
  const canManageIncidents = hasPermission(user, PERMISSIONS.INCIDENTS_MANAGE);

  if (!canManageConcerns && !canManageIncidents) {
    redirect('/dashboard');
  }

  const [concerns, incidents] = await Promise.all([
    prisma.teacherConcernTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: true,
      },
    }),
    prisma.incidentReportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <OperationsTicketingDesk
        initialConcerns={concerns.map((c) => ({
          id: c.id,
          teacherId: c.teacherId,
          teacherName: c.teacher.realFullName,
          teacherProject: c.teacher.projectType,
          title: c.title,
          category: c.category,
          urgency: c.urgency,
          description: c.description,
          attachmentUrl: c.attachmentUrl,
          status: c.status,
          assignedToName: c.assignedToName,
          actionTaken: c.actionTaken,
          resolutionNotes: c.resolutionNotes,
          createdAt: c.createdAt.toISOString(),
        }))}
        initialIncidents={incidents.map((i) => ({
          id: i.id,
          incidentDate: i.incidentDate.toISOString(),
          incidentTime: i.incidentTime,
          reporterName: i.reporterName,
          branch: i.branch,
          personInvolved: i.personInvolved,
          category: i.category,
          description: i.description,
          evidenceUrl: i.evidenceUrl,
          actionTaken: i.actionTaken,
          remarks: i.remarks,
          status: i.status,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

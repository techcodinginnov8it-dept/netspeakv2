import { requireAuth } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import TeacherConcernsView from '@/components/tickets/TeacherConcernsView';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Teacher Concerns — Netspeak Portal',
};

export default async function TeacherConcernsPage() {
  const user = await requireAuth();

  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: user.id },
  });

  if (!teacherProfile) {
    if (user.roles.includes('ADMIN') || user.roles.includes('OPERATIONS_MANAGER') || user.roles.includes('IT') || user.roles.includes('SYSTEM_ADMINISTRATOR')) {
      redirect('/dashboard/concerns/manage');
    }
    redirect('/dashboard');
  }

  const tickets = await prisma.teacherConcernTicket.findMany({
    where: { teacherId: teacherProfile.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <TeacherConcernsView
        initialTickets={tickets.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          urgency: t.urgency,
          description: t.description,
          attachmentUrl: t.attachmentUrl,
          status: t.status,
          assignedToName: t.assignedToName,
          actionTaken: t.actionTaken,
          resolutionNotes: t.resolutionNotes,
          createdAt: t.createdAt.toISOString(),
          resolvedAt: t.resolvedAt?.toISOString() || null,
        }))}
      />
    </div>
  );
}

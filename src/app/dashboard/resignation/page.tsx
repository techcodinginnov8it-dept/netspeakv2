import { requireAuth } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import TeacherResignationForm from '@/components/resignation/TeacherResignationForm';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Teacher Resignation — Netspeak Portal',
};

export default async function ResignationPage() {
  const user = await requireAuth();

  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: user.id },
  });

  if (!teacherProfile) {
    if (user.roles.includes('ADMIN') || user.roles.includes('OPERATIONS_MANAGER') || user.roles.includes('SYSTEM_ADMINISTRATOR')) {
      redirect('/dashboard/resignation/monitoring');
    }
    redirect('/dashboard');
  }

  // Fetch existing active resignation if any
  const existingResignation = await prisma.teacherResignation.findFirst({
    where: {
      teacherId: teacherProfile.id,
      status: {
        notIn: ['WITHDRAWN', 'DEACTIVATED'],
      },
    },
    include: {
      exitInterviewSlot: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch available exit interview slots (not booked yet)
  const availableSlots = await prisma.exitInterviewSlot.findMany({
    where: {
      isBooked: false,
      slotDateTime: {
        gte: new Date(),
      },
    },
    orderBy: { slotDateTime: 'asc' },
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <TeacherResignationForm
        teacherProfile={{
          fullName: teacherProfile.realFullName,
          branch: 'Main Branch',
          project: teacherProfile.projectType,
        }}
        existingResignation={
          existingResignation
            ? {
                id: existingResignation.id,
                fullName: existingResignation.fullName,
                branch: existingResignation.branch,
                project: existingResignation.project,
                dateFiled: existingResignation.dateFiled.toISOString(),
                effectivityDate: existingResignation.effectivityDate.toISOString(),
                reason: existingResignation.reason,
                resignationLetter: existingResignation.resignationLetter,
                signature: existingResignation.signature,
                status: existingResignation.status,
                exitInterviewSlot: existingResignation.exitInterviewSlot
                  ? {
                      id: existingResignation.exitInterviewSlot.id,
                      slotDateTime: existingResignation.exitInterviewSlot.slotDateTime.toISOString(),
                      interviewerName: existingResignation.exitInterviewSlot.interviewerName,
                      isCompleted: existingResignation.exitInterviewSlot.isCompleted,
                    }
                  : null,
              }
            : null
        }
        availableSlots={availableSlots.map((s) => ({
          id: s.id,
          slotDateTime: s.slotDateTime.toISOString(),
          interviewerName: s.interviewerName,
        }))}
      />
    </div>
  );
}

import { requirePermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import SeatingManagementDesk from '@/components/seating/SeatingManagementDesk';
import type { WorkstationItem, AvailableTeacher } from '@/components/seating/SeatingManagementDesk';
import { RegistrationStatus } from '@prisma/client';

export const metadata = {
  title: 'Seating Arrangement — Netspeak Portal',
};

export default async function SeatingManagePage() {
  await requirePermission('seating:manage');

  // Fetch all workstations with current assignment + teacher name
  const workstationsRaw = await prisma.workstation.findMany({
    orderBy: [{ branch: 'asc' }, { workstationNo: 'asc' }],
    include: {
      assignment: {
        where: { unassignedAt: null },
        include: {
          teacher: {
            select: { id: true, displayName: true, realFullName: true },
          },
        },
      },
    },
  });

  const workstations: WorkstationItem[] = workstationsRaw.map((ws) => ({
    id: ws.id,
    branch: ws.branch,
    workstationNo: ws.workstationNo,
    seatNo: ws.seatNo,
    specs: ws.specs,
    status: ws.status,
    notes: ws.notes,
    assignment: ws.assignment
      ? {
          id: ws.assignment.id,
          teacherId: ws.assignment.teacherId,
          teacherName: ws.assignment.teacher.realFullName,
          schedule: ws.assignment.schedule,
          assignedAt: ws.assignment.assignedAt.toISOString(),
        }
      : null,
  }));

  // Fetch approved teachers for the assign dropdown
  const teachersRaw = await prisma.teacherProfile.findMany({
    where: { registrationStatus: RegistrationStatus.APPROVED },
    orderBy: { realFullName: 'asc' },
    select: { id: true, displayName: true, realFullName: true, projectType: true },
  });

  const availableTeachers: AvailableTeacher[] = teachersRaw.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    realFullName: t.realFullName,
    projectType: t.projectType,
  }));

  return (
    <div>
      <SeatingManagementDesk
        initialWorkstations={workstations}
        availableTeachers={availableTeachers}
      />
    </div>
  );
}

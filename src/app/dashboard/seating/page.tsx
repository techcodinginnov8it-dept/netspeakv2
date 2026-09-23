import { requireAuth, hasPermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import TeacherSeatView from '@/components/seating/TeacherSeatView';
import type { TeacherSeatInfo } from '@/actions/seating';
import { SeatStatus } from '@prisma/client';

export const metadata = {
  title: 'My Seat Assignment — Netspeak Portal',
};

export default async function SeatingPage() {
  const user = await requireAuth();

  // Admins and managers go straight to management desk
  if (hasPermission(user, 'seating:manage')) {
    redirect('/dashboard/seating/manage');
  }

  // Teacher: find their current assignment
  const teacher = await prisma.teacherProfile.findFirst({
    where: { userId: user.id },
  });

  let seat: TeacherSeatInfo | undefined;

  if (teacher) {
    const assignment = await prisma.seatingAssignment.findFirst({
      where: { teacherId: teacher.id, unassignedAt: null },
      include: { workstation: true },
    });

    if (assignment) {
      seat = {
        workstationNo: assignment.workstation.workstationNo,
        seatNo: assignment.workstation.seatNo,
        branch: assignment.workstation.branch,
        schedule: assignment.schedule,
        status: assignment.workstation.status as SeatStatus,
        assignedAt: assignment.assignedAt.toISOString(),
      };
    }
  }

  return (
    <div>
      <TeacherSeatView seat={seat} />
    </div>
  );
}

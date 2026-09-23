import { requirePermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import ManagementDashboard, { ManagementDashboardData } from '@/components/management/ManagementDashboard';
import { IncidentStatus, ResignationWorkflowStatus, SeatStatus, TicketStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function ManagementDashboardPage() {
  await requirePermission('management:dashboard');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Batch 1: Teacher profiles, attendance, daily outputs
  const [
    totalTeachers,
    approvedTeachers,
    pendingTeachers,
    attendancesToday,
    outputsToday,
    teachersByProject,
    teachersByDepartment,
  ] = await Promise.all([
    prisma.teacherProfile.count(),
    prisma.teacherProfile.count({ where: { registrationStatus: 'APPROVED' } }),
    prisma.teacherProfile.count({ where: { registrationStatus: 'PENDING' } }),
    prisma.teacherAttendance.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      select: { status: true },
    }),
    prisma.dailyOutput.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      select: { bookedSlots: true, openSlots: true },
    }),
    prisma.teacherProfile.groupBy({ by: ['projectType'], _count: { id: true } }),
    prisma.teacherProfile.groupBy({ by: ['department'], _count: { id: true } }),
  ]);

  // Batch 2: Resignations & Onboarding
  const [
    pendingResignations,
    approvedResignations,
    completedResignations,
    monthResignations,
    allResignations,
    totalNewHires,
    inProgressNewHires,
    completedNewHires,
    slotsEligibleNewHires,
    overdueNewHires,
  ] = await Promise.all([
    prisma.teacherResignation.count({ where: { status: 'SUBMITTED' } }),
    prisma.teacherResignation.count({
      where: { status: { in: ['UNDER_REVIEW', 'EXIT_INTERVIEW_SCHEDULED', 'EXIT_INTERVIEW_COMPLETED', 'IT_CLEARANCE_PENDING'] as ResignationWorkflowStatus[] } },
    }),
    prisma.teacherResignation.count({ where: { status: 'DEACTIVATED' } }),
    prisma.teacherResignation.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.teacherResignation.findMany({
      select: {
        reason: true,
        branch: true,
      },
    }),
    prisma.newHireRecord.count(),
    prisma.newHireRecord.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.newHireRecord.count({ where: { status: 'COMPLETED' } }),
    prisma.newHireRecord.count({ where: { status: 'SLOTS_ELIGIBLE' } }),
    prisma.newHireRecord.count({ where: { status: 'OVERDUE' } }),
  ]);

  // Batch 3: Concerns, Incidents & Workstations
  const [
    openConcernTickets,
    resolvedConcernTickets,
    totalConcernTickets,
    openIncidents,
    resolvedIncidents,
    totalIncidents,
    concernsByCategory,
    totalWorkstations,
    occupiedWorkstations,
    availableWorkstations,
    pendingReformatWorkstations,
  ] = await Promise.all([
    prisma.teacherConcernTicket.count({
      where: { status: { in: ['SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW'] as TicketStatus[] } },
    }),
    prisma.teacherConcernTicket.count({
      where: { status: { in: ['RESOLVED', 'CLOSED'] as TicketStatus[] } },
    }),
    prisma.teacherConcernTicket.count(),
    prisma.incidentReportTicket.count({
      where: { status: { in: ['REPORTED', 'INVESTIGATING'] as IncidentStatus[] } },
    }),
    prisma.incidentReportTicket.count({
      where: { status: { in: ['RESOLVED'] as IncidentStatus[] } },
    }),
    prisma.incidentReportTicket.count(),
    prisma.teacherConcernTicket.groupBy({ by: ['category'], _count: { id: true } }),
    prisma.workstation.count(),
    prisma.workstation.count({ where: { status: 'OCCUPIED' as SeatStatus } }),
    prisma.workstation.count({ where: { status: 'AVAILABLE' as SeatStatus } }),
    prisma.workstation.count({ where: { status: { in: ['PENDING_REFORMAT', 'UNDER_REFORMAT'] as SeatStatus[] } } }),
  ]);

  // Aggregate attendance
  const presentCount = attendancesToday.filter((a) =>
    ['PRESENT', 'EARLY_OUT'].includes(a.status)
  ).length;
  const lateCount = attendancesToday.filter((a) => a.status === 'LATE').length;
  const absentCount = attendancesToday.filter((a) =>
    ['ABSENT_VALID', 'ABSENT_INVALID'].includes(a.status)
  ).length;

  // Aggregate output — bookedSlots = total scheduled classes, use as proxy for classes conducted
  const totalClassesToday = outputsToday.reduce((sum, o) => sum + (o.bookedSlots ?? 0), 0);
  const totalOpenSlots = outputsToday.reduce((sum, o) => sum + (o.openSlots ?? 0), 0);

  // Aggregate resignation reasons
  const reasonMap: Record<string, number> = {};
  const resBranchMap: Record<string, number> = {};
  for (const r of allResignations) {
    const reasonKey = r.reason as string;
    reasonMap[reasonKey] = (reasonMap[reasonKey] ?? 0) + 1;
    const br = r.branch || 'Unassigned';
    resBranchMap[br] = (resBranchMap[br] ?? 0) + 1;
  }
  const topReasons = Object.entries(reasonMap)
    .map(([reason, count]) => ({ reason: reason.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const resBranchBreakdown = Object.entries(resBranchMap)
    .map(([branch, count]) => ({ branch, count }))
    .sort((a, b) => b.count - a.count);

  const data: ManagementDashboardData = {
    teacherStats: {
      totalTeachers,
      activeTeachers: approvedTeachers,
      onLeaveTeachers: pendingTeachers,
      resignedTeachers: completedResignations,
      branchBreakdown: resBranchBreakdown.length > 0
        ? resBranchBreakdown
        : [{ branch: 'No resignation data', count: 0 }],
      projectBreakdown: teachersByProject.map((p) => ({
        project: String(p.projectType),
        count: p._count.id,
      })),
    },
    operationsToday: {
      presentCount,
      lateCount,
      absentCount,
      totalAttendanceToday: attendancesToday.length,
      totalClassesToday,
      totalRegularDoneToday: totalClassesToday,
      totalTrialDoneToday: totalOpenSlots,
    },
    resignationStats: {
      pendingCount: pendingResignations,
      approvedCount: approvedResignations,
      completedCount: completedResignations,
      totalThisMonth: monthResignations,
      topReasons,
      branchBreakdown: resBranchBreakdown,
    },
    onboardingStats: {
      total: totalNewHires,
      inProgress: inProgressNewHires,
      completed: completedNewHires,
      slotsEligible: slotsEligibleNewHires,
      overdue: overdueNewHires,
    },
    concernStats: {
      openTickets: openConcernTickets,
      resolvedTickets: resolvedConcernTickets,
      totalTickets: totalConcernTickets,
      openIncidents,
      resolvedIncidents,
      totalIncidents,
      byCategory: concernsByCategory.map((c) => ({
        category: String(c.category).replace(/_/g, ' '),
        count: c._count.id,
      })),
    },
    seatingStats: {
      totalWorkstations,
      occupiedWorkstations,
      availableWorkstations,
      maintenanceWorkstations: pendingReformatWorkstations,
    },
  };

  return (
    <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '1rem 0' }}>
      <ManagementDashboard data={data} />
    </div>
  );
}

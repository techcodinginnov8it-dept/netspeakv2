import { requirePermission } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import ManagementDashboard from '@/components/management/ManagementDashboard';
import type { ManagementDashboardData } from '@/types/management';
import { IncidentStatus, ResignationWorkflowStatus, SeatStatus, TicketStatus } from '@prisma/client';
import { getLowBookingIntelligenceAction } from '@/actions/intelligence';

export const dynamic = 'force-dynamic';

export default async function ManagementDashboardPage() {
  await requirePermission('management:dashboard');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Single consolidated parallel fetch with groupBy aggregations (replaces 30+ separate queries across 4 sequential stages)
  const [
    teacherProfileGroups,
    attendancesToday,
    outputsToday,
    teachersByProject,
    teachersByDepartment,
    teachersByBranch,
    resignationGroups,
    monthResignations,
    allResignations,
    newHireGroups,
    lowBookingTeachers,
    concernGroups,
    concernsByCategory,
    incidentGroups,
    workstationGroups,
  ] = await Promise.all([
    prisma.teacherProfile.groupBy({
      by: ['registrationStatus'],
      _count: { id: true },
    }),
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
    prisma.teacherProfile.groupBy({ by: ['branch'], _count: { id: true } }),
    // Resignation status grouping
    prisma.teacherResignation.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.teacherResignation.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.teacherResignation.findMany({
      select: { reason: true, branch: true },
    }),
    // New hire status grouping
    prisma.newHireRecord.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    getLowBookingIntelligenceAction().catch(() => []),
    // Concerns grouping
    prisma.teacherConcernTicket.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.teacherConcernTicket.groupBy({ by: ['category'], _count: { id: true } }),
    // Incident grouping
    prisma.incidentReportTicket.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    // Workstations grouping
    prisma.workstation.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  // Derive teacher counts
  let totalTeachers = 0;
  let approvedTeachers = 0;
  let pendingTeachers = 0;
  for (const t of teacherProfileGroups) {
    const c = t._count.id;
    totalTeachers += c;
    if (t.registrationStatus === 'APPROVED') approvedTeachers += c;
    else if (t.registrationStatus === 'PENDING') pendingTeachers += c;
  }

  // Derive resignation counts
  let pendingResignations = 0;
  let approvedResignations = 0;
  let completedResignations = 0;
  for (const r of resignationGroups) {
    const c = r._count.id;
    if (r.status === 'SUBMITTED') pendingResignations += c;
    else if (['UNDER_REVIEW', 'EXIT_INTERVIEW_SCHEDULED', 'EXIT_INTERVIEW_COMPLETED', 'IT_CLEARANCE_PENDING'].includes(r.status)) {
      approvedResignations += c;
    } else if (r.status === 'DEACTIVATED') {
      completedResignations += c;
    }
  }

  // Derive new hire counts
  let totalNewHires = 0;
  let inProgressNewHires = 0;
  let completedNewHires = 0;
  let slotsEligibleNewHires = 0;
  let overdueNewHires = 0;
  for (const nh of newHireGroups) {
    const c = nh._count.id;
    totalNewHires += c;
    if (nh.status === 'IN_PROGRESS') inProgressNewHires += c;
    else if (nh.status === 'COMPLETED') completedNewHires += c;
    else if (nh.status === 'SLOTS_ELIGIBLE') slotsEligibleNewHires += c;
    else if (nh.status === 'OVERDUE') overdueNewHires += c;
  }

  // Derive concern counts
  let openConcernTickets = 0;
  let resolvedConcernTickets = 0;
  let totalConcernTickets = 0;
  for (const ct of concernGroups) {
    const c = ct._count.id;
    totalConcernTickets += c;
    if (['SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW'].includes(ct.status)) openConcernTickets += c;
    else if (['RESOLVED', 'CLOSED'].includes(ct.status)) resolvedConcernTickets += c;
  }

  // Derive incident counts
  let openIncidents = 0;
  let resolvedIncidents = 0;
  let totalIncidents = 0;
  for (const inc of incidentGroups) {
    const c = inc._count.id;
    totalIncidents += c;
    if (['REPORTED', 'INVESTIGATING'].includes(inc.status)) openIncidents += c;
    else if (inc.status === 'RESOLVED') resolvedIncidents += c;
  }

  // Derive workstation counts
  let totalWorkstations = 0;
  let occupiedWorkstations = 0;
  let availableWorkstations = 0;
  let pendingReformatWorkstations = 0;
  for (const ws of workstationGroups) {
    const c = ws._count.id;
    totalWorkstations += c;
    if (ws.status === 'OCCUPIED') occupiedWorkstations += c;
    else if (ws.status === 'AVAILABLE') availableWorkstations += c;
    else if (['PENDING_REFORMAT', 'UNDER_REFORMAT'].includes(ws.status)) pendingReformatWorkstations += c;
  }

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
      branchBreakdown: teachersByBranch
        .map((b) => ({ branch: b.branch ?? 'Unassigned', count: b._count.id }))
        .sort((a, b) => b.count - a.count),
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
    lowBookingTeachers,
  };

  return (
    <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '1rem 0' }}>
      <ManagementDashboard data={data} />
    </div>
  );
}

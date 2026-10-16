import React from 'react';
import { requireAuth, requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import { resolveBranchFilter, getActiveBranches } from '@/lib/branches';
import DailyOutputManagementDesk from '@/components/output/DailyOutputManagementDesk';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Daily Output Reports & Analytics | Netspeak Portal',
};

export default async function DailyOutputPage() {
  await requirePermission(PERMISSIONS.OUTPUT_READ);
  const user = await requireAuth();

  const branchFilter = resolveBranchFilter(user);
  const branches = await getActiveBranches();

  // Query outputs and active teachers in parallel
  const [outputs, activeTeachers] = await Promise.all([
    prisma.dailyOutput.findMany({
      where: {
        teacher: branchFilter,
      },
      orderBy: { date: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            displayName: true,
            realFullName: true,
            department: true,
            projectType: true,
            branch: true,
            portalUsername: true,
          },
        },
      },
      take: 200,
    }),
    prisma.teacherProfile.findMany({
      where: {
        registrationStatus: 'APPROVED',
        ...branchFilter,
      },
      select: {
        id: true,
        displayName: true,
        realFullName: true,
        department: true,
        projectType: true,
        branch: true,
      },
      orderBy: { displayName: 'asc' },
    }),
  ]);

  const serializedOutputs = outputs.map((o) => ({
    id: o.id,
    date: o.date.toISOString(),
    openSlots: o.openSlots,
    bookedSlots: o.bookedSlots,
    classTardiness: o.classTardiness,
    absentClasses: o.absentClasses,
    earlyLeaveClasses: o.earlyLeaveClasses,
    remarks: o.remarks,
    createdAt: o.createdAt.toISOString(),
    teacher: {
      id: o.teacher.id,
      displayName: o.teacher.displayName,
      realFullName: o.teacher.realFullName,
      department: o.teacher.department,
      projectType: o.teacher.projectType,
      branch: o.teacher.branch,
      portalUsername: o.teacher.portalUsername,
    },
  }));

  const serializedTeachers = activeTeachers.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    realFullName: t.realFullName,
    department: t.department,
    projectType: t.projectType,
    branch: t.branch,
  }));

  const serializedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <DailyOutputManagementDesk
      initialOutputs={serializedOutputs}
      teachers={serializedTeachers}
      branches={serializedBranches}
      userRoles={user.roles}
      userBranch={user.branch}
    />
  );
}

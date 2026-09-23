import React from 'react';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import SimulationManager from '@/components/operations/SimulationManager';

export default async function SimulationsPage() {
  await requirePermission(PERMISSIONS.SIMULATIONS_MANAGE);

  const drills = await prisma.simulationDrill.findMany({
    orderBy: { scheduledDate: 'asc' },
  });

  const serialized = drills.map((d: any) => ({
    id: d.id,
    title: d.title,
    drillType: d.drillType,
    scheduledDate: d.scheduledDate.toISOString(),
    status: d.status,
    responsibleOfficer: d.responsibleOfficer,
    branch: d.branch,
    attendanceCount: d.attendanceCount,
    issuesFound: d.issuesFound,
    remarks: d.remarks,
    completedAt: d.completedAt ? d.completedAt.toISOString() : null,
  }));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          Contingency &amp; Simulation Drills Hub
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Scheduled drills for Internet failover, Power outage, Genset operations, and emergency readiness.
        </p>
      </div>

      <SimulationManager simulations={serialized} />
    </div>
  );
}

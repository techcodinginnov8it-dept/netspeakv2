'use server';

import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SimulationType, SimulationStatus } from '@prisma/client';

/**
 * Calculates the 1st and 3rd Saturday of a given month
 */
function getFirstAndThirdSaturdays(year: number, monthIndex: number): Date[] {
  const saturdays: Date[] = [];
  const date = new Date(year, monthIndex, 1);

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === 6) {
      // 6 = Saturday
      saturdays.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }

  const result: Date[] = [];
  if (saturdays[0]) result.push(saturdays[0]); // 1st Saturday
  if (saturdays[2]) result.push(saturdays[2]); // 3rd Saturday
  return result;
}

/**
 * Generates automated schedule slots for simulations (§32)
 */
export async function generateUpcomingSimulationSlotsAction() {
  await requirePermission(PERMISSIONS.SIMULATIONS_MANAGE);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Generate for current month and next month
  const targetDates = [
    ...getFirstAndThirdSaturdays(currentYear, currentMonth),
    ...getFirstAndThirdSaturdays(currentMonth === 11 ? currentYear + 1 : currentYear, (currentMonth + 1) % 12),
  ];

  const createdDrills = [];
  const drillTypes: SimulationType[] = [
    SimulationType.GENSET_OPERATION,
    SimulationType.INTERNET_OUTAGE,
    SimulationType.POWER_OUTAGE,
    SimulationType.BACKUP_INTERNET,
    SimulationType.EMERGENCY_PROCEDURES,
  ];

  let typeIdx = 0;
  for (const sDate of targetDates) {
    // Check if drill already scheduled on this exact date
    const startOfDay = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
    const endOfDay = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 23, 59, 59);

    const existing = await prisma.simulationDrill.findFirst({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!existing) {
      const drillType = drillTypes[typeIdx % drillTypes.length];
      const title = `${drillType.replace(/_/g, ' ')} Drill (${sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;

      const drill = await prisma.simulationDrill.create({
        data: {
          title,
          drillType,
          scheduledDate: sDate,
          status: SimulationStatus.SCHEDULED,
          responsibleOfficer: 'Center IT & Admin On-Duty',
          branch: 'Main Branch',
        },
      });
      createdDrills.push(drill);
      typeIdx++;
    }
  }

  revalidatePath('/dashboard/simulations');
  return { success: true, count: createdDrills.length };
}

/**
 * Create a new custom simulation drill (§32)
 */
const createDrillSchema = z.object({
  title: z.string().min(3),
  drillType: z.nativeEnum(SimulationType),
  scheduledDate: z.string(),
  responsibleOfficer: z.string().min(2),
  branch: z.string().default('Main Branch'),
});

export async function createSimulationDrillAction(data: z.infer<typeof createDrillSchema>) {
  await requirePermission(PERMISSIONS.SIMULATIONS_MANAGE);
  const parsed = createDrillSchema.parse(data);

  const drill = await prisma.simulationDrill.create({
    data: {
      title: parsed.title,
      drillType: parsed.drillType,
      scheduledDate: new Date(parsed.scheduledDate),
      responsibleOfficer: parsed.responsibleOfficer,
      branch: parsed.branch,
      status: SimulationStatus.SCHEDULED,
    },
  });

  revalidatePath('/dashboard/simulations');
  return { success: true, drill };
}

/**
 * Record drill results, completion, issues and remarks (§32)
 */
const recordDrillResultSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(SimulationStatus),
  attendanceCount: z.number().int().min(0),
  issuesFound: z.string().optional(),
  remarks: z.string().optional(),
});

export async function recordSimulationResultAction(data: z.infer<typeof recordDrillResultSchema>) {
  await requirePermission(PERMISSIONS.SIMULATIONS_MANAGE);
  const parsed = recordDrillResultSchema.parse(data);

  const now = new Date();
  const drill = await prisma.simulationDrill.update({
    where: { id: parsed.id },
    data: {
      status: parsed.status,
      attendanceCount: parsed.attendanceCount,
      issuesFound: parsed.issuesFound || null,
      remarks: parsed.remarks || null,
      completedAt: parsed.status === SimulationStatus.COMPLETED ? now : null,
    },
  });

  revalidatePath('/dashboard/simulations');
  return { success: true, drill };
}

'use server';

import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/rbac';
import { resolveBranchFilter } from '@/lib/branches';

export type LowBookingTeacher = {
  teacherId: string;
  realFullName: string;
  displayName: string;
  branch: string | null;
  projectType: string;
  department: string;
  consecutiveLowDays: number;
  averageBookingRate: number;
  lastBookedSlots: number;
  lastOpenSlots: number;
  severity: 'DAILY' | 'URGENT' | 'CRITICAL';
  recommendedAction: string;
};

/**
 * Low-Booking Intelligence
 * Scans the last 5 days of DailyOutputs for active teachers:
 * - 1 Day Under Target: TPCAP Profile Upgrade recommended
 * - 3 Consecutive Days Under Target: Marked URGENT for manager intervention
 * - 5 Consecutive Days Under Target: Marked CRITICAL for immediate corrective action
 */
export async function getLowBookingIntelligenceAction(): Promise<LowBookingTeacher[]> {
  const user = await requireAuth();
  const branchFilter = resolveBranchFilter(user);

  const activeTeachers = await prisma.teacherProfile.findMany({
    where: {
      registrationStatus: 'APPROVED',
      ...branchFilter,
    },
    include: {
      dailyOutputs: {
        orderBy: { date: 'desc' },
        take: 5,
      },
    },
  });

  const lowBookingList: LowBookingTeacher[] = [];

  for (const teacher of activeTeachers) {
    const outputs = teacher.dailyOutputs;
    if (!outputs || outputs.length === 0) continue;

    // Check consecutive low booking from most recent day backwards
    let consecutiveLow = 0;
    let totalBooked = 0;
    let totalOpen = 0;

    for (const output of outputs) {
      const open = output.openSlots || 0;
      const booked = output.bookedSlots || 0;
      totalBooked += booked;
      totalOpen += open;

      const bookingRate = open > 0 ? (booked / open) * 100 : 0;

      // Threshold: Under 50% booking rate OR fewer than 10 booked slots on a regular shift
      if (open >= 10 && (bookingRate < 50 || booked < 6)) {
        consecutiveLow++;
      } else {
        break; // streak is broken
      }
    }

    if (consecutiveLow > 0) {
      const avgRate = totalOpen > 0 ? Math.round((totalBooked / totalOpen) * 100) : 0;
      let severity: 'DAILY' | 'URGENT' | 'CRITICAL' = 'DAILY';
      let action = 'Admin requests TPCAP profile upgrade';

      if (consecutiveLow >= 5) {
        severity = 'CRITICAL';
        action = 'Immediate corrective intervention & schedule review';
      } else if (consecutiveLow >= 3) {
        severity = 'URGENT';
        action = 'Manager outreach & student booking assistance';
      }

      lowBookingList.push({
        teacherId: teacher.id,
        realFullName: teacher.realFullName,
        displayName: teacher.displayName,
        branch: teacher.branch,
        projectType: teacher.projectType,
        department: teacher.department,
        consecutiveLowDays: consecutiveLow,
        averageBookingRate: avgRate,
        lastBookedSlots: outputs[0].bookedSlots || 0,
        lastOpenSlots: outputs[0].openSlots || 0,
        severity,
        recommendedAction: action,
      });
    }
  }

  // Sort by highest consecutive days descending
  lowBookingList.sort((a, b) => b.consecutiveLowDays - a.consecutiveLowDays);
  return lowBookingList;
}

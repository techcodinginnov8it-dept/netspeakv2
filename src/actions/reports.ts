'use server';

import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/auth/rbac';
import { ProjectType, Department, AttendanceStatus } from '@prisma/client';

export interface CutOffFilterParams {
  startDate: string; // ISO string or YYYY-MM-DD
  endDate: string;   // ISO string or YYYY-MM-DD
  projectType?: string;
  department?: string;
  teacherId?: string;
}

export interface TeacherCutOffRow {
  teacherId: string;
  teacherName: string;
  realFullName: string;
  projectType: string;
  department: string;
  assignedRestDay: string;
  // Metrics in this cut-off window:
  totalDaysRecorded: number;
  presentDays: number;
  lateDays: number;
  earlyOutDays: number;
  absentDays: number;
  srdDays: number;
  noLogoutDays: number;
  totalLateMinutes: number;
  // Slot metrics from DailyOutput:
  totalSlotsRendered: number;
  totalClassesFinished: number;
  totalCancellations: number;
  unexcusedAbsencePenaltyPhp: number;
  noLogoutPenaltyPhp: number;
  netEstimatedPenaltyPhp: number;
}

export interface CutOffReportData {
  periodLabel: string;
  startDate: string;
  endDate: string;
  summary: {
    totalTeachers: number;
    totalSlotsRendered: number;
    totalPresentDays: number;
    totalLateDays: number;
    totalAbsentDays: number;
    totalSrdDays: number;
    totalLateMinutes: number;
    totalPenaltiesPhp: number;
  };
  rows: TeacherCutOffRow[];
}

/**
 * Generates consolidated Teacher Cut-Off / Operational Report (§22, §29-30)
 */
export async function getCutOffReportAction(params: CutOffFilterParams): Promise<{ success: boolean; data?: CutOffReportData; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);

    const start = new Date(params.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch penalty settings
    const penaltyAbsenceSetting = await prisma.systemSetting.findUnique({
      where: { key: 'PENALTY_INVALID_ABSENCE_PHP' },
    });
    const penaltyNoLogoutSetting = await prisma.systemSetting.findUnique({
      where: { key: 'PENALTY_NO_LOGOUT_PHP' },
    });

    const penaltyPerAbsence = penaltyAbsenceSetting ? parseFloat(penaltyAbsenceSetting.value) || 500 : 500;
    const penaltyPerNoLogout = penaltyNoLogoutSetting ? parseFloat(penaltyNoLogoutSetting.value) || 150 : 150;

    // Filter teachers
    const whereTeacher: any = {
      registrationStatus: 'APPROVED',
    };

    if (params.projectType && params.projectType !== 'ALL') {
      whereTeacher.projectType = params.projectType as ProjectType;
    }
    if (params.department && params.department !== 'ALL') {
      whereTeacher.department = params.department as Department;
    }
    if (params.teacherId && params.teacherId !== 'ALL') {
      whereTeacher.id = params.teacherId;
    }

    const teachers = await prisma.teacherProfile.findMany({
      where: whereTeacher,
      include: {
        attendances: {
          where: {
            date: { gte: start, lte: end },
          },
        },
        dailyOutputs: {
          where: {
            date: { gte: start, lte: end },
          },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    const rows: TeacherCutOffRow[] = teachers.map((t) => {
      let presentDays = 0;
      let lateDays = 0;
      let earlyOutDays = 0;
      let absentDays = 0;
      let srdDays = 0;
      let noLogoutDays = 0;
      let totalLateMinutes = 0;

      for (const att of t.attendances) {
        if (att.status === AttendanceStatus.PRESENT) presentDays++;
        if (att.status === AttendanceStatus.LATE) {
          lateDays++;
          totalLateMinutes += att.lateMinutes || 0;
        }
        if (att.status === AttendanceStatus.EARLY_OUT) earlyOutDays++;
        if (att.status === AttendanceStatus.ABSENT_INVALID || att.status === AttendanceStatus.ABSENT_VALID) absentDays++;
        if (att.status === AttendanceStatus.SRD) srdDays++;
        if (att.status === AttendanceStatus.NO_LOGOUT) noLogoutDays++;
      }

      let totalSlotsRendered = 0;
      let totalClassesFinished = 0;
      let totalCancellations = 0;

      for (const output of t.dailyOutputs) {
        totalSlotsRendered += output.openSlots || 0;
        totalClassesFinished += output.bookedSlots || 0;
        totalCancellations += output.absentClasses || 0;
      }

      const unexcusedAbsencePenaltyPhp = absentDays * penaltyPerAbsence;
      const noLogoutPenaltyPhp = noLogoutDays * penaltyPerNoLogout;
      const netEstimatedPenaltyPhp = unexcusedAbsencePenaltyPhp + noLogoutPenaltyPhp;

      return {
        teacherId: t.id,
        teacherName: t.displayName,
        realFullName: t.realFullName,
        projectType: t.projectType,
        department: t.department,
        assignedRestDay: t.assignedRestDay,
        totalDaysRecorded: t.attendances.length,
        presentDays,
        lateDays,
        earlyOutDays,
        absentDays,
        srdDays,
        noLogoutDays,
        totalLateMinutes,
        totalSlotsRendered,
        totalClassesFinished,
        totalCancellations,
        unexcusedAbsencePenaltyPhp,
        noLogoutPenaltyPhp,
        netEstimatedPenaltyPhp,
      };
    });

    const summary = {
      totalTeachers: rows.length,
      totalSlotsRendered: rows.reduce((acc, r) => acc + r.totalSlotsRendered, 0),
      totalPresentDays: rows.reduce((acc, r) => acc + r.presentDays, 0),
      totalLateDays: rows.reduce((acc, r) => acc + r.lateDays, 0),
      totalAbsentDays: rows.reduce((acc, r) => acc + r.absentDays, 0),
      totalSrdDays: rows.reduce((acc, r) => acc + r.srdDays, 0),
      totalLateMinutes: rows.reduce((acc, r) => acc + r.totalLateMinutes, 0),
      totalPenaltiesPhp: rows.reduce((acc, r) => acc + r.netEstimatedPenaltyPhp, 0),
    };

    const periodLabel = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

    return {
      success: true,
      data: {
        periodLabel,
        startDate: params.startDate,
        endDate: params.endDate,
        summary,
        rows,
      },
    };
  } catch (error: any) {
    console.error('getCutOffReportAction error:', error);
    return { success: false, error: error.message || 'Failed to generate cut-off report' };
  }
}

export interface StaffOperationsReportRow {
  staffId: string;
  name: string;
  roleType: string;
  branch: string;
  department: string;
  totalShifts: number;
  presentShifts: number;
  lateShifts: number;
  absentShifts: number;
  completedChecklists: number;
  complianceRatePercent: number;
  totalLateMinutes: number;
}

/**
 * Generates Admin & IT Staff Operations and Checklist Compliance Report (§31)
 */
export async function getStaffOperationsReportAction(params: { startDate: string; endDate: string; roleType?: string }): Promise<{ success: boolean; data?: StaffOperationsReportRow[]; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.REPORTS_VIEW);

    const start = new Date(params.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);

    const whereStaff: any = {};
    if (params.roleType && params.roleType !== 'ALL') {
      whereStaff.roleType = params.roleType;
    }

    const staffProfiles = await prisma.staffProfile.findMany({
      where: whereStaff,
      include: {
        user: true,
        attendances: {
          where: {
            date: { gte: start, lte: end },
          },
        },
      },
      orderBy: { roleType: 'asc' },
    });

    const rows: StaffOperationsReportRow[] = staffProfiles.map((s) => {
      let presentShifts = 0;
      let lateShifts = 0;
      let absentShifts = 0;
      let completedChecklists = 0;
      let totalLateMinutes = 0;

      for (const att of s.attendances) {
        if (att.status === 'PRESENT') presentShifts++;
        if (att.status === 'LATE') {
          lateShifts++;
          totalLateMinutes += att.lateMinutes || 0;
        }
        if (att.status === 'ABSENT') absentShifts++;
        if (att.isChecklistComplete) completedChecklists++;
      }

      const totalShifts = s.attendances.length;
      const complianceRatePercent = totalShifts > 0 ? Math.round((completedChecklists / totalShifts) * 100) : 100;

      return {
        staffId: s.id,
        name: s.user.fullName,
        roleType: s.roleType,
        branch: s.branch,
        department: s.department,
        totalShifts,
        presentShifts,
        lateShifts,
        absentShifts,
        completedChecklists,
        complianceRatePercent,
        totalLateMinutes,
      };
    });

    return { success: true, data: rows };
  } catch (error: any) {
    console.error('getStaffOperationsReportAction error:', error);
    return { success: false, error: error.message || 'Failed to generate staff report' };
  }
}

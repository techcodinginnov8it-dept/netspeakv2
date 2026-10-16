/**
 * Shared types for the Management Dashboard.
 * Kept in a plain module (no 'use client' / 'use server') so both
 * the server page and the client component can import them safely.
 */

export type ManagementDashboardData = {
  // Teacher Overview
  teacherStats: {
    totalTeachers: number;
    activeTeachers: number;
    onLeaveTeachers: number;
    resignedTeachers: number;
    branchBreakdown: { branch: string; count: number }[];
    projectBreakdown: { project: string; count: number }[];
  };
  // Today Attendance & Daily Output
  operationsToday: {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    totalAttendanceToday: number;
    totalClassesToday: number;
    totalRegularDoneToday: number;
    totalTrialDoneToday: number;
  };
  // Resignation & Attrition
  resignationStats: {
    pendingCount: number;
    approvedCount: number;
    completedCount: number;
    totalThisMonth: number;
    topReasons: { reason: string; count: number }[];
    branchBreakdown: { branch: string; count: number }[];
  };
  // Onboarding Pipeline
  onboardingStats: {
    total: number;
    inProgress: number;
    completed: number;
    slotsEligible: number;
    overdue: number;
  };
  // Tickets & Incidents
  concernStats: {
    openTickets: number;
    resolvedTickets: number;
    totalTickets: number;
    openIncidents: number;
    resolvedIncidents: number;
    totalIncidents: number;
    byCategory: { category: string; count: number }[];
  };
  // Workstation / Seating
  seatingStats: {
    totalWorkstations: number;
    occupiedWorkstations: number;
    availableWorkstations: number;
    maintenanceWorkstations: number;
  };
  // Low-Booking Intelligence
  lowBookingTeachers?: {
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
  }[];
};

'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  CutOffReportData,
  TeacherCutOffRow,
  StaffOperationsReportRow,
  getCutOffReportAction,
  getStaffOperationsReportAction,
} from '@/actions/reports';
import LessonFeeSyncDesk from './LessonFeeSyncDesk';

interface Props {
  initialReportData: CutOffReportData | null;
  initialStaffData: StaffOperationsReportRow[];
  defaultStartDate: string;
  defaultEndDate: string;
}

type TabType = 'TEACHER_CUTOFF' | 'STAFF_OPERATIONS' | 'LESSON_SYNC';
type PresetType = 'CURRENT_CUTOFF' | 'PREVIOUS_CUTOFF' | 'THIS_MONTH' | 'CUSTOM';

const BRANCH_OPTIONS = [
  'ALL',
  'Main Branch',
  'Atimonan',
  'Lopez',
  'Sto. Tomas',
  'Mauban',
  'San Pablo',
  'Gumaca',
];

export default function CutOffReportsView({
  initialReportData,
  initialStaffData,
  defaultStartDate,
  defaultEndDate,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('TEACHER_CUTOFF');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [activePreset, setActivePreset] = useState<PresetType>('CURRENT_CUTOFF');

  // Teacher-specific filters
  const [projectType, setProjectType] = useState<string>('ALL');
  const [department, setDepartment] = useState<string>('ALL');
  const [teacherExceptionFilter, setTeacherExceptionFilter] = useState<string>('ALL');

  // Staff-specific filters
  const [staffRole, setStaffRole] = useState<string>('ALL');
  const [staffBranch, setStaffBranch] = useState<string>('ALL');
  const [staffDept, setStaffDept] = useState<string>('ALL');
  const [staffComplianceFilter, setStaffComplianceFilter] = useState<string>('ALL');

  // Universal search & data states
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState<CutOffReportData | null>(initialReportData);
  const [staffData, setStaffData] = useState<StaffOperationsReportRow[]>(initialStaffData);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Helper: Format local date to YYYY-MM-DD
  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Preset quick date filters with local/Manila calendar boundaries
  const handleSetPreset = (preset: 'CURRENT_CUTOFF' | 'PREVIOUS_CUTOFF' | 'THIS_MONTH') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();

    let start: Date;
    let end: Date;

    if (preset === 'CURRENT_CUTOFF') {
      if (day <= 15) {
        start = new Date(year, month, 1);
        end = new Date(year, month, 15);
      } else {
        start = new Date(year, month, 16);
        end = new Date(year, month + 1, 0); // Last day of month
      }
    } else if (preset === 'PREVIOUS_CUTOFF') {
      if (day <= 15) {
        // Previous month 16th to last day
        start = new Date(year, month - 1, 16);
        end = new Date(year, month, 0);
      } else {
        // Current month 1st to 15th
        start = new Date(year, month, 1);
        end = new Date(year, month, 15);
      }
    } else {
      // THIS_MONTH
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
    }

    const startStr = formatYMD(start);
    const endStr = formatYMD(end);
    setStartDate(startStr);
    setEndDate(endStr);
    setActivePreset(preset);

    fetchData(startStr, endStr, projectType, department, staffRole, staffBranch, staffDept);
  };

  const fetchData = (
    s: string,
    e: string,
    proj: string,
    dept: string,
    role: string,
    branch: string,
    sDept: string
  ) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const [teacherRes, staffRes] = await Promise.all([
          getCutOffReportAction({
            startDate: s,
            endDate: e,
            projectType: proj,
            department: dept,
          }),
          getStaffOperationsReportAction({
            startDate: s,
            endDate: e,
            roleType: role,
            branch: branch,
            department: sDept,
          }),
        ]);

        let hasError = false;
        let errMsg = '';

        if (teacherRes.success && teacherRes.data) {
          setReportData(teacherRes.data);
        } else if (teacherRes.error) {
          hasError = true;
          errMsg = teacherRes.error;
        }

        if (staffRes.success && staffRes.data) {
          setStaffData(staffRes.data);
        } else if (staffRes.error && !hasError) {
          hasError = true;
          errMsg = staffRes.error;
        }

        if (hasError) {
          setFeedback({
            type: 'error',
            text: `Failed to load cut-off data: ${errMsg}`,
          });
        } else {
          setFeedback({
            type: 'success',
            text: `Data successfully synchronized for period ${s} to ${e}.`,
          });
          setTimeout(() => setFeedback(null), 4000);
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: err.message || 'An unexpected error occurred while fetching reports.',
        });
      }
    });
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setActivePreset('CUSTOM');
    fetchData(startDate, endDate, projectType, department, staffRole, staffBranch, staffDept);
  };

  // Client-side filtered Teachers
  const filteredTeachers = useMemo(() => {
    return (reportData?.rows || []).filter((r) => {
      // Project filter
      if (projectType !== 'ALL' && r.projectType !== projectType) return false;

      // Department filter
      if (department !== 'ALL' && r.department !== department) return false;

      // Exception / Health filter
      if (teacherExceptionFilter === 'WITH_LATE' && r.lateDays === 0) return false;
      if (teacherExceptionFilter === 'WITH_ABSENT' && r.absentDays === 0) return false;
      if (teacherExceptionFilter === 'WITH_SRD' && r.srdDays === 0) return false;
      if (teacherExceptionFilter === 'WITH_PENALTIES' && r.netEstimatedPenaltyPhp === 0 && r.loanDeductionPhp === 0) return false;
      if (teacherExceptionFilter === 'CLEAN_RECORD' && (r.lateDays > 0 || r.absentDays > 0 || r.noLogoutDays > 0 || r.netEstimatedPenaltyPhp > 0)) return false;

      // Live search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = r.teacherName.toLowerCase().includes(q);
        const matchesReal = r.realFullName.toLowerCase().includes(q);
        const matchesProj = r.projectType.toLowerCase().includes(q);
        const matchesDept = r.department.toLowerCase().includes(q);
        const matchesRestDay = (r.assignedRestDay || '').toLowerCase().includes(q);
        if (!matchesName && !matchesReal && !matchesProj && !matchesDept && !matchesRestDay) {
          return false;
        }
      }

      return true;
    });
  }, [reportData, projectType, department, teacherExceptionFilter, searchTerm]);

  // Client-side filtered Staff
  const filteredStaff = useMemo(() => {
    return staffData.filter((s) => {
      // Role filter
      if (staffRole !== 'ALL' && s.roleType !== staffRole) return false;

      // Branch filter
      if (staffBranch !== 'ALL' && s.branch !== staffBranch) return false;

      // Department filter
      if (staffDept !== 'ALL' && s.department !== staffDept) return false;

      // Compliance filter
      if (staffComplianceFilter === 'PERFECT' && s.complianceRatePercent < 100) return false;
      if (staffComplianceFilter === 'BELOW_90' && s.complianceRatePercent >= 90) return false;
      if (staffComplianceFilter === 'WITH_LATE' && s.lateShifts === 0) return false;
      if (staffComplianceFilter === 'WITH_ABSENT' && s.absentShifts === 0) return false;

      // Live search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesRole = s.roleType.toLowerCase().includes(q);
        const matchesBranch = s.branch.toLowerCase().includes(q);
        const matchesDept = s.department.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesBranch && !matchesDept) {
          return false;
        }
      }

      return true;
    });
  }, [staffData, staffRole, staffBranch, staffDept, staffComplianceFilter, searchTerm]);

  // Visual Teacher Analytics Breakdown
  const teacherAnalytics = useMemo(() => {
    const totalTeachers = filteredTeachers.length;
    const totalSlots = filteredTeachers.reduce((acc, r) => acc + r.totalSlotsRendered, 0);
    const totalFinished = filteredTeachers.reduce((acc, r) => acc + r.totalClassesFinished, 0);
    const totalPresent = filteredTeachers.reduce((acc, r) => acc + r.presentDays, 0);
    const totalLate = filteredTeachers.reduce((acc, r) => acc + r.lateDays, 0);
    const totalAbsent = filteredTeachers.reduce((acc, r) => acc + r.absentDays, 0);
    const totalLateMins = filteredTeachers.reduce((acc, r) => acc + r.totalLateMinutes, 0);
    const totalPenalties = filteredTeachers.reduce((acc, r) => acc + r.netEstimatedPenaltyPhp, 0);
    const totalLoans = filteredTeachers.reduce((acc, r) => acc + r.loanDeductionPhp, 0);

    const bookingRate = totalSlots > 0 ? Math.round((totalFinished / totalSlots) * 100) : 0;

    // Project breakdown
    const projStats: Record<string, { slots: number; finished: number; count: number }> = {
      FT: { slots: 0, finished: 0, count: 0 },
      FTEX: { slots: 0, finished: 0, count: 0 },
      TTP: { slots: 0, finished: 0, count: 0 },
    };
    filteredTeachers.forEach((r) => {
      const p = r.projectType || 'FT';
      if (!projStats[p]) projStats[p] = { slots: 0, finished: 0, count: 0 };
      projStats[p].slots += r.totalSlotsRendered;
      projStats[p].finished += r.totalClassesFinished;
      projStats[p].count += 1;
    });

    // Department breakdown
    const deptStats: Record<string, { slots: number; finished: number; count: number }> = {
      DOMESTIC: { slots: 0, finished: 0, count: 0 },
      OVERSEAS: { slots: 0, finished: 0, count: 0 },
    };
    filteredTeachers.forEach((r) => {
      const d = r.department || 'DOMESTIC';
      if (!deptStats[d]) deptStats[d] = { slots: 0, finished: 0, count: 0 };
      deptStats[d].slots += r.totalSlotsRendered;
      deptStats[d].finished += r.totalClassesFinished;
      deptStats[d].count += 1;
    });

    return {
      totalTeachers,
      totalSlots,
      totalFinished,
      bookingRate,
      totalPresent,
      totalLate,
      totalAbsent,
      totalLateMins,
      totalPenalties,
      totalLoans,
      projStats,
      deptStats,
    };
  }, [filteredTeachers]);

  // Visual Staff Analytics Breakdown
  const staffAnalytics = useMemo(() => {
    const count = filteredStaff.length;
    const totalShifts = filteredStaff.reduce((acc, s) => acc + s.totalShifts, 0);
    const totalPresent = filteredStaff.reduce((acc, s) => acc + s.presentShifts, 0);
    const totalLate = filteredStaff.reduce((acc, s) => acc + s.lateShifts, 0);
    const totalLateMins = filteredStaff.reduce((acc, s) => acc + s.totalLateMinutes, 0);
    const totalChecklists = filteredStaff.reduce((acc, s) => acc + s.completedChecklists, 0);
    const avgCompliance = count > 0 ? Math.round(filteredStaff.reduce((acc, s) => acc + s.complianceRatePercent, 0) / count) : 100;
    const perfectCount = filteredStaff.filter((s) => s.complianceRatePercent === 100).length;

    return {
      count,
      totalShifts,
      totalPresent,
      totalLate,
      totalLateMins,
      totalChecklists,
      avgCompliance,
      perfectCount,
    };
  }, [filteredStaff]);

  // Robust Blob-based CSV Export Generator with UTF-8 BOM
  const handleExportCSV = () => {
    if (activeTab === 'TEACHER_CUTOFF') {
      if (filteredTeachers.length === 0) {
        alert('No teacher records found matching current filters to export.');
        return;
      }

      const headers = [
        'Teacher Display Name',
        'Real Full Name',
        'Project',
        'Department',
        'Rest Day',
        'Days Logged',
        'Present Days',
        'Late Days',
        'Early Out Days',
        'Absent Days',
        'SRD Days',
        'No Logout Days',
        'Total Late Minutes',
        'Slots Rendered (Capacity)',
        'Classes Finished',
        'Cancellations',
        'Absence Penalty (PHP)',
        'No Logout Penalty (PHP)',
        'Loan Deduction (PHP)',
        'Net Estimated Penalty & Deductions (PHP)',
      ];

      const rows = filteredTeachers.map((r) => [
        `"${(r.teacherName || '').replace(/"/g, '""')}"`,
        `"${(r.realFullName || '').replace(/"/g, '""')}"`,
        r.projectType,
        r.department,
        r.assignedRestDay,
        r.totalDaysRecorded,
        r.presentDays,
        r.lateDays,
        r.earlyOutDays,
        r.absentDays,
        r.srdDays,
        r.noLogoutDays,
        r.totalLateMinutes,
        r.totalSlotsRendered,
        r.totalClassesFinished,
        r.totalCancellations,
        r.unexcusedAbsencePenaltyPhp,
        r.noLogoutPenaltyPhp,
        r.loanDeductionPhp,
        r.netEstimatedPenaltyPhp,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Netspeak_Teacher_CutOff_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (activeTab === 'STAFF_OPERATIONS') {
      if (filteredStaff.length === 0) {
        alert('No staff records found matching current filters to export.');
        return;
      }

      const headers = [
        'Staff Name',
        'Role',
        'Branch',
        'Department',
        'Total Shifts',
        'Present Shifts',
        'Late Shifts',
        'Absent Shifts',
        'Checklists Completed',
        'Compliance Rate (%)',
        'Total Late Minutes',
      ];

      const rows = filteredStaff.map((s) => [
        `"${(s.name || '').replace(/"/g, '""')}"`,
        s.roleType,
        `"${(s.branch || '').replace(/"/g, '""')}"`,
        `"${(s.department || '').replace(/"/g, '""')}"`,
        s.totalShifts,
        s.presentShifts,
        s.lateShifts,
        s.absentShifts,
        s.completedChecklists,
        `${s.complianceRatePercent}%`,
        s.totalLateMinutes,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Netspeak_Staff_Operations_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (activeTab === 'LESSON_SYNC') {
      alert('For Lesson Fee Cut-Off Sync, use the Dedicated Export and CSV Upload utilities below.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Header Controls & Presets Strip ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          border: '1px solid var(--border-light)',
          borderLeft: '4px solid var(--ns-green)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📈</span>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Consolidated Operations &amp; Cut-Off Reports
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--ns-green-pale)',
                  color: 'var(--ns-green-dark)',
                  border: '1px solid var(--border-green)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                Official Audit
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Semi-monthly teacher cut-off reconciliation, slot output aggregation, punctuality metrics, and staff compliance.
            </p>
          </div>

          {/* Quick Presets & Export Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => handleSetPreset('CURRENT_CUTOFF')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activePreset === 'CURRENT_CUTOFF' ? 'rgba(0, 82, 204, 0.15)' : 'var(--bg-surface)',
                border: `1px solid ${activePreset === 'CURRENT_CUTOFF' ? 'var(--ns-blue)' : 'var(--border-color)'}`,
                color: activePreset === 'CURRENT_CUTOFF' ? 'var(--ns-blue)' : 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: activePreset === 'CURRENT_CUTOFF' ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📅 Current Cut-Off
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('PREVIOUS_CUTOFF')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activePreset === 'PREVIOUS_CUTOFF' ? 'rgba(0, 82, 204, 0.15)' : 'var(--bg-surface)',
                border: `1px solid ${activePreset === 'PREVIOUS_CUTOFF' ? 'var(--ns-blue)' : 'var(--border-color)'}`,
                color: activePreset === 'PREVIOUS_CUTOFF' ? 'var(--ns-blue)' : 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: activePreset === 'PREVIOUS_CUTOFF' ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ⏪ Previous Cut-Off
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('THIS_MONTH')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: activePreset === 'THIS_MONTH' ? 'rgba(0, 82, 204, 0.15)' : 'var(--bg-surface)',
                border: `1px solid ${activePreset === 'THIS_MONTH' ? 'var(--ns-blue)' : 'var(--border-color)'}`,
                color: activePreset === 'THIS_MONTH' ? 'var(--ns-blue)' : 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: activePreset === 'THIS_MONTH' ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🗓️ This Month
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                border: 'none',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Dynamic Filter Form */}
        <form
          onSubmit={handleApplyFilter}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
            background: 'var(--bg-surface)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Date range pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset('CUSTOM');
              }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset('CUSTOM');
              }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Teacher Tab Specific Filters */}
          {activeTab === 'TEACHER_CUTOFF' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Project:</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="ALL">All Projects</option>
                  <option value="FTEX">FTEX (Experienced)</option>
                  <option value="FT">FT (Full Time)</option>
                  <option value="TTP">TTP (Trainee)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Dept:</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="ALL">All Departments</option>
                  <option value="DOMESTIC">Domestic</option>
                  <option value="OVERSEAS">Overseas</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Exceptions:</label>
                <select
                  value={teacherExceptionFilter}
                  onChange={(e) => setTeacherExceptionFilter(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="ALL">All Attendance States</option>
                  <option value="WITH_LATE">⚠️ Has Tardiness (Late)</option>
                  <option value="WITH_ABSENT">❌ Has Absences</option>
                  <option value="WITH_SRD">🔄 Has SRD Swaps</option>
                  <option value="WITH_PENALTIES">💰 Has Deductions/Penalties</option>
                  <option value="CLEAN_RECORD">✨ Clean Record (0 Penalties)</option>
                </select>
              </div>
            </>
          )}

          {/* Staff Tab Specific Filters */}
          {activeTab === 'STAFF_OPERATIONS' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Role:</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="ADMIN">Center Admin</option>
                  <option value="IT">IT Support</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Branch:</label>
                <select
                  value={staffBranch}
                  onChange={(e) => setStaffBranch(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b === 'ALL' ? 'All Branches' : b}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Compliance:</label>
                <select
                  value={staffComplianceFilter}
                  onChange={(e) => setStaffComplianceFilter(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '0.35rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="ALL">All Compliance Levels</option>
                  <option value="PERFECT">⭐ 100% Perfect Compliance</option>
                  <option value="BELOW_90">⚠️ Below 90% Compliance</option>
                  <option value="WITH_LATE">⏰ Has Late Shifts</option>
                  <option value="WITH_ABSENT">❌ Has Absences</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: '0.4rem 1.25rem',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: isPending ? 0.8 : 1,
            }}
          >
            {isPending ? (
              <>
                <span className="spinner-border spinner-border-sm" />
                Generating...
              </>
            ) : (
              '⚡ Apply Filter'
            )}
          </button>
        </form>

        {/* Feedback message banner */}
        {feedback && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background:
                feedback.type === 'error'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : feedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
              color:
                feedback.type === 'error'
                  ? '#ef4444'
                  : feedback.type === 'success'
                  ? '#10b981'
                  : '#3b82f6',
              border: `1px solid ${
                feedback.type === 'error'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : feedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(59, 130, 246, 0.3)'
              }`,
            }}
          >
            <span>{feedback.type === 'error' ? '⚠️' : feedback.type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* ── KPI Cards & Teacher Analytics Overview ── */}
      {activeTab === 'TEACHER_CUTOFF' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Teachers Monitored
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {teacherAnalytics.totalTeachers}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ns-blue-light)', marginTop: '0.25rem' }}>
                Active in current period
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Slots Rendered / Booked
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
                {teacherAnalytics.totalFinished} / {teacherAnalytics.totalSlots}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Booking rate: {teacherAnalytics.bookingRate}%
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Tardiness Recorded
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
                {teacherAnalytics.totalLateMins}m
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Across {teacherAnalytics.totalLate} late shifts
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Absences Recorded
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171', marginTop: '0.25rem' }}>
                {teacherAnalytics.totalAbsent}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                Unexcused &amp; verified absences
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Est. Deductions &amp; Loans
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.25rem' }}>
                ₱{(teacherAnalytics.totalPenalties).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                {teacherAnalytics.totalLoans > 0 ? `Incl. ₱${teacherAnalytics.totalLoans.toLocaleString()} loan ded.` : 'Clean of loans'}
              </div>
            </div>
          </div>

          {/* Visual Teacher Analytics & Booking Efficiency Progress Bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                📊 Booking Efficiency by Project Type
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(['FT', 'FTEX', 'TTP'] as const).map((proj) => {
                  const stat = teacherAnalytics.projStats[proj] || { slots: 0, finished: 0, count: 0 };
                  const rate = stat.slots > 0 ? Math.round((stat.finished / stat.slots) * 100) : 0;
                  return (
                    <div key={proj}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {proj === 'FT' ? 'Full Time (FT)' : proj === 'FTEX' ? 'FT Experienced (FTEX)' : 'TTP Trainee (TTP)'} ({stat.count} teachers)
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>
                          {stat.finished} / {stat.slots} slots ({rate}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, rate)}%`,
                            background: proj === 'FT' ? 'var(--ns-blue)' : proj === 'FTEX' ? '#10b981' : '#f59e0b',
                            borderRadius: '999px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🏢 Department Utilization &amp; Delivery
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(['DOMESTIC', 'OVERSEAS'] as const).map((dept) => {
                  const stat = teacherAnalytics.deptStats[dept] || { slots: 0, finished: 0, count: 0 };
                  const rate = stat.slots > 0 ? Math.round((stat.finished / stat.slots) * 100) : 0;
                  return (
                    <div key={dept}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {dept === 'DOMESTIC' ? 'Domestic ESL Program' : 'Overseas ESL Program'} ({stat.count} teachers)
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>
                          {stat.finished} / {stat.slots} slots ({rate}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, rate)}%`,
                            background: dept === 'DOMESTIC' ? 'var(--ns-blue)' : '#8b5cf6',
                            borderRadius: '999px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Staff KPI strip when on Staff tab */}
      {activeTab === 'STAFF_OPERATIONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Staff Monitored
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {staffAnalytics.count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ns-blue-light)', marginTop: '0.25rem' }}>
              Admin &amp; IT specialists
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Shifts Tracked
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
              {staffAnalytics.totalShifts}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              {staffAnalytics.totalPresent} present shifts
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Staff Tardiness
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
              {staffAnalytics.totalLateMins}m
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Across {staffAnalytics.totalLate} late shifts
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Checklist Compliance
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>
              {staffAnalytics.avgCompliance}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              {staffAnalytics.totalChecklists} / {staffAnalytics.totalShifts} completed
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Perfect Compliance
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a855f7', marginTop: '0.25rem' }}>
              {staffAnalytics.perfectCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              100% adherence score
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs Bar & Live Search Filter ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('TEACHER_CUTOFF')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'TEACHER_CUTOFF' ? 'var(--accent)' : 'var(--bg-card)',
              color: activeTab === 'TEACHER_CUTOFF' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>👩‍🏫 Teacher Cut-Off Table</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                background: activeTab === 'TEACHER_CUTOFF' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface)',
                color: activeTab === 'TEACHER_CUTOFF' ? '#fff' : 'var(--text-dim)',
              }}
            >
              {filteredTeachers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STAFF_OPERATIONS')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'STAFF_OPERATIONS' ? 'var(--accent)' : 'var(--bg-card)',
              color: activeTab === 'STAFF_OPERATIONS' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>⚡ Staff Operations &amp; Checklists</span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                background: activeTab === 'STAFF_OPERATIONS' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface)',
                color: activeTab === 'STAFF_OPERATIONS' ? '#fff' : 'var(--text-dim)',
              }}
            >
              {filteredStaff.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LESSON_SYNC')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'LESSON_SYNC' ? 'var(--accent)' : 'var(--bg-card)',
              color: activeTab === 'LESSON_SYNC' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            💰 Lesson Fee Cut-Off Sync
          </button>
        </div>

        {/* Live Search Box */}
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <input
            type="text"
            placeholder={
              activeTab === 'TEACHER_CUTOFF'
                ? 'Search teachers, project, rest day...'
                : 'Search staff, role, branch, dept...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.85rem 0.5rem 2rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
              pointerEvents: 'none',
              fontSize: '0.85rem',
            }}
          >
            🔍
          </span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Content 1: Teacher Cut-Off Table ── */}
      {activeTab === 'TEACHER_CUTOFF' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Teacher</th>
                <th style={{ padding: '0.85rem 1rem' }}>Project / Dept</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Slots Rendered</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Present</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Late (Mins)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Absences</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>SRDs</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>No Logout</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Loan Ded.</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Est. Deductions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📋</div>
                    <div style={{ fontWeight: 600 }}>No teacher records match the selected period or filters.</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                      Try adjusting the date range, project type, or clearing your search query.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((row) => (
                  <tr
                    key={row.teacherId}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.teacherName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.realFullName}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(0, 82, 204, 0.08)',
                          color: 'var(--ns-blue)',
                          border: '1px solid rgba(0, 82, 204, 0.25)',
                        }}
                      >
                        {row.projectType}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.4rem' }}>
                        {row.department}
                      </span>
                      {row.assignedRestDay && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                          Rest: {row.assignedRestDay}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--ns-blue)' }}>
                      <div>{row.totalSlotsRendered}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {row.totalClassesFinished} booked
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#0F766E', fontWeight: 600 }}>
                      {row.presentDays}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {row.lateDays > 0 ? (
                        <span style={{ color: '#B45309', fontWeight: 700 }}>
                          {row.lateDays} ({row.totalLateMinutes}m)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {row.absentDays > 0 ? (
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>{row.absentDays}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {row.srdDays}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {row.noLogoutDays > 0 ? (
                        <span style={{ color: '#f43f5e', fontWeight: 700 }}>{row.noLogoutDays}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {row.loanDeductionPhp > 0 ? (
                        <span style={{ color: '#B45309', fontWeight: 600 }}>₱{row.loanDeductionPhp.toLocaleString()}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                      {row.netEstimatedPenaltyPhp > 0 ? (
                        <span style={{ color: '#f43f5e' }}>₱{row.netEstimatedPenaltyPhp.toLocaleString()}</span>
                      ) : (
                        <span style={{ color: '#0F766E' }}>₱0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab Content 2: Staff Operations & Checklists Table ── */}
      {activeTab === 'STAFF_OPERATIONS' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Staff Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                <th style={{ padding: '0.85rem 1rem' }}>Branch &amp; Dept</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Total Shifts</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Present</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Late (Mins)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Absences</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Checklists Completed</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Compliance Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⚡</div>
                    <div style={{ fontWeight: 600 }}>No staff operations records match the selected criteria.</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                      Try selecting different branch/role filters or clearing your search.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr
                    key={s.staffId}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: s.roleType === 'IT' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: s.roleType === 'IT' ? '#c084fc' : 'var(--ns-blue-light)',
                          border: `1px solid ${s.roleType === 'IT' ? '#a855f7' : '#3b82f6'}`,
                        }}
                      >
                        {s.roleType}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.branch}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{s.department}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                      {s.totalShifts}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#4ade80', fontWeight: 600 }}>
                      {s.presentShifts}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {s.lateShifts > 0 ? (
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                          {s.lateShifts} ({s.totalLateMinutes}m)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {s.absentShifts > 0 ? (
                        <span style={{ color: '#f87171', fontWeight: 700 }}>{s.absentShifts}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                      {s.completedChecklists} / {s.totalShifts}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          background:
                            s.complianceRatePercent >= 90
                              ? 'rgba(74, 222, 128, 0.15)'
                              : s.complianceRatePercent >= 75
                              ? 'rgba(251, 191, 36, 0.15)'
                              : 'rgba(248, 113, 113, 0.15)',
                          color:
                            s.complianceRatePercent >= 90
                              ? '#4ade80'
                              : s.complianceRatePercent >= 75
                              ? '#fbbf24'
                              : '#f87171',
                          border: `1px solid ${
                            s.complianceRatePercent >= 90
                              ? 'rgba(74, 222, 128, 0.3)'
                              : s.complianceRatePercent >= 75
                              ? 'rgba(251, 191, 36, 0.3)'
                              : 'rgba(248, 113, 113, 0.3)'
                          }`,
                        }}
                      >
                        {s.complianceRatePercent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab Content 3: Lesson Fee Cut-Off Sync Desk ── */}
      {activeTab === 'LESSON_SYNC' && (
        <LessonFeeSyncDesk
          knownTeachers={(reportData?.rows || []).map((r) => ({
            portalUsername: r.teacherName,
            teacherName: r.teacherName,
            realFullName: r.realFullName,
          }))}
        />
      )}
    </div>
  );
}

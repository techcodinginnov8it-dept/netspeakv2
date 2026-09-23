'use client';

import React, { useState, useTransition } from 'react';
import {
  CutOffReportData,
  TeacherCutOffRow,
  StaffOperationsReportRow,
  getCutOffReportAction,
  getStaffOperationsReportAction,
} from '@/actions/reports';

interface Props {
  initialReportData: CutOffReportData | null;
  initialStaffData: StaffOperationsReportRow[];
  defaultStartDate: string;
  defaultEndDate: string;
}

export default function CutOffReportsView({
  initialReportData,
  initialStaffData,
  defaultStartDate,
  defaultEndDate,
}: Props) {
  const [activeTab, setActiveTab] = useState<'TEACHER_CUTOFF' | 'STAFF_OPERATIONS'>('TEACHER_CUTOFF');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [projectType, setProjectType] = useState('ALL');
  const [department, setDepartment] = useState('ALL');

  const [reportData, setReportData] = useState<CutOffReportData | null>(initialReportData);
  const [staffData, setStaffData] = useState<StaffOperationsReportRow[]>(initialStaffData);
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');

  // Preset quick filters
  const handleSetPreset = (preset: 'CURRENT_CUTOFF' | 'PREVIOUS_CUTOFF' | 'THIS_MONTH') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();

    let start = new Date();
    let end = new Date();

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
        // Previous month 16th to end
        start = new Date(year, month - 1, 16);
        end = new Date(year, month, 0);
      } else {
        // Current month 1st to 15th
        start = new Date(year, month, 1);
        end = new Date(year, month, 15);
      }
    } else if (preset === 'THIS_MONTH') {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);

    fetchData(startStr, endStr, projectType, department);
  };

  const fetchData = (s: string, e: string, proj: string, dept: string) => {
    startTransition(async () => {
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
        }),
      ]);

      if (teacherRes.success && teacherRes.data) {
        setReportData(teacherRes.data);
      }
      if (staffRes.success && staffRes.data) {
        setStaffData(staffRes.data);
      }
    });
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(startDate, endDate, projectType, department);
  };

  // Export to CSV generator
  const handleExportCSV = () => {
    if (activeTab === 'TEACHER_CUTOFF' && reportData) {
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
        'Total Slots Conducted',
        'Total Classes Finished',
        'Total Cancellations',
        'Absence Penalty (PHP)',
        'No Logout Penalty (PHP)',
        'Net Estimated Penalty (PHP)',
      ];

      const rows = reportData.rows.map((r) => [
        `"${r.teacherName}"`,
        `"${r.realFullName}"`,
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
        r.netEstimatedPenaltyPhp,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Netspeak_CutOff_Report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'STAFF_OPERATIONS') {
      const headers = [
        'Staff Name',
        'Role',
        'Branch',
        'Department',
        'Total Shifts',
        'Present Shifts',
        'Late Shifts',
        'Absent Shifts',
        'Completed Checklists',
        'Compliance Rate (%)',
        'Total Late Minutes',
      ];

      const rows = staffData.map((s) => [
        `"${s.name}"`,
        s.roleType,
        s.branch,
        s.department,
        s.totalShifts,
        s.presentShifts,
        s.lateShifts,
        s.absentShifts,
        s.completedChecklists,
        `${s.complianceRatePercent}%`,
        s.totalLateMinutes,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Netspeak_Staff_Operations_Report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredTeachers = (reportData?.rows || []).filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.teacherName.toLowerCase().includes(q) ||
      r.realFullName.toLowerCase().includes(q) ||
      r.projectType.toLowerCase().includes(q)
    );
  });

  const filteredStaff = staffData.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.roleType.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Controls Banner */}
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
                Reports
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Semi-monthly teacher cut-off reconciliation, slot output aggregation, punctuality metrics, and staff compliance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSetPreset('CURRENT_CUTOFF')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Current Cut-Off
            </button>
            <button
              onClick={() => handleSetPreset('PREVIOUS_CUTOFF')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Previous Cut-Off
            </button>
            <button
              onClick={() => handleSetPreset('THIS_MONTH')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              This Month
            </button>
            <button
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
              }}
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Filter Form */}
        <form
          onSubmit={handleApplyFilter}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'var(--bg-surface)',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project:</label>
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
              <option value="FTEX">FTEX</option>
              <option value="FT">FT</option>
              <option value="TTP">TTP</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Department:</label>
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
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isPending ? 'Generating...' : 'Apply Filter'}
          </button>
        </form>
      </div>

      {/* KPI Cards Overview */}
      {reportData && (
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
              Teachers Included
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {reportData.summary.totalTeachers}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginTop: '0.25rem' }}>Approved active teachers</div>
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
              Slots Rendered
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
              {reportData.summary.totalSlotsRendered}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Conduct verified slots</div>
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
              {reportData.summary.totalLateMinutes}m
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Across {reportData.summary.totalLateDays} late shifts
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
              Absences &amp; SRDs
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171', marginTop: '0.25rem' }}>
              {reportData.summary.totalAbsentDays} / {reportData.summary.totalSrdDays}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Absences vs Rest Days Swapped</div>
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
              Est. Penalties
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.25rem' }}>
              ₱{reportData.summary.totalPenaltiesPhp.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Absence &amp; No-Logout deductions</div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
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
            }}
          >
            👩‍🏫 Teacher Cut-Off Table ({filteredTeachers.length})
          </button>
          <button
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
            }}
          >
            ⚡ Staff Operations &amp; Checklists ({filteredStaff.length})
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="Search by name, role, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              minWidth: '260px',
            }}
          />
        </div>
      </div>

      {/* Tab Content 1: Teacher Cut-Off Table */}
      {activeTab === 'TEACHER_CUTOFF' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
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
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Est. Penalties</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No teacher records found for the selected period and filters.
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
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--ns-blue)' }}>
                      {row.totalSlotsRendered}
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
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                      {row.netEstimatedPenaltyPhp > 0 ? (
                        <span style={{ color: '#f43f5e' }}>₱{row.netEstimatedPenaltyPhp.toLocaleString()}</span>
                      ) : (
                        <span style={{ color: '#4ade80' }}>₱0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content 2: Staff Operations Report */}
      {activeTab === 'STAFF_OPERATIONS' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Staff Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                <th style={{ padding: '0.85rem 1rem' }}>Branch</th>
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
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No staff operational records found for the selected period.
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
                          color: s.roleType === 'IT' ? '#c084fc' : '#93c5fd',
                          border: `1px solid ${s.roleType === 'IT' ? '#a855f7' : '#3b82f6'}`,
                        }}
                      >
                        {s.roleType}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{s.branch}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>{s.totalShifts}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#4ade80' }}>
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
                          color:
                            s.complianceRatePercent >= 90
                              ? '#4ade80'
                              : s.complianceRatePercent >= 75
                              ? '#fbbf24'
                              : '#f87171',
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
    </div>
  );
}

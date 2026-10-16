'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminRecordDailyOutputAction } from '@/actions/dailyOutput';

export interface DailyOutputItem {
  id: string;
  date: string;
  openSlots: number;
  bookedSlots: number;
  classTardiness: number;
  absentClasses: number;
  earlyLeaveClasses: number;
  remarks: string | null;
  createdAt: string;
  teacher: {
    id: string;
    displayName: string;
    realFullName: string;
    department: string;
    projectType: string;
    branch: string | null;
    portalUsername: string | null;
  };
}

export interface TeacherOption {
  id: string;
  displayName: string;
  realFullName: string;
  department: string;
  projectType: string;
  branch: string | null;
}

interface Props {
  initialOutputs: DailyOutputItem[];
  teachers: TeacherOption[];
  branches: Array<{ id: string; name: string }>;
  userRoles: string[];
  userBranch?: string | null;
}

type DatePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL';

export default function DailyOutputManagementDesk({
  initialOutputs,
  teachers,
  branches,
  userRoles,
  userBranch,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Role gates — admins/ops/sys-admin can record & override; teachers are read-only
  const MANAGING_ROLES = ['SYSTEM_ADMINISTRATOR', 'ADMIN', 'OPERATIONS_MANAGER', 'IT', 'MANAGEMENT'];
  const canManageOutput = userRoles.some((r) => MANAGING_ROLES.includes(r));

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>(userBranch || 'ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Admin Record/Override Output
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTeacherId, setModalTeacherId] = useState('');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalOpenSlots, setModalOpenSlots] = useState(16);
  const [modalBookedSlots, setModalBookedSlots] = useState(14);
  const [modalTardiness, setModalTardiness] = useState(0);
  const [modalAbsent, setModalAbsent] = useState(0);
  const [modalEarlyLeave, setModalEarlyLeave] = useState(0);
  const [modalRemarks, setModalRemarks] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Quick preset dates
  const handleApplyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      setCustomStartDate(yStr);
      setCustomEndDate(yStr);
    } else if (preset === 'LAST_7_DAYS') {
      const sevenDays = new Date(now);
      sevenDays.setDate(now.getDate() - 6);
      setCustomStartDate(sevenDays.toISOString().split('T')[0]);
      setCustomEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setCustomStartDate(firstDay.toISOString().split('T')[0]);
      setCustomEndDate(todayStr);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleResetFilters = () => {
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedBranch('ALL');
    setSelectedDept('ALL');
    setSelectedProject('ALL');
    setSearchQuery('');
  };

  // Filtered Outputs
  const filteredOutputs = useMemo(() => {
    return initialOutputs.filter((item) => {
      // Date filter
      if (customStartDate) {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        if (itemDate < customStartDate) return false;
      }
      if (customEndDate) {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        if (itemDate > customEndDate) return false;
      }

      // Branch filter
      if (selectedBranch !== 'ALL' && (item.teacher.branch || 'Atimonan') !== selectedBranch) {
        return false;
      }

      // Department filter
      if (selectedDept !== 'ALL' && item.teacher.department !== selectedDept) {
        return false;
      }

      // Project filter
      if (selectedProject !== 'ALL' && item.teacher.projectType !== selectedProject) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (item.teacher.displayName || '').toLowerCase();
        const realName = (item.teacher.realFullName || '').toLowerCase();
        const remarks = (item.remarks || '').toLowerCase();
        const username = (item.teacher.portalUsername || '').toLowerCase();
        if (!name.includes(q) && !realName.includes(q) && !remarks.includes(q) && !username.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [initialOutputs, customStartDate, customEndDate, selectedBranch, selectedDept, selectedProject, searchQuery]);

  // Aggregate Analytics
  const totalReports = filteredOutputs.length;
  const totalOpenSlots = filteredOutputs.reduce((acc, o) => acc + o.openSlots, 0);
  const totalBookedSlots = filteredOutputs.reduce((acc, o) => acc + o.bookedSlots, 0);
  const overallBookingRate = totalOpenSlots > 0 ? ((totalBookedSlots / totalOpenSlots) * 100).toFixed(1) : '0.0';
  const totalTardiness = filteredOutputs.reduce((acc, o) => acc + o.classTardiness, 0);
  const totalAbsences = filteredOutputs.reduce((acc, o) => acc + o.absentClasses, 0);
  const totalEarlyLeaves = filteredOutputs.reduce((acc, o) => acc + o.earlyLeaveClasses, 0);
  const totalExceptions = totalTardiness + totalAbsences + totalEarlyLeaves;

  // Project Breakdown Analytics
  const projectStats = useMemo(() => {
    const map: Record<string, { open: number; booked: number; count: number }> = {
      FT: { open: 0, booked: 0, count: 0 },
      FTEX: { open: 0, booked: 0, count: 0 },
      TTP: { open: 0, booked: 0, count: 0 },
    };
    filteredOutputs.forEach((o) => {
      const p = o.teacher.projectType || 'FT';
      if (!map[p]) map[p] = { open: 0, booked: 0, count: 0 };
      map[p].open += o.openSlots;
      map[p].booked += o.bookedSlots;
      map[p].count += 1;
    });
    return map;
  }, [filteredOutputs]);

  // Department Breakdown Analytics
  const deptStats = useMemo(() => {
    const map: Record<string, { open: number; booked: number; count: number }> = {
      DOMESTIC: { open: 0, booked: 0, count: 0 },
      OVERSEAS: { open: 0, booked: 0, count: 0 },
    };
    filteredOutputs.forEach((o) => {
      const d = o.teacher.department || 'DOMESTIC';
      if (!map[d]) map[d] = { open: 0, booked: 0, count: 0 };
      map[d].open += o.openSlots;
      map[d].booked += o.bookedSlots;
      map[d].count += 1;
    });
    return map;
  }, [filteredOutputs]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredOutputs.length === 0) {
      alert('No output records to export for current filter criteria.');
      return;
    }

    const headers = [
      'Report Date',
      'Teacher Display Name',
      'Teacher Real Name',
      'Branch',
      'Department',
      'Project Type',
      'Open Slots',
      'Booked Slots',
      'Booking Rate (%)',
      'Class Tardiness',
      'Absent Classes',
      'Early Leaves',
      'Total Exceptions',
      'Remarks',
    ];

    const rows = filteredOutputs.map((o) => {
      const rate = o.openSlots > 0 ? ((o.bookedSlots / o.openSlots) * 100).toFixed(1) : '0.0';
      const exc = o.classTardiness + o.absentClasses + o.earlyLeaveClasses;
      return [
        new Date(o.date).toISOString().split('T')[0],
        `"${(o.teacher.displayName || '').replace(/"/g, '""')}"`,
        `"${(o.teacher.realFullName || '').replace(/"/g, '""')}"`,
        `"${o.teacher.branch || 'Atimonan'}"`,
        o.teacher.department,
        o.teacher.projectType,
        o.openSlots,
        o.bookedSlots,
        `${rate}%`,
        o.classTardiness,
        o.absentClasses,
        o.earlyLeaveClasses,
        exc,
        `"${(o.remarks || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daily_Output_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Open Edit/Override Modal
  const handleOpenEdit = (item: DailyOutputItem) => {
    setModalTeacherId(item.teacher.id);
    setModalDate(new Date(item.date).toISOString().split('T')[0]);
    setModalOpenSlots(item.openSlots);
    setModalBookedSlots(item.bookedSlots);
    setModalTardiness(item.classTardiness);
    setModalAbsent(item.absentClasses);
    setModalEarlyLeave(item.earlyLeaveClasses);
    setModalRemarks(item.remarks || '');
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  // Submit Admin Record Output
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTeacherId) {
      setModalError('Please select a teacher.');
      return;
    }
    setModalError(null);
    setModalSuccess(null);

    startTransition(async () => {
      const res = await adminRecordDailyOutputAction({
        teacherId: modalTeacherId,
        date: modalDate,
        openSlots: Number(modalOpenSlots),
        bookedSlots: Number(modalBookedSlots),
        classTardiness: Number(modalTardiness),
        absentClasses: Number(modalAbsent),
        earlyLeaveClasses: Number(modalEarlyLeave),
        remarks: modalRemarks,
      });

      if (res.error) {
        setModalError(res.error);
      } else {
        setModalSuccess('Daily output report successfully recorded and synchronized.');
        router.refresh();
        setTimeout(() => {
          setIsModalOpen(false);
          setModalSuccess(null);
        }, 1200);
      }
    });
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Header & Action Buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              📊 Teacher Daily Output Reports &amp; Analytics
            </h1>
            <span
              style={{
                background: 'rgba(0, 82, 204, 0.12)',
                color: 'var(--ns-blue)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                border: '1px solid rgba(0, 82, 204, 0.25)',
              }}
            >
              Operations Intelligence
            </span>
          </div>
          <p style={{ color: 'var(--text-dim)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
            Shift output compliance, open vs booked slots efficiency, and class attendance exceptions across branches.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            disabled={isPending}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.55rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            <span style={{ display: 'inline-block', animation: isPending ? 'spin 0.8s linear infinite' : 'none' }}>
              🔄
            </span>
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--ns-green)',
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            📥 Export CSV
          </button>

          {canManageOutput && (
            <button
              type="button"
              onClick={() => {
                setModalTeacherId('');
                setModalDate(new Date().toISOString().split('T')[0]);
                setModalOpenSlots(16);
                setModalBookedSlots(14);
                setModalTardiness(0);
                setModalAbsent(0);
                setModalEarlyLeave(0);
                setModalRemarks('');
                setModalError(null);
                setModalSuccess(null);
                setIsModalOpen(true);
              }}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--ns-blue)',
                color: '#fff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 82, 204, 0.25)',
              }}
            >
              ➕ Record / Override Output
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Report Analytics Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--ns-blue)' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Total Submissions
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            {totalReports}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Across {teachers.length} active teachers
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Open vs Booked Slots
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.35rem', color: '#3b82f6' }}>
            {totalBookedSlots} <span style={{ fontSize: '1rem', color: 'var(--text-dim)', fontWeight: 500 }}>/ {totalOpenSlots}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Conducted class capacity
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Overall Booking Rate
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: Number(overallBookingRate) >= 75 ? '#10b981' : Number(overallBookingRate) >= 50 ? '#f59e0b' : '#ef4444' }}>
              {overallBookingRate}%
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: Number(overallBookingRate) >= 75 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: Number(overallBookingRate) >= 75 ? '#10b981' : '#f59e0b',
              }}
            >
              {Number(overallBookingRate) >= 75 ? 'High Efficiency' : 'Moderate'}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            Target: &ge;80% daily occupancy
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Class Exceptions
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.35rem', color: totalExceptions > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {totalExceptions}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            {totalTardiness} Tardy · {totalAbsences} Absent · {totalEarlyLeaves} Early Out
          </div>
        </div>
      </div>

      {/* ── Visual Analytics Breakdown Panels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Project Utilization Panel */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            📁 Booking Efficiency by Project Type
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(['FT', 'FTEX', 'TTP'] as const).map((proj) => {
              const p = projectStats[proj] || { open: 0, booked: 0, count: 0 };
              const rate = p.open > 0 ? Math.round((p.booked / p.open) * 100) : 0;
              return (
                <div key={proj}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {proj === 'FT' ? 'Full Time (FT)' : proj === 'FTEX' ? 'FT Experienced (FTEX)' : 'TTP Trainee (TTP)'}
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>
                      {p.booked} / {p.open} slots ({rate}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
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

        {/* Department Utilization Panel */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🏢 Booking Efficiency by Department
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(['DOMESTIC', 'OVERSEAS'] as const).map((dept) => {
              const d = deptStats[dept] || { open: 0, booked: 0, count: 0 };
              const rate = d.open > 0 ? Math.round((d.booked / d.open) * 100) : 0;
              return (
                <div key={dept}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {dept === 'DOMESTIC' ? 'Domestic ESL Program' : 'Overseas ESL Program'}
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>
                      {d.booked} / {d.open} slots ({rate}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
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

      {/* ── Interactive Filters Strip & Buttons ── */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Presets Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', marginRight: '0.25rem' }}>
              Date Presets:
            </span>
            {(
              [
                { id: 'ALL', label: '🌐 All Time' },
                { id: 'TODAY', label: '📅 Today' },
                { id: 'YESTERDAY', label: '⏪ Yesterday' },
                { id: 'LAST_7_DAYS', label: '📊 Last 7 Days' },
                { id: 'THIS_MONTH', label: '🗓️ This Month' },
              ] as const
            ).map((p) => {
              const active = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${active ? 'var(--ns-blue)' : 'var(--border-color)'}`,
                    background: active ? 'rgba(0, 82, 204, 0.12)' : 'var(--bg-input)',
                    color: active ? 'var(--ns-blue)' : 'var(--text-primary)',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-dim)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✕ Reset All Filters
          </button>
        </div>

        {/* Detailed Filters Form */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {/* Search */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
              🔍 Search Teacher
            </label>
            <input
              type="text"
              placeholder="Name, username, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          {/* Start Date */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
              From Date
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setDatePreset('ALL');
              }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
              To Date
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setDatePreset('ALL');
              }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          {/* Branch Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
              🏢 Center Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} Branch
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">All Departments</option>
              <option value="DOMESTIC">Domestic</option>
              <option value="OVERSEAS">Overseas</option>
            </select>
          </div>

          {/* Project Type Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
              Project Type
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">All Projects</option>
              <option value="FT">Full Time (FT)</option>
              <option value="FTEX">FT Experienced (FTEX)</option>
              <option value="TTP">TTP Trainee (TTP)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Filtered Reports Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Showing {filteredOutputs.length} of {initialOutputs.length} Output Records
          </span>
          {searchQuery && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Filtered by: &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Teacher</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Open Slots</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Booked Slots</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Booking Rate</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Exceptions (Tardy / Absent / Leave)</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Remarks</th>
                {canManageOutput && (
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredOutputs.length === 0 ? (
                <tr>
                  <td colSpan={canManageOutput ? 8 : 7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                    No daily output reports match your active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOutputs.map((item) => {
                  const rate = item.openSlots > 0 ? Math.round((item.bookedSlots / item.openSlots) * 100) : 0;
                  const hasException = item.classTardiness > 0 || item.absentClasses > 0 || item.earlyLeaveClasses > 0;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                      {/* Date */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {new Date(item.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Teacher */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.teacher.displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.teacher.realFullName}</div>
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(0, 82, 204, 0.08)', color: 'var(--ns-blue)', fontWeight: 600 }}>
                            {item.teacher.projectType}
                          </span>
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.08)', color: '#059669', fontWeight: 600 }}>
                            {item.teacher.department}
                          </span>
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(107, 114, 128, 0.08)', color: 'var(--text-dim)', fontWeight: 600 }}>
                            {item.teacher.branch || 'Atimonan'}
                          </span>
                        </div>
                      </td>

                      {/* Open Slots */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700 }}>
                        {item.openSlots}
                      </td>

                      {/* Booked Slots */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--ns-blue)' }}>
                        {item.bookedSlots}
                      </td>

                      {/* Booking % */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            background: rate >= 80 ? 'rgba(16, 185, 129, 0.12)' : rate >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: rate >= 80 ? '#059669' : rate >= 50 ? '#d97706' : '#dc2626',
                          }}
                        >
                          {rate}%
                        </span>
                      </td>

                      {/* Exceptions */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {hasException ? (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {item.classTardiness > 0 && (
                              <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontWeight: 700 }}>
                                ⚠️ {item.classTardiness} Tardy
                              </span>
                            )}
                            {item.absentClasses > 0 && (
                              <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c', fontWeight: 700 }}>
                                ❌ {item.absentClasses} Absent
                              </span>
                            )}
                            {item.earlyLeaveClasses > 0 && (
                              <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 700 }}>
                                🚪 {item.earlyLeaveClasses} Early Out
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            ✅ Clean Record
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)', fontSize: '0.8rem', maxWidth: '220px' }}>
                        {item.remarks || '—'}
                      </td>

                      {/* Action */}
                      {canManageOutput && (
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Record / Override Output Modal ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 540,
              width: '100%',
              padding: '1.75rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  📝 Administrative Daily Output Override
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Record or reconcile shift output metrics on behalf of a teacher.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-dim)' }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ {modalError}
              </div>
            )}

            {modalSuccess && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ✅ {modalSuccess}
              </div>
            )}

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Teacher Select */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Select Teacher *
                </label>
                <select
                  value={modalTeacherId}
                  onChange={(e) => setModalTeacherId(e.target.value)}
                  className="input"
                  required
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                >
                  <option value="">-- Choose Active Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.displayName} ({t.realFullName}) • {t.branch || 'Atimonan'} [{t.projectType}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Report Date *
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="input"
                  required
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                />
              </div>

              {/* Open vs Booked Slots */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    Open Slots *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="48"
                    value={modalOpenSlots}
                    onChange={(e) => setModalOpenSlots(Number(e.target.value))}
                    className="input"
                    required
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    Booked Slots *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="48"
                    value={modalBookedSlots}
                    onChange={(e) => setModalBookedSlots(Number(e.target.value))}
                    className="input"
                    required
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Exceptions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                    Tardiness (Mins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalTardiness}
                    onChange={(e) => setModalTardiness(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                    Absent Classes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalAbsent}
                    onChange={(e) => setModalAbsent(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem' }}>
                    Early Out Classes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalEarlyLeave}
                    onChange={(e) => setModalEarlyLeave(Number(e.target.value))}
                    className="input"
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Operational Remarks
                </label>
                <textarea
                  rows={2}
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  placeholder="Reason for override, slot adjustment, or class conduct remarks..."
                  className="input"
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'var(--ns-blue)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {isPending ? 'Saving...' : '💾 Save Output Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

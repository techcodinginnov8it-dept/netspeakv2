'use client';

import React, { useState, useTransition } from 'react';
import { reconcileStaffAttendanceAction } from '@/actions/staffOperations';
import { StaffAttendanceStatus } from '@prisma/client';

/** Format a date/ISO string as HH:MM (24-hour, locale-independent) to avoid SSR hydration mismatches. */
function fmtTime(value: string): string {
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface AttendanceItem {
  id: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  isChecklistComplete: boolean;
  absenceReason: string | null;
  notes: string | null;
  staffProfile: {
    id: string;
    roleType: string;
    branch: string;
    department: string;
    user: {
      fullName: string;
      email: string;
    };
  };
}

interface Props {
  attendances: AttendanceItem[];
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'EARLY_OUT', label: 'Early Out' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'SRD', label: 'SRD' },
  { value: 'NO_LOGOUT', label: 'No Logout' },
];

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Staff' },
  { value: 'ADMIN', label: 'Admin Only' },
  { value: 'IT', label: 'IT Only' },
];

function statusColor(status: string) {
  if (status === 'PRESENT') return { bg: 'rgba(13,148,136,0.1)', color: '#0F766E', border: 'rgba(13,148,136,0.25)' };
  if (status === 'LATE') return { bg: 'rgba(217,119,6,0.1)', color: '#B45309', border: 'rgba(217,119,6,0.25)' };
  if (status === 'ABSENT') return { bg: 'rgba(239,68,68,0.1)', color: '#DC2626', border: 'rgba(239,68,68,0.25)' };
  return { bg: 'rgba(100,116,139,0.1)', color: '#475569', border: 'rgba(100,116,139,0.25)' };
}

export default function StaffAttendanceRoster({ attendances }: Props) {
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Reconciliation modal state
  const [reconcileModalItem, setReconcileModalItem] = useState<AttendanceItem | null>(null);
  const [modalStatus, setModalStatus] = useState<StaffAttendanceStatus>(StaffAttendanceStatus.PRESENT);
  const [modalReason, setModalReason] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileSuccess, setReconcileSuccess] = useState<string | null>(null);

  const filtered = attendances.filter((item) => {
    if (roleFilter !== 'ALL' && item.staffProfile.roleType !== roleFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = item.staffProfile.user.fullName.toLowerCase().includes(q);
      const matchEmail = item.staffProfile.user.email.toLowerCase().includes(q);
      const matchBranch = item.staffProfile.branch.toLowerCase().includes(q);
      if (!matchName && !matchBranch && !matchEmail) return false;
    }
    return true;
  });

  // KPI calculations
  const totalCount = attendances.length;
  const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
  const lateCount = attendances.filter((a) => a.isLate || a.status === 'LATE').length;
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
  const checklistCompleteCount = attendances.filter((a) => a.isChecklistComplete).length;

  const handleOpenReconcile = (item: AttendanceItem) => {
    setReconcileModalItem(item);
    setModalStatus(item.status as StaffAttendanceStatus);
    setModalReason(item.absenceReason || '');
    setModalNotes(item.notes || '');
    setReconcileError(null);
    setReconcileSuccess(null);
  };

  const handleCloseReconcile = () => {
    if (isPending) return;
    setReconcileModalItem(null);
    setReconcileError(null);
    setReconcileSuccess(null);
  };

  const handleSaveReconcile = () => {
    if (!reconcileModalItem || isPending) return;
    setReconcileError(null);
    setReconcileSuccess(null);

    startTransition(async () => {
      try {
        const result = await reconcileStaffAttendanceAction(
          reconcileModalItem.id,
          modalStatus,
          modalReason,
          modalNotes
        );

        if (!result.success) {
          setReconcileError(result.error || 'Reconciliation failed. Please try again.');
        } else {
          setReconcileSuccess(`✅ Attendance for ${reconcileModalItem.staffProfile.user.fullName} has been updated to ${modalStatus}.`);
          // Close modal after a short delay so the user can see success
          setTimeout(() => {
            setReconcileModalItem(null);
            setReconcileSuccess(null);
          }, 1500);
        }
      } catch (err: any) {
        setReconcileError(err?.message || 'An unexpected error occurred. Please try again.');
      }
    });
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.45rem 0.75rem',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Scheduled', value: totalCount, color: 'var(--text-primary)' },
          { label: 'Present', value: presentCount, color: '#0F766E' },
          { label: 'Late Count', value: lateCount, color: '#f59e0b' },
          { label: 'Absences', value: absentCount, color: '#ef4444' },
          { label: 'Checklist Done', value: checklistCompleteCount, color: '#3b82f6' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--bg-card)',
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
        }}
      >
        <input
          id="roster-search"
          type="text"
          placeholder="Search by name, email, or branch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: '220px' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="roster-role-filter" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Role:</label>
          <select
            id="roster-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={selectStyle}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="roster-status-filter" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Status:</label>
          <select
            id="roster-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('ALL'); setStatusFilter('ALL'); }}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            ✕ Clear Filters
          </button>
        )}

        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>
          {filtered.length} of {totalCount} records
        </span>
      </div>

      {/* Roster Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Staff Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Role &amp; Branch</th>
              <th style={{ padding: '0.75rem 1rem' }}>Time In</th>
              <th style={{ padding: '0.75rem 1rem' }}>Time Out</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Checklist</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {attendances.length === 0
                    ? 'No attendance records found for today.'
                    : 'No records match the selected filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const sc = statusColor(item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.staffProfile.user.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.staffProfile.user.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: item.staffProfile.roleType === 'IT' ? 'rgba(0,82,204,0.1)' : 'rgba(125,110,216,0.12)',
                          color: item.staffProfile.roleType === 'IT' ? 'var(--ns-blue)' : '#6D28D9',
                          border: `1px solid ${item.staffProfile.roleType === 'IT' ? 'rgba(0,82,204,0.25)' : 'rgba(125,110,216,0.3)'}`,
                          marginRight: '0.5rem',
                        }}
                      >
                        {item.staffProfile.roleType}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.staffProfile.branch}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                      {item.timeIn ? fmtTime(item.timeIn) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)' }}>
                      {item.timeOut ? fmtTime(item.timeOut) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                        }}
                      >
                        {item.status}
                        {item.isLate && item.lateMinutes > 0 ? ` (${item.lateMinutes}m)` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {item.isChecklistComplete ? (
                        <span style={{ color: '#0F766E', fontWeight: 700, fontSize: '0.82rem' }}>✅ Complete</span>
                      ) : (
                        <span style={{ color: '#B45309', fontWeight: 700, fontSize: '0.82rem' }}>⏳ Incomplete</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenReconcile(item)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        ⚙️ Reconcile
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reconciliation Modal */}
      {reconcileModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseReconcile(); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ⚙️ Reconcile: {reconcileModalItem.staffProfile.user.fullName}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {reconcileModalItem.staffProfile.roleType} · {reconcileModalItem.staffProfile.branch} · Current status:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{reconcileModalItem.status}</strong>
            </p>

            {/* Error message */}
            {reconcileError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 'var(--radius-sm)',
                color: '#DC2626',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                ⚠️ {reconcileError}
              </div>
            )}

            {/* Success message */}
            {reconcileSuccess && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(13,148,136,0.08)',
                border: '1px solid rgba(13,148,136,0.35)',
                borderRadius: 'var(--radius-sm)',
                color: '#0F766E',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                {reconcileSuccess}
              </div>
            )}

            <div>
              <label htmlFor="reconcile-status" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                New Status:
              </label>
              <select
                id="reconcile-status"
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as StaffAttendanceStatus)}
                disabled={isPending || !!reconcileSuccess}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="EARLY_OUT">EARLY_OUT</option>
                <option value="ABSENT">ABSENT</option>
                <option value="SRD">SRD</option>
                <option value="NO_LOGOUT">NO_LOGOUT</option>
              </select>
            </div>

            <div>
              <label htmlFor="reconcile-reason" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Absence Reason (if applicable):
              </label>
              <input
                id="reconcile-reason"
                type="text"
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder="e.g. Medical emergency, Authorized leave"
                disabled={isPending || !!reconcileSuccess}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label htmlFor="reconcile-notes" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Admin Notes:
              </label>
              <textarea
                id="reconcile-notes"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="Operational remarks or follow-up instructions…"
                rows={3}
                disabled={isPending || !!reconcileSuccess}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                onClick={handleCloseReconcile}
                disabled={isPending}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReconcile}
                disabled={isPending || !!reconcileSuccess}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: reconcileSuccess ? '#0F766E' : 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  cursor: isPending || !!reconcileSuccess ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: reconcileSuccess ? 0.8 : 1,
                }}
              >
                {isPending ? (
                  <>
                    <span style={{
                      width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block', animation: 'roster-spin 0.7s linear infinite',
                    }} />
                    Saving…
                  </>
                ) : reconcileSuccess ? '✅ Saved' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes roster-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

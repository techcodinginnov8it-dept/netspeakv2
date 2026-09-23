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

export default function StaffAttendanceRoster({ attendances }: Props) {
  const [isPending, startTransition] = useTransition();
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'IT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Reconciliation modal state
  const [reconcileModalItem, setReconcileModalItem] = useState<AttendanceItem | null>(null);
  const [modalStatus, setModalStatus] = useState<StaffAttendanceStatus>(StaffAttendanceStatus.PRESENT);
  const [modalReason, setModalReason] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  const filtered = attendances.filter((item) => {
    if (roleFilter !== 'ALL' && item.staffProfile.roleType !== roleFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.staffProfile.user.fullName.toLowerCase().includes(q);
      const matchBranch = item.staffProfile.branch.toLowerCase().includes(q);
      if (!matchName && !matchBranch) return false;
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
  };

  const handleSaveReconcile = () => {
    if (!reconcileModalItem) return;
    startTransition(async () => {
      await reconcileStaffAttendanceAction(
        reconcileModalItem.id,
        modalStatus,
        modalReason,
        modalNotes
      );
      setReconcileModalItem(null);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Scheduled</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{totalCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: '#0F766E', textTransform: 'uppercase', fontWeight: 600 }}>Present</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#0F766E' }}>{presentCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 600 }}>Late Minutes Logged</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#f59e0b' }}>{lateCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>Absences</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#ef4444' }}>{absentCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 600 }}>Checklist Verified</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: '#3b82f6' }}>{checklistCompleteCount}</div>
        </div>
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
          type="text"
          placeholder="Search staff name or branch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '0.45rem 0.75rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            style={{
              padding: '0.45rem 0.65rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Staff</option>
            <option value="ADMIN">Admin Only</option>
            <option value="IT">IT Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.65rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="EARLY_OUT">Early Out</option>
            <option value="ABSENT">Absent</option>
            <option value="SRD">SRD</option>
            <option value="NO_LOGOUT">No Logout</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          overflowX: 'auto',
        }}
      >
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
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No staff attendance records match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
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
                        background: item.staffProfile.roleType === 'IT' ? 'rgba(0, 82, 204, 0.1)' : 'rgba(125, 110, 216, 0.12)',
                        color: item.staffProfile.roleType === 'IT' ? 'var(--ns-blue)' : '#6D28D9',
                        border: `1px solid ${item.staffProfile.roleType === 'IT' ? 'rgba(0, 82, 204, 0.25)' : 'rgba(125, 110, 216, 0.3)'}`,
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
                        background:
                          item.status === 'PRESENT'
                            ? 'rgba(13, 148, 136, 0.1)'
                            : item.status === 'LATE'
                            ? 'rgba(217, 119, 6, 0.1)'
                            : item.status === 'ABSENT'
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(100, 116, 139, 0.1)',
                        color:
                          item.status === 'PRESENT'
                            ? '#0F766E'
                            : item.status === 'LATE'
                            ? '#B45309'
                            : item.status === 'ABSENT'
                            ? '#DC2626'
                            : '#475569',
                        border: `1px solid ${
                          item.status === 'PRESENT'
                            ? 'rgba(13, 148, 136, 0.25)'
                            : item.status === 'LATE'
                            ? 'rgba(217, 119, 6, 0.25)'
                            : item.status === 'ABSENT'
                            ? 'rgba(239, 68, 68, 0.25)'
                            : 'rgba(100, 116, 139, 0.25)'
                        }`,
                      }}
                    >
                      {item.status}
                      {item.isLate && item.lateMinutes > 0 ? ` (${item.lateMinutes}m)` : ''}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {item.isChecklistComplete ? (
                      <span style={{ color: '#0F766E', fontWeight: 700 }}>✅ Complete</span>
                    ) : (
                      <span style={{ color: '#B45309', fontWeight: 700 }}>⏳ Incomplete</span>
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
                      }}
                    >
                      ⚙️ Reconcile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reconciliation Modal */}
      {reconcileModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
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
              Reconcile Attendance: {reconcileModalItem.staffProfile.user.fullName}
            </h3>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Status:
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as StaffAttendanceStatus)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
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
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Absence Reason (if absent or irregular):
              </label>
              <input
                type="text"
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder="e.g. Medical emergency, Authorized leave"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Admin Notes:
              </label>
              <textarea
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="Operational remarks or follow-up instructions..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setReconcileModalItem(null)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReconcile}
                disabled={isPending}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

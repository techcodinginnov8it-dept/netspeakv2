'use client';

import React, { useState, useTransition } from 'react';
import { verifyTeacherAttendanceAction } from '@/actions/attendance';
import { fmtTime } from '@/lib/formatTime';

type AttendanceRecord = {
  id: string;
  timeIn: Date | string | null;
  timeInPhoto: string | null;
  timeOut: Date | string | null;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  isEarlyOut: boolean;
  earlyOutMinutes: number;
  absenceReason: string | null;
  adminRemarks: string | null;
  isVerifiedByAdmin: boolean;
};

type RosterItem = {
  teacherId: string;
  displayName: string;
  realFullName: string;
  cellphone: string;
  department: string;
  projectType: string;
  shiftName: string;
  attendance: AttendanceRecord | null;
};

export default function AttendanceRosterTable({
  initialRoster,
  canVerify,
}: {
  initialRoster: RosterItem[];
  canVerify: boolean;
}) {
  const [roster, setRoster] = useState<RosterItem[]>(initialRoster);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<{ name: string; photo: string } | null>(null);

  // Verification modal state
  const [editingAttendance, setEditingAttendance] = useState<{
    id: string;
    teacherName: string;
    currentStatus: string;
    remarks: string;
    reason: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredRoster = roster.filter((item) => {
    if (filterStatus !== 'ALL') {
      const st = item.attendance ? item.attendance.status : 'ABSENT_INVALID';
      if (filterStatus === 'NO_LOGIN' && item.attendance?.timeIn) return false;
      if (filterStatus !== 'NO_LOGIN' && st !== filterStatus) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.displayName.toLowerCase().includes(q) ||
        item.realFullName.toLowerCase().includes(q) ||
        item.cellphone.includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (attendance: AttendanceRecord | null) => {
    if (!attendance || !attendance.timeIn) {
      return (
        <span style={{
          padding: '4px 10px',
          borderRadius: '999px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#DC2626',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}>
          No Login / Absent
        </span>
      );
    }
    switch (attendance.status) {
      case 'PRESENT':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            color: '#0F766E',
            border: '1px solid rgba(13, 148, 136, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            Present
          </span>
        );
      case 'LATE':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            color: '#B45309',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            Late ({attendance.lateMinutes}m)
          </span>
        );
      case 'EARLY_OUT':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#DC2626',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            Early Out ({attendance.earlyOutMinutes}m)
          </span>
        );
      case 'SRD':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(125, 110, 216, 0.12)',
            color: '#6D28D9',
            border: '1px solid rgba(125, 110, 216, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            SRD (Swapped)
          </span>
        );
      default:
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--foreground)',
            fontSize: '0.75rem',
          }}>
            {attendance.status}
          </span>
        );
    }
  };

  const handleSaveVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    startTransition(async () => {
      await verifyTeacherAttendanceAction(editingAttendance.id, {
        status: editingAttendance.currentStatus as any,
        adminRemarks: editingAttendance.remarks,
        absenceReason: editingAttendance.reason,
      });

      // Update local state
      setRoster((prev) =>
        prev.map((item) => {
          if (item.attendance && item.attendance.id === editingAttendance.id) {
            return {
              ...item,
              attendance: {
                ...item.attendance,
                status: editingAttendance.currentStatus,
                adminRemarks: editingAttendance.remarks,
                absenceReason: editingAttendance.reason,
                isVerifiedByAdmin: true,
              },
            };
          }
          return item;
        })
      );
      setEditingAttendance(null);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search and Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'PRESENT', 'LATE', 'EARLY_OUT', 'NO_LOGIN', 'SRD'].map((st) => {
            const FILTER_LABELS: Record<string, string> = {
              ALL:       'All Records',
              PRESENT:   'Present',
              LATE:      'Late',
              EARLY_OUT: 'Early Out',
              NO_LOGIN:  'No Login',
              SRD:       'SRD',
            };
            const isActive = filterStatus === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                  ...(isActive ? { color: '#FFFFFF' } : {}),
                }}
              >
                {FILTER_LABELS[st] ?? st}
              </button>
            );
          })}
        </div>

        <div style={{ width: 260 }}>
          <input
            type="text"
            className="input"
            placeholder="Search teacher by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '12px 16px' }}>Teacher</th>
              <th style={{ padding: '12px 16px' }}>Scheduled Shift</th>
              <th style={{ padding: '12px 16px' }}>Time In (Arrival)</th>
              <th style={{ padding: '12px 16px' }}>Freshness Photo</th>
              <th style={{ padding: '12px 16px' }}>Time Out</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoster.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                  No attendance records found for this view.
                </td>
              </tr>
            ) : (
              filteredRoster.map((row) => (
                <tr key={row.teacherId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <strong style={{ display: 'block' }}>{row.displayName}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                      {row.realFullName} ({row.department})
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.85rem' }}>{row.shiftName}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.attendance?.timeIn ? (
                      <div>
                        <strong>{fmtTime(row.attendance.timeIn)}</strong>
                        {row.attendance.isLate && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#DC2626' }}>
                            +{row.attendance.lateMinutes}m Late
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.attendance?.timeInPhoto ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPhoto({
                            name: row.displayName,
                            photo: row.attendance!.timeInPhoto!,
                          })
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <img
                          src={row.attendance.timeInPhoto}
                          alt="Freshness check"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid var(--primary)',
                          }}
                        />
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.attendance?.timeOut ? (
                      <div>
                        <strong>{fmtTime(row.attendance.timeOut)}</strong>
                        {row.attendance.isEarlyOut && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#DC2626' }}>
                            -{row.attendance.earlyOutMinutes}m Early
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {getStatusBadge(row.attendance)}
                    {row.attendance?.isVerifiedByAdmin && (
                      <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--success)' }}>
                        ✓
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {row.attendance && canVerify ? (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingAttendance({
                            id: row.attendance!.id,
                            teacherName: row.displayName,
                            currentStatus: row.attendance!.status,
                            remarks: row.attendance!.adminRemarks || '',
                            reason: row.attendance!.absenceReason || '',
                          })
                        }
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      >
                        Verify / Edit
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Freshness Check Photo Modal */}
      {selectedPhoto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
        }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
              Freshness Check Selfie: {selectedPhoto.name}
            </h3>
            <img
              src={selectedPhoto.photo}
              alt="Arrival verification"
              style={{ width: '100%', borderRadius: 'var(--radius)', maxHeight: 360, objectFit: 'contain' }}
            />
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="btn btn-secondary"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification / Reconciliation Modal */}
      {editingAttendance && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>
              Verify Attendance: {editingAttendance.teacherName}
            </h3>
            <form onSubmit={handleSaveVerification} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Attendance Status</label>
                <select
                  className="input"
                  value={editingAttendance.currentStatus}
                  onChange={(e) =>
                    setEditingAttendance({ ...editingAttendance, currentStatus: e.target.value })
                  }
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="EARLY_OUT">Early Out</option>
                  <option value="ABSENT_VALID">Absent (Valid / Authorized)</option>
                  <option value="ABSENT_INVALID">Absent (Invalid / Unauthorized)</option>
                  <option value="NO_LOGOUT">No Logout Recorded</option>
                  <option value="SRD">Switch Rest Day (SRD)</option>
                  <option value="APPROVED_REST_DAY">Approved Rest Day</option>
                </select>
              </div>

              <div className="form-group">
                <label>Absence / Exception Reason</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Medical emergency, Power interruption"
                  value={editingAttendance.reason}
                  onChange={(e) =>
                    setEditingAttendance({ ...editingAttendance, reason: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Admin Remarks / Verification Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Notes on manual verification..."
                  value={editingAttendance.remarks}
                  onChange={(e) =>
                    setEditingAttendance({ ...editingAttendance, remarks: e.target.value })
                  }
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingAttendance(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary"
                >
                  {isPending ? 'Saving...' : 'Save & Verify Record ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

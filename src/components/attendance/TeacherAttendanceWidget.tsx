'use client';

import React, { useState, useTransition } from 'react';
import FreshnessCheckModal from './FreshnessCheckModal';
import DailyOutputModal from '../output/DailyOutputModal';
import { recordTeacherLogoutAction } from '@/actions/attendance';
import { fmtTime } from '@/lib/formatTime';

type AttendanceState = {
  timeIn: Date | string | null;
  timeOut: Date | string | null;
  isLate: boolean;
  lateMinutes: number;
  isEarlyOut: boolean;
  earlyOutMinutes: number;
  status: string;
} | null;

type DailyOutputData = {
  openSlots: number;
  bookedSlots: number;
  classTardiness: number;
  absentClasses: number;
  earlyLeaveClasses: number;
  remarks?: string | null;
} | null;

export default function TeacherAttendanceWidget({
  shiftName,
  startTime,
  endTime,
  initialAttendance,
  initialDailyOutput,
  announcements,
}: {
  shiftName: string;
  startTime: string;
  endTime: string;
  initialAttendance: AttendanceState;
  initialDailyOutput?: DailyOutputData;
  announcements?: Array<{ id: string; title: string; content: string }>;
}) {
  const [attendance, setAttendance] = useState<AttendanceState>(initialAttendance);
  const [modalOpen, setModalOpen] = useState(false);
  const [dailyOutputModalOpen, setDailyOutputModalOpen] = useState(false);
  const [dailyOutputSubmitted, setDailyOutputSubmitted] = useState(!!initialDailyOutput);
  const [logoutReason, setLogoutReason] = useState('');
  const [showEarlyOutInput, setShowEarlyOutInput] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutSuccess, setLogoutSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTimeInSuccess = (res: any) => {
    setAttendance({
      timeIn: new Date().toISOString(),
      timeOut: null,
      isLate: res.isLate,
      lateMinutes: res.lateMinutes,
      isEarlyOut: false,
      earlyOutMinutes: 0,
      status: res.isLate ? 'LATE' : 'PRESENT',
    });
  };

  const handleLogout = (e: React.FormEvent) => {
    e.preventDefault();
    setLogoutError(null);
    startTransition(async () => {
      const res = await recordTeacherLogoutAction(logoutReason);
      if (res.error) {
        setLogoutError(res.error);
        if (res.error.includes('Early Time-Off')) {
          setShowEarlyOutInput(true);
        }
      } else {
        setAttendance((prev) =>
          prev
            ? {
                ...prev,
                timeOut: new Date().toISOString(),
                isEarlyOut: !!res.isEarlyOut,
                earlyOutMinutes: res.earlyOutMinutes || 0,
                status: res.isEarlyOut ? 'EARLY_OUT' : prev.status,
              }
            : null
        );
        setLogoutSuccess(`Shift completed! Time-out recorded at ${res.logoutTimestamp}.`);
        setShowEarlyOutInput(false);
      }
    });
  };

  return (
    <div className="card" style={{ padding: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.2rem' }}>⏰</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Teacher Attendance & Shift</h2>
          </div>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>
            Scheduled Shift: <strong>{shiftName}</strong> ({startTime} - {endTime})
          </p>
        </div>

        {/* Current status chip */}
        <div>
          {attendance?.timeOut ? (
            <span style={{
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(13, 148, 136, 0.12)',
              color: '#0F766E',
              border: '1px solid rgba(13, 148, 136, 0.25)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}>
              ✓ Shift Completed
            </span>
          ) : attendance?.timeIn ? (
            <span style={{
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: attendance.isLate ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 82, 204, 0.10)',
              color: attendance.isLate ? '#B91C1C' : '#0052CC',
              border: `1px solid ${attendance.isLate ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 82, 204, 0.25)'}`,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}>
              {attendance.isLate ? `⚠️ On Duty (Late ${attendance.lateMinutes}m)` : '🟢 On Duty (Present)'}
            </span>
          ) : (
            <span style={{
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              color: '#B45309',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}>
              ⏳ Awaiting Freshness Check
            </span>
          )}
        </div>
      </div>

      {/* Shift Window Rules Banner */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        color: 'var(--foreground-muted)',
        marginBottom: '20px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div>• <strong>T-30:</strong> Login window opens 30m before shift</div>
        <div>• <strong>T-10:</strong> Admin reminder window</div>
        <div>• <strong>T-0:</strong> Arrival after shift start is marked Late</div>
        <div>• <strong>Logout:</strong> Locked until 15m before shift end</div>
      </div>

      {logoutError && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius)',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.35)',
          color: '#DC2626',
          fontWeight: 600,
          fontSize: '0.85rem',
          marginBottom: '16px',
        }}>
          ⚠️ {logoutError}
        </div>
      )}

      {logoutSuccess && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius)',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          border: '1.5px solid #0D9488',
          color: '#0F766E',
          fontWeight: 600,
          fontSize: '0.9rem',
          marginBottom: '16px',
        }}>
          ✓ {logoutSuccess}
        </div>
      )}

      {/* Action triggers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {attendance?.timeIn && (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Time In: <strong>{fmtTime(attendance.timeIn)}</strong>
              {attendance.timeOut && (
                <span style={{ marginLeft: '12px' }}>
                  | Time Out: <strong>{fmtTime(attendance.timeOut)}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          {!attendance?.timeIn ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.95rem' }}
            >
              📸 Start Freshness Check & Time In
            </button>
          ) : !attendance.timeOut ? (
            <form onSubmit={handleLogout} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {showEarlyOutInput && (
                <input
                  type="text"
                  placeholder="Reason for early departure..."
                  value={logoutReason}
                  onChange={(e) => setLogoutReason(e.target.value)}
                  className="input"
                  style={{ width: 220, fontSize: '0.85rem', padding: '6px 10px' }}
                  required
                />
              )}
              <button
                type="button"
                onClick={() => setDailyOutputModalOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem', borderColor: 'var(--ns-blue)', color: 'var(--ns-blue)' }}
              >
                📝 {dailyOutputSubmitted ? 'Edit Daily Output' : 'Submit Daily Output'}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn"
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                }}
              >
                {isPending ? 'Logging Out...' : 'Shift Time Out ⏱'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setDailyOutputModalOpen(true)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                📝 View / Edit Daily Output (48h)
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
                Completed for today. Have a great rest day!
              </span>
            </div>
          )}
        </div>
      </div>

      <FreshnessCheckModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleTimeInSuccess}
      />

      <DailyOutputModal
        isOpen={dailyOutputModalOpen}
        onClose={() => setDailyOutputModalOpen(false)}
        initialData={initialDailyOutput}
        announcements={announcements}
      />
    </div>
  );
}

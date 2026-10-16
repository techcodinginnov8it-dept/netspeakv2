'use client';

import React, { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  recordStaffTimeInAction,
  recordStaffTimeOutAction,
  submitStaffChecklistAction,
} from '@/actions/staffOperations';
import {
  ADMIN_DAILY_CHECKLIST,
  IT_DAILY_CHECKLIST,
  IT_WEEKLY_CHECKLIST,
  IT_MONTHLY_CHECKLIST,
  ChecklistItemDef,
} from '@/lib/operations/checklists';
import { fmtTime } from '@/lib/formatTime';

interface StaffProfileData {
  id: string;
  roleType: 'ADMIN' | 'IT';
  branch: string;
  department: string;
  user: {
    fullName: string;
    username: string;
    email: string;
  };
}

interface ChecklistResponse {
  taskKey: string;
  isCompleted: boolean;
  notes: string | null;
}

interface StaffAttendanceData {
  id: string;
  date: string | Date;
  timeIn: string | Date | null;
  timeOut: string | Date | null;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  isChecklistComplete: boolean;
  checklistResponses: ChecklistResponse[];
}

interface Props {
  profile: StaffProfileData;
  todayAttendance: StaffAttendanceData | null;
}

function buildCheckedMap(responses: ChecklistResponse[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  responses.forEach((r) => { map[r.taskKey] = r.isCompleted; });
  return map;
}

function buildNotesMap(responses: ChecklistResponse[]): Record<string, string> {
  const map: Record<string, string> = {};
  responses.forEach((r) => { if (r.notes) map[r.taskKey] = r.notes; });
  return map;
}

export default function StaffOperationsDesk({ profile, todayAttendance: initialAttendance }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // Local attendance state (synced from server via prop)
  const [attendance, setAttendance] = useState<StaffAttendanceData | null>(initialAttendance);

  // Checklist state — initialized from attendance responses
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(
    buildCheckedMap(initialAttendance?.checklistResponses ?? [])
  );
  const [notesMap, setNotesMap] = useState<Record<string, string>>(
    buildNotesMap(initialAttendance?.checklistResponses ?? [])
  );

  // When a checklist save triggers router.refresh(), we DON'T want to reset the
  // checkedMap from props — the optimistic update is already correct. Only reset
  // on a genuine new attendance record (e.g. after Time In) or on first load.
  const skipChecklistSyncRef = useRef<boolean>(false);

  // Sync local attendance state whenever the server sends new data
  const prevAttendanceRef = useRef<string>(JSON.stringify(initialAttendance));
  useEffect(() => {
    const next = JSON.stringify(initialAttendance);
    if (next !== prevAttendanceRef.current) {
      prevAttendanceRef.current = next;
      setAttendance(initialAttendance);
      // Only re-sync checklist UI from server if this wasn't triggered by a checklist save
      // (a save already optimistically updates checkedMap; re-syncing would cause flicker/revert)
      if (!skipChecklistSyncRef.current && initialAttendance?.checklistResponses) {
        setCheckedMap(buildCheckedMap(initialAttendance.checklistResponses));
        setNotesMap(buildNotesMap(initialAttendance.checklistResponses));
      }
      skipChecklistSyncRef.current = false;
    }
  }, [initialAttendance]);

  const isIT = profile.roleType === 'IT';
  const dailyDefs = isIT ? IT_DAILY_CHECKLIST : ADMIN_DAILY_CHECKLIST;

  // Filter current displayed items based on category
  let currentDefs: ChecklistItemDef[] = [];
  if (activeCategory === 'DAILY') {
    currentDefs = dailyDefs;
  } else if (activeCategory === 'WEEKLY') {
    currentDefs = IT_WEEKLY_CHECKLIST;
  } else if (activeCategory === 'MONTHLY') {
    currentDefs = IT_MONTHLY_CHECKLIST;
  }

  const dailyCompleteCount = dailyDefs.filter((d) => checkedMap[d.key]).length;

  const handleTimeIn = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await recordStaffTimeInAction();
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record Time In');
      } else {
        // Optimistically update local attendance state (res.attendance won't have checklistResponses)
        const att = res.attendance as any;
        setAttendance({
          id: att.id,
          date: att.date,
          timeIn: att.timeIn,
          timeOut: att.timeOut,
          status: att.status,
          isLate: att.isLate,
          lateMinutes: att.lateMinutes,
          isChecklistComplete: false,
          checklistResponses: [],
        });
        setSuccessMsg('Time In successfully recorded! Please review and complete your checklist.');
        router.refresh();
      }
    });
  };

  const handleToggleTask = (key: string) => {
    if (attendance?.timeOut) {
      setErrorMsg('Your shift has ended (Time Out recorded). Checklist is finalized and locked from changes.');
      return;
    }
    if (!attendance) {
      setErrorMsg('Please record Time In first before checking tasks.');
      return;
    }
    setCheckedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChecklist = () => {
    if (!attendance) {
      setErrorMsg('Please record Time In first before saving your checklist.');
      return;
    }

    if (attendance.timeOut) {
      setErrorMsg('Your shift has ended (Time Out recorded). Checklist is locked and cannot be modified.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const allDefs = [
      ...dailyDefs,
      ...(isIT ? IT_WEEKLY_CHECKLIST : []),
      ...(isIT ? IT_MONTHLY_CHECKLIST : []),
    ];

    const itemsToSubmit = allDefs.map((def) => ({
      taskCategory: def.category,
      taskKey: def.key,
      taskLabel: def.label,
      isCompleted: !!checkedMap[def.key],
      notes: notesMap[def.key] || '',
    }));

    startTransition(async () => {
      const res = await submitStaffChecklistAction({
        attendanceId: attendance.id,
        items: itemsToSubmit,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to save checklist');
      } else {
        skipChecklistSyncRef.current = true;

        // Optimistically merge saved items into local attendance
        setAttendance((prev) => {
          if (!prev) return prev;
          const existing = [...(prev.checklistResponses ?? [])];
          for (const item of itemsToSubmit) {
            const idx = existing.findIndex((r) => r.taskKey === item.taskKey);
            const updated = { taskKey: item.taskKey, isCompleted: item.isCompleted, notes: item.notes || null };
            if (idx >= 0) existing[idx] = updated;
            else existing.push(updated);
          }
          return {
            ...prev,
            isChecklistComplete: !!res.isChecklistComplete,
            checklistResponses: existing,
          };
        });

        const completedCount = allDefs.filter((d) => checkedMap[d.key]).length;
        setSuccessMsg(
          res.isChecklistComplete
            ? '✅ 100% Mandatory checklist completed! Time Out is now unlocked.'
            : `💾 Checklist progress saved (${completedCount} of ${allDefs.length} items completed). Complete 100% of daily tasks to unlock Time Out.`
        );
        router.refresh();
      }
    });
  };

  const handleTimeOut = () => {
    if (!attendance) {
      setErrorMsg('No attendance record found for today.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await recordStaffTimeOutAction(attendance.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record Time Out');
      } else {
        // Optimistically update local attendance
        setAttendance((prev) =>
          prev ? { ...prev, timeOut: new Date().toISOString() } : prev
        );
        setSuccessMsg('Time Out successfully confirmed! End-of-shift duties verified.');
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          border: '1px solid var(--border-light)',
          borderLeft: '4px solid var(--ns-blue)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{isIT ? '💻' : '🏢'}</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              {isIT ? 'IT Operations Desk' : 'Center Admin Operations Desk'}
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: isIT ? 'rgba(0, 82, 204, 0.1)' : 'var(--ns-violet-pale)',
                color: isIT ? 'var(--ns-blue)' : 'var(--ns-violet-dark)',
                border: `1px solid ${isIT ? 'rgba(0, 82, 204, 0.25)' : 'rgba(125, 110, 216, 0.25)'}`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              {profile.roleType} • {profile.branch}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Staff Member: <strong style={{ color: 'var(--text-primary)' }}>{profile.user.fullName}</strong> ({profile.department})
          </p>
        </div>

        {/* Time In / Out Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!attendance?.timeIn ? (
            <button
              onClick={handleTimeIn}
              disabled={isPending}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                background: isPending
                  ? 'var(--border-medium)'
                  : 'linear-gradient(135deg, var(--ns-green) 0%, var(--ns-green-dark) 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.15s ease',
              }}
            >
              {isPending ? (
                <>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }} />
                  Recording...
                </>
              ) : '⏰ TIME IN (Shift Start)'}
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.65rem',
                  background: 'var(--ns-green-pale)',
                  border: '1px solid var(--border-green)',
                  color: 'var(--ns-green-dark)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                }}
              >
                In: {fmtTime(attendance.timeIn)}
              </span>

              {!attendance.timeOut ? (
                <button
                  onClick={handleTimeOut}
                  disabled={isPending || !attendance.isChecklistComplete}
                  title={
                    !attendance.isChecklistComplete
                      ? 'Time Out is locked until End-of-Shift Checklist is complete'
                      : 'Confirm End of Shift'
                  }
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: attendance.isChecklistComplete ? 'var(--ns-red)' : 'var(--border-light)',
                    color: attendance.isChecklistComplete ? '#fff' : 'var(--text-muted)',
                    border: attendance.isChecklistComplete ? 'none' : '1px solid var(--border-medium)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: attendance.isChecklistComplete && !isPending ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  🚪 TIME OUT
                  {!attendance.isChecklistComplete && ' (Locked 🔒)'}
                </button>
              ) : (
                <span
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.65rem',
                    background: 'rgba(220, 38, 38, 0.08)',
                    border: '1px solid rgba(220, 38, 38, 0.35)',
                    color: '#DC2626',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                  }}
                >
                  Out: {fmtTime(attendance.timeOut)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            color: '#DC2626',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(15, 118, 110, 0.08)',
            border: '1px solid rgba(15, 118, 110, 0.35)',
            color: '#0F766E',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          ✅ {successMsg}
        </div>
      )}

      {/* Mandatory Lockout Notice */}
      <div
        style={{
          background: attendance?.isChecklistComplete ? 'rgba(15, 118, 110, 0.08)' : 'rgba(180, 83, 9, 0.08)',
          border: `1px solid ${attendance?.isChecklistComplete ? 'rgba(15,118,110,0.4)' : 'rgba(180,83,9,0.4)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            {attendance?.isChecklistComplete
              ? '✅ End-of-Shift Checklist Complete'
              : '🔒 End-of-Shift Checklist Lockout Rule'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {attendance?.isChecklistComplete
              ? 'All mandatory tasks verified. You are authorized to complete Time Out when your scheduled shift concludes.'
              : `Admin & IT logout is strictly restricted until daily checklist items are marked complete. Progress: ${dailyCompleteCount} of ${dailyDefs.length} items verified.`}
          </div>
        </div>

        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: attendance?.isChecklistComplete ? '#0F766E' : '#B45309' }}>
          {Math.round((dailyCompleteCount / dailyDefs.length) * 100)}%
        </div>
      </div>

      {/* Category Tabs (IT has Daily / Weekly / Monthly) */}
      {isIT && (
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((cat) => {
            const labels: Record<string, string> = {
              DAILY: '📋 Daily Routine Checklist',
              WEEKLY: '🗓️ Weekly IT Tasks',
              MONTHLY: '📊 Monthly IT Tasks',
            };
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: activeCategory === cat ? 'var(--accent)' : 'transparent',
                  color: activeCategory === cat ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>
      )}

      {/* Checklist Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          padding: '1.25rem',
        }}
      >
        {(() => {
          const isTimedOut = !!attendance?.timeOut;
          const isNotStarted = !attendance?.timeIn;
          const isChecklistDisabled = isTimedOut || isNotStarted;

          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                    {activeCategory} Checklist Items
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {isTimedOut ? (
                      <span style={{ color: 'var(--ns-green)', fontWeight: 600 }}>
                        🔒 Shift completed at {fmtTime(attendance.timeOut)}. All checklist duties are finalized and locked in read-only mode.
                      </span>
                    ) : attendance ? (
                      'Select all verified duties. Time Out becomes available when all daily mandatory tasks are checked.'
                    ) : (
                      '⚠️ Record your Time In first to enable checklist saving.'
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveChecklist}
                  disabled={isPending || isChecklistDisabled}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isChecklistDisabled ? 'var(--border-medium)' : 'var(--accent)',
                    color: isChecklistDisabled ? 'var(--text-muted)' : '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: isChecklistDisabled || isPending ? 'not-allowed' : 'pointer',
                    opacity: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isPending ? (
                    <>
                      <span style={{
                        width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        display: 'inline-block', animation: 'spin 0.7s linear infinite',
                      }} />
                      Saving...
                    </>
                  ) : isTimedOut ? (
                    '🔒 Shift Finalized (Locked)'
                  ) : (
                    '💾 Save Checklist Progress'
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentDefs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                    No checklist items for this category.
                  </div>
                ) : currentDefs.map((def) => {
                  const isChecked = !!checkedMap[def.key];
                  return (
                    <div
                      key={def.key}
                      onClick={() => {
                        if (!isChecklistDisabled) handleToggleTask(def.key);
                      }}
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-disabled={isChecklistDisabled}
                      tabIndex={isChecklistDisabled ? -1 : 0}
                      onKeyDown={(e) => {
                        if (!isChecklistDisabled && (e.key === ' ' || e.key === 'Enter')) {
                          handleToggleTask(def.key);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)',
                        border: `1px solid ${isChecked ? '#3b82f6' : 'var(--border-color)'}`,
                        cursor: isChecklistDisabled ? 'not-allowed' : 'pointer',
                        opacity: isTimedOut ? 0.85 : 1,
                        transition: 'all 0.15s ease',
                        outline: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isChecklistDisabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (!isChecklistDisabled) handleToggleTask(def.key);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          marginTop: '0.2rem',
                          cursor: isChecklistDisabled ? 'not-allowed' : 'pointer',
                          width: '16px',
                          height: '16px',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <span>{def.label}</span>
                          {isTimedOut && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(107, 114, 128, 0.12)',
                                color: isChecked ? '#059669' : '#6B7280',
                                fontWeight: 700,
                              }}
                            >
                              {isChecked ? 'Completed & Locked' : 'Locked'}
                            </span>
                          )}
                        </div>
                        {def.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                            {def.description}
                          </div>
                        )}
                      </div>
                      {isChecked && (
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>✅</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

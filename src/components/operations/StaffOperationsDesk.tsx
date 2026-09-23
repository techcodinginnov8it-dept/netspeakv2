'use client';

import React, { useState, useTransition } from 'react';
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

interface StaffAttendanceData {
  id: string;
  date: string | Date;
  timeIn: string | Date | null;
  timeOut: string | Date | null;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  isChecklistComplete: boolean;
  checklistResponses: Array<{
    taskKey: string;
    isCompleted: boolean;
    notes: string | null;
  }>;
}

interface Props {
  profile: StaffProfileData;
  todayAttendance: StaffAttendanceData | null;
}

export default function StaffOperationsDesk({ profile, todayAttendance }: Props) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // Initialize checklist states from today's attendance
  const isIT = profile.roleType === 'IT';
  const dailyDefs = isIT ? IT_DAILY_CHECKLIST : ADMIN_DAILY_CHECKLIST;

  // Track checked states
  const initialChecked: Record<string, boolean> = {};
  const initialNotes: Record<string, string> = {};

  if (todayAttendance?.checklistResponses) {
    todayAttendance.checklistResponses.forEach((r) => {
      initialChecked[r.taskKey] = r.isCompleted;
      if (r.notes) initialNotes[r.taskKey] = r.notes;
    });
  }

  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(initialChecked);
  const [notesMap, setNotesMap] = useState<Record<string, string>>(initialNotes);

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
  const isAllDailyCompleted = dailyCompleteCount === dailyDefs.length;

  const handleTimeIn = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await recordStaffTimeInAction();
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record Time In');
      } else {
        setSuccessMsg('Time In successfully recorded! Please review and complete your checklist.');
      }
    });
  };

  const handleToggleTask = (key: string) => {
    setCheckedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChecklist = () => {
    if (!todayAttendance) {
      setErrorMsg('Please record Time In first before saving your checklist.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    const itemsToSubmit = currentDefs.map((def) => ({
      taskCategory: def.category,
      taskKey: def.key,
      taskLabel: def.label,
      isCompleted: !!checkedMap[def.key],
      notes: notesMap[def.key] || '',
    }));

    startTransition(async () => {
      const res = await submitStaffChecklistAction({
        attendanceId: todayAttendance.id,
        items: itemsToSubmit,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to save checklist');
      } else {
        setSuccessMsg(
          res.isChecklistComplete
            ? 'Checklist updated! All mandatory tasks are verified. Time Out is now unlocked.'
            : 'Checklist progress saved. Complete remaining mandatory items to unlock Time Out.'
        );
      }
    });
  };

  const handleTimeOut = () => {
    if (!todayAttendance) {
      setErrorMsg('No attendance record found for today.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await recordStaffTimeOutAction(todayAttendance.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record Time Out');
      } else {
        setSuccessMsg('Time Out successfully confirmed! End-of-shift duties verified.');
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
          {!todayAttendance?.timeIn ? (
            <button
              onClick={handleTimeIn}
              disabled={isPending}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--ns-green) 0%, var(--ns-green-dark) 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              ⏰ TIME IN (Shift Start)
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
                In: {fmtTime(todayAttendance.timeIn)}
              </span>

              {!todayAttendance.timeOut ? (
                <button
                  onClick={handleTimeOut}
                  disabled={isPending || !todayAttendance.isChecklistComplete}
                  title={
                    !todayAttendance.isChecklistComplete
                      ? 'Time Out is locked until End-of-Shift Checklist is complete'
                      : 'Confirm End of Shift'
                  }
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: todayAttendance.isChecklistComplete ? 'var(--ns-red)' : 'var(--border-light)',
                    color: todayAttendance.isChecklistComplete ? '#fff' : 'var(--text-muted)',
                    border: todayAttendance.isChecklistComplete ? 'none' : '1px solid var(--border-medium)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: todayAttendance.isChecklistComplete ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  🚪 TIME OUT
                  {!todayAttendance.isChecklistComplete && ' (Locked 🔒)'}
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
                  Out: {fmtTime(todayAttendance.timeOut)}
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
          background: todayAttendance?.isChecklistComplete ? 'rgba(15, 118, 110, 0.08)' : 'rgba(180, 83, 9, 0.08)',
          border: `1px solid ${todayAttendance?.isChecklistComplete ? 'rgba(15,118,110,0.4)' : 'rgba(180,83,9,0.4)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            {todayAttendance?.isChecklistComplete
              ? '✅ End-of-Shift Checklist Complete'
              : '🔒 End-of-Shift Checklist Lockout Rule'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {todayAttendance?.isChecklistComplete
              ? 'All mandatory tasks verified. You are authorized to complete Time Out when your scheduled shift concludes.'
              : `Admin & IT logout is strictly restricted until daily checklist items are marked complete. Progress: ${dailyCompleteCount} of ${dailyDefs.length} items verified.`}
          </div>
        </div>

        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: todayAttendance?.isChecklistComplete ? '#0F766E' : '#B45309' }}>
          {Math.round((dailyCompleteCount / dailyDefs.length) * 100)}%
        </div>
      </div>

      {/* Category Tabs (IT has Daily / Weekly / Monthly) */}
      {isIT && (
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveCategory('DAILY')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: activeCategory === 'DAILY' ? 'var(--accent)' : 'transparent',
              color: activeCategory === 'DAILY' ? '#fff' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            📋 Daily Routine Checklist
          </button>
          <button
            onClick={() => setActiveCategory('WEEKLY')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: activeCategory === 'WEEKLY' ? 'var(--accent)' : 'transparent',
              color: activeCategory === 'WEEKLY' ? '#fff' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            🗓️ Weekly IT Tasks
          </button>
          <button
            onClick={() => setActiveCategory('MONTHLY')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: activeCategory === 'MONTHLY' ? 'var(--accent)' : 'transparent',
              color: activeCategory === 'MONTHLY' ? '#fff' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            📊 Monthly IT Tasks
          </button>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              {activeCategory} Checklist Items
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Select all verified duties. Time Out becomes available when all daily mandatory tasks are checked.
            </span>
          </div>

          <button
            onClick={handleSaveChecklist}
            disabled={isPending || !todayAttendance}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: todayAttendance ? 'pointer' : 'not-allowed',
              opacity: todayAttendance ? 1 : 0.6,
            }}
          >
            💾 Save Checklist Progress
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentDefs.map((def) => {
            const isChecked = !!checkedMap[def.key];
            return (
              <div
                key={def.key}
                onClick={() => handleToggleTask(def.key)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)',
                  border: `1px solid ${isChecked ? '#3b82f6' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Handled by container click
                  style={{ marginTop: '0.2rem', cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)',
                      textDecoration: isChecked ? 'none' : 'none',
                    }}
                  >
                    {def.label}
                  </div>
                  {def.description && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      {def.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

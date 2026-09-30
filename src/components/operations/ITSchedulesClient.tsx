'use client';

import React, { useState, useTransition } from 'react';
import { submitStaffChecklistAction } from '@/actions/staffOperations';
import { IT_WEEKLY_CHECKLIST, IT_MONTHLY_CHECKLIST } from '@/lib/operations/checklists';

interface SubmissionRecord {
  id: string;
  taskKey: string;
  taskLabel: string;
  isCompleted: boolean;
  completedAt: string | null;
  notes: string | null;
  submittedBy: string;
}

interface Props {
  weeklySubmissions: SubmissionRecord[];
  monthlySubmissions: SubmissionRecord[];
}

type ActiveTab = 'WEEKLY' | 'MONTHLY';

export default function ITSchedulesClient({ weeklySubmissions, monthlySubmissions }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('WEEKLY');
  const [weeklyChecks, setWeeklyChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(IT_WEEKLY_CHECKLIST.map(item => [item.key, false]))
  );
  const [monthlyChecks, setMonthlyChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(IT_MONTHLY_CHECKLIST.map(item => [item.key, false]))
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [attendanceId, setAttendanceId] = useState('');
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (key: string, type: 'WEEKLY' | 'MONTHLY') => {
    if (type === 'WEEKLY') {
      setWeeklyChecks(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
      setMonthlyChecks(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleSubmit = (type: ActiveTab) => {
    if (!attendanceId.trim()) {
      setResult({ error: 'Please enter your Attendance ID from the Operations Workstation.' });
      return;
    }

    const items = type === 'WEEKLY' ? IT_WEEKLY_CHECKLIST : IT_MONTHLY_CHECKLIST;
    const checks = type === 'WEEKLY' ? weeklyChecks : monthlyChecks;

    const itemsPayload = items.map(item => ({
      taskCategory: type,
      taskKey: item.key,
      taskLabel: item.label,
      isCompleted: checks[item.key] || false,
      notes: notes[item.key] || undefined,
    }));

    startTransition(async () => {
      try {
        const res = await submitStaffChecklistAction({
          attendanceId,
          items: itemsPayload,
        });
        setResult(res as any);
        if (res.success) {
          setTimeout(() => setResult(null), 4000);
        }
      } catch (e: any) {
        setResult({ error: e.message || 'Submission failed' });
      }
    });
  };

  const completedCountWeekly = weeklySubmissions.filter(s => s.isCompleted).length;
  const completedCountMonthly = monthlySubmissions.filter(s => s.isCompleted).length;
  const now = new Date();
  const weekLabel = `Week of ${new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toLocaleDateString()}`;
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.6rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    background: active ? 'var(--ns-blue)' : 'transparent',
    color: active ? '#fff' : 'var(--text-dim)',
    transition: 'all 0.15s ease',
  });

  const checklistItems = activeTab === 'WEEKLY' ? IT_WEEKLY_CHECKLIST : IT_MONTHLY_CHECKLIST;
  const currentChecks = activeTab === 'WEEKLY' ? weeklyChecks : monthlyChecks;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          💻 IT Weekly &amp; Monthly Checklist Desk
        </h1>
        <p style={{ color: 'var(--text-dim)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
          Submit and track IT staff periodic routine compliance (§XXV) — weekly backup, maintenance &amp; monthly patching routines.
        </p>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--ns-blue)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Weekly Tasks Done
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ns-blue)', marginTop: '0.25rem' }}>
            {completedCountWeekly} / {IT_WEEKLY_CHECKLIST.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{weekLabel}</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--ns-violet)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Monthly Tasks Done
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ns-violet)', marginTop: '0.25rem' }}>
            {completedCountMonthly} / {IT_MONTHLY_CHECKLIST.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{monthLabel}</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--ns-green)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Weekly Compliance
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: completedCountWeekly >= IT_WEEKLY_CHECKLIST.length ? 'var(--ns-green)' : '#B45309',
            marginTop: '0.25rem',
          }}>
            {IT_WEEKLY_CHECKLIST.length > 0 ? Math.round((completedCountWeekly / IT_WEEKLY_CHECKLIST.length) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>This week</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Monthly Compliance
          </div>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: completedCountMonthly >= IT_MONTHLY_CHECKLIST.length ? 'var(--ns-green)' : '#B45309',
            marginTop: '0.25rem',
          }}>
            {IT_MONTHLY_CHECKLIST.length > 0 ? Math.round((completedCountMonthly / IT_MONTHLY_CHECKLIST.length) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{monthLabel}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <button style={tabBtnStyle(activeTab === 'WEEKLY')} onClick={() => setActiveTab('WEEKLY')}>
          📅 Weekly Routines ({completedCountWeekly}/{IT_WEEKLY_CHECKLIST.length})
        </button>
        <button style={tabBtnStyle(activeTab === 'MONTHLY')} onClick={() => setActiveTab('MONTHLY')}>
          🗓️ Monthly Routines ({completedCountMonthly}/{IT_MONTHLY_CHECKLIST.length})
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Submission Form */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
            {activeTab === 'WEEKLY' ? `📅 Weekly Checklist — ${weekLabel}` : `🗓️ Monthly Checklist — ${monthLabel}`}
          </h2>

          {/* Attendance ID Input */}
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(0,82,204,0.06)', border: '1px solid rgba(0,82,204,0.2)', borderRadius: 'var(--radius-md)' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ns-blue)', display: 'block', marginBottom: '0.4rem' }}>
              📋 Your Attendance Record ID (from Operations Workstation)
            </label>
            <input
              type="text"
              placeholder="e.g. f3a1b2c4-..."
              value={attendanceId}
              onChange={e => setAttendanceId(e.target.value)}
              className="input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
              Find your attendance ID in the Operations Workstation at /dashboard/operations
            </div>
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {checklistItems.map((item) => (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key, activeTab)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  background: currentChecks[item.key] ? 'rgba(16,185,129,0.07)' : 'var(--bg-input)',
                  border: `1px solid ${currentChecks[item.key] ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: `2px solid ${currentChecks[item.key] ? '#10b981' : 'var(--border-color)'}`,
                  background: currentChecks[item.key] ? '#10b981' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                  transition: 'all 0.15s ease',
                }}>
                  {currentChecks[item.key] && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: currentChecks[item.key] ? '#0F766E' : 'var(--text-primary)',
                    textDecoration: currentChecks[item.key] ? 'line-through' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>{item.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
              Notes / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add any relevant notes, issues found, or observations..."
              className="input"
              style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              onChange={e => setNotes(prev => ({ ...prev, GENERAL: e.target.value }))}
            />
          </div>

          {result && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: result.success ? '#0F766E' : '#DC2626',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}>
              {result.success ? '✅ Checklist submitted successfully!' : `❌ ${result.error}`}
            </div>
          )}

          <button
            onClick={() => handleSubmit(activeTab)}
            disabled={isPending}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
          >
            {isPending ? '⏳ Submitting...' : `Submit ${activeTab === 'WEEKLY' ? 'Weekly' : 'Monthly'} Checklist`}
          </button>
        </div>

        {/* Submission History Panel */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
            📜 Submission History — {activeTab === 'WEEKLY' ? weekLabel : monthLabel}
          </h3>

          {(activeTab === 'WEEKLY' ? weeklySubmissions : monthlySubmissions).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
              No submissions recorded yet for this period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(activeTab === 'WEEKLY' ? weeklySubmissions : monthlySubmissions).map(sub => (
                <div
                  key={sub.id}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${sub.isCompleted ? 'rgba(16,185,129,0.25)' : 'var(--border-color)'}`,
                    background: sub.isCompleted ? 'rgba(16,185,129,0.06)' : 'var(--bg-input)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: sub.isCompleted ? '#0F766E' : 'var(--text-secondary)' }}>
                      {sub.isCompleted ? '✅' : '⬜'} {sub.taskLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    By {sub.submittedBy} {sub.completedAt ? `· ${new Date(sub.completedAt).toLocaleString()}` : ''}
                  </div>
                  {sub.notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      Note: {sub.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateUpcomingSimulationSlotsAction,
  recordSimulationResultAction,
  createSimulationDrillAction,
} from '@/actions/simulations';
import { SimulationType, SimulationStatus } from '@prisma/client';

interface SimulationItem {
  id: string;
  title: string;
  drillType: string;
  scheduledDate: string;
  status: string;
  responsibleOfficer: string;
  branch: string;
  attendanceCount: number;
  issuesFound: string | null;
  remarks: string | null;
  completedAt: string | null;
}

interface Props {
  simulations: SimulationItem[];
}

const STATUS_LABELS: Record<string, string> = {
  ALL: 'All',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  SCHEDULED:   { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.4)' },
  IN_PROGRESS: { bg: 'rgba(234,179,8,0.12)',   color: '#facc15', border: 'rgba(234,179,8,0.4)' },
  COMPLETED:   { bg: 'rgba(15,118,110,0.12)',  color: '#2dd4bf', border: 'rgba(15,118,110,0.4)' },
  CANCELLED:   { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.4)' },
};

export default function SimulationManager({ simulations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeModalItem, setActiveModalItem] = useState<SimulationItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [modalStatus, setModalStatus] = useState<SimulationStatus>(SimulationStatus.COMPLETED);
  const [modalAttendance, setModalAttendance] = useState(0);
  const [modalIssues, setModalIssues] = useState('');
  const [modalRemarks, setModalRemarks] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDrillType, setNewDrillType] = useState<SimulationType>(SimulationType.GENSET_OPERATION);
  const [newDate, setNewDate] = useState('');
  const [newOfficer, setNewOfficer] = useState('');
  const [newBranch, setNewBranch] = useState('Main Branch');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = simulations.filter((s) =>
    statusFilter === 'ALL' ? true : s.status === statusFilter,
  );

  const handleGenerateSlots = () => {
    startTransition(async () => {
      try {
        const result = await generateUpcomingSimulationSlotsAction();
        router.refresh();
        showToast(result.count > 0 ? `Generated ${result.count} new slot(s).` : 'All upcoming slots already exist.');
      } catch {
        showToast('Failed to generate slots. Check permissions.');
      }
    });
  };

  const handleOpenResultModal = (item: SimulationItem) => {
    setActiveModalItem(item);
    setModalStatus((item.status as SimulationStatus) || SimulationStatus.COMPLETED);
    setModalAttendance(item.attendanceCount || 0);
    setModalIssues(item.issuesFound || '');
    setModalRemarks(item.remarks || '');
  };

  const handleSaveResult = () => {
    if (!activeModalItem) return;
    startTransition(async () => {
      try {
        await recordSimulationResultAction({
          id: activeModalItem.id,
          status: modalStatus,
          attendanceCount: Number(modalAttendance),
          issuesFound: modalIssues,
          remarks: modalRemarks,
        });
        setActiveModalItem(null);
        router.refresh();
        showToast('Drill outcome recorded successfully.');
      } catch {
        showToast('Failed to save result. Check permissions.');
      }
    });
  };

  const handleCreateDrill = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createSimulationDrillAction({
          title: newTitle,
          drillType: newDrillType,
          scheduledDate: newDate,
          responsibleOfficer: newOfficer,
          branch: newBranch,
        });
        setIsCreateOpen(false);
        setNewTitle('');
        setNewDate('');
        setNewOfficer('');
        setNewBranch('Main Branch');
        router.refresh();
        showToast('Custom drill scheduled successfully.');
      } catch {
        showToast('Failed to create drill. Check permissions.');
      }
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.35rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            zIndex: 2000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          border: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
              Internet, Power &amp; Genset Simulation Scheduler
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                background: 'rgba(234,179,8,0.2)',
                color: '#facc15',
                border: '1px solid rgba(234,179,8,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              1st &amp; 3rd Saturday Cadence
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Mandatory bi-weekly contingency drill for genset switchover, ISP failover, and emergency procedures.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerateSlots}
            disabled={isPending}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: '#1e293b',
              border: '1px solid #475569',
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? '⏳ Processing…' : '🔄 Auto-Generate 1st & 3rd Saturday Slots'}
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            disabled={isPending}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            ➕ Schedule Custom Drill
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.35rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'}`,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {STATUS_LABELS[st]}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} drill{filtered.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      {/* Drills Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '3rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
            }}
          >
            {simulations.length === 0
              ? 'No drills found. Click "Auto-Generate" to populate the schedule.'
              : `No drills match the "${STATUS_LABELS[statusFilter]}" filter.`}
          </div>
        ) : (
          filtered.map((drill) => {
            const dateObj = new Date(drill.scheduledDate);
            const sc = STATUS_STYLES[drill.status] ?? { bg: 'rgba(100,100,100,0.1)', color: '#aaa', border: 'rgba(100,100,100,0.3)' };
            const isCompleted = drill.status === 'COMPLETED';

            return (
              <div
                key={drill.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background:
                          drill.drillType === 'GENSET_OPERATION' ? 'rgba(234,179,8,0.15)' :
                          drill.drillType === 'INTERNET_OUTAGE' ? 'rgba(59,130,246,0.15)' :
                          drill.drillType === 'POWER_OUTAGE' ? 'rgba(239,68,68,0.15)' :
                          drill.drillType === 'BACKUP_INTERNET' ? 'rgba(16,185,129,0.15)' :
                          'rgba(168,85,247,0.15)',
                        color:
                          drill.drillType === 'GENSET_OPERATION' ? '#facc15' :
                          drill.drillType === 'INTERNET_OUTAGE' ? '#93c5fd' :
                          drill.drillType === 'POWER_OUTAGE' ? '#f87171' :
                          drill.drillType === 'BACKUP_INTERNET' ? '#6ee7b7' :
                          '#d8b4fe',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'inline-block',
                      }}
                    >
                      {drill.drillType.replace(/_/g, ' ')}
                    </span>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {drill.title}
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      background: sc.bg,
                      color: sc.color,
                      border: `1px solid ${sc.border}`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_LABELS[drill.status] ?? drill.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  📅{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  👤 <strong style={{ color: 'var(--text-primary)' }}>{drill.responsibleOfficer}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  🏢 <strong style={{ color: 'var(--text-primary)' }}>{drill.branch}</strong>
                </div>

                {isCompleted && (
                  <div style={{ background: 'var(--bg-surface)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>👥 Participants: <strong style={{ color: 'var(--text-primary)' }}>{drill.attendanceCount}</strong></div>
                    {drill.issuesFound && <div style={{ color: '#f87171', marginTop: '0.25rem' }}>⚠️ {drill.issuesFound}</div>}
                    {drill.remarks && <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>📝 {drill.remarks}</div>}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleOpenResultModal(drill)}
                    disabled={isPending}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    📝 Record Drill Outcome
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Outcome Modal */}
      {activeModalItem && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setActiveModalItem(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxWidth: '520px', width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                📋 {activeModalItem.title}
              </h3>
              <button onClick={() => setActiveModalItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div>
              <label style={labelStyle}>Drill Status:</label>
              <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value as SimulationStatus)} style={inputStyle}>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Attendance Count:</label>
              <input type="number" value={modalAttendance} onChange={(e) => setModalAttendance(Number(e.target.value))} min={0} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Issues Encountered:</label>
              <textarea value={modalIssues} onChange={(e) => setModalIssues(e.target.value)} placeholder="Log any hardware, power, or connectivity issues..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <label style={labelStyle}>Remarks &amp; Notes:</label>
              <textarea value={modalRemarks} onChange={(e) => setModalRemarks(e.target.value)} placeholder="Action items or preventive maintenance needed..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setActiveModalItem(null)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveResult} disabled={isPending} style={{ padding: '0.5rem 1.25rem', background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}>
                {isPending ? 'Saving…' : 'Save Results'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Drill Modal */}
      {isCreateOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <form onSubmit={handleCreateDrill} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxWidth: '500px', width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Schedule Custom Drill</h3>
              <button type="button" onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div>
              <label style={labelStyle}>Drill Title *</label>
              <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Unscheduled Genset Blackout Drill" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Drill Type</label>
              <select value={newDrillType} onChange={(e) => setNewDrillType(e.target.value as SimulationType)} style={inputStyle}>
                <option value="GENSET_OPERATION">Genset Operation</option>
                <option value="INTERNET_OUTAGE">Internet Outage</option>
                <option value="POWER_OUTAGE">Power Outage</option>
                <option value="BACKUP_INTERNET">Backup Internet</option>
                <option value="EMERGENCY_PROCEDURES">Emergency Procedures</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Scheduled Date *</label>
              <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Responsible Officer *</label>
              <input type="text" required value={newOfficer} onChange={(e) => setNewOfficer(e.target.value)} placeholder="e.g. Lead Network Engineer / Shift Admin" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Branch</label>
              <input type="text" value={newBranch} onChange={(e) => setNewBranch(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setIsCreateOpen(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isPending} style={{ padding: '0.5rem 1.25rem', background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1 }}>
                {isPending ? 'Creating…' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
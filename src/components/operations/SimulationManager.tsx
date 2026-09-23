'use client';

import React, { useState, useTransition } from 'react';
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

export default function SimulationManager({ simulations }: Props) {
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeModalItem, setActiveModalItem] = useState<SimulationItem | null>(null);

  // Edit/Completion Modal state
  const [modalStatus, setModalStatus] = useState<SimulationStatus>(SimulationStatus.COMPLETED);
  const [modalAttendance, setModalAttendance] = useState(0);
  const [modalIssues, setModalIssues] = useState('');
  const [modalRemarks, setModalRemarks] = useState('');

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDrillType, setNewDrillType] = useState<SimulationType>(SimulationType.GENSET_OPERATION);
  const [newDate, setNewDate] = useState('');
  const [newOfficer, setNewOfficer] = useState('');
  const [newBranch, setNewBranch] = useState('Main Branch');

  const filtered = simulations.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return true;
  });

  const handleGenerateSlots = () => {
    startTransition(async () => {
      await generateUpcomingSimulationSlotsAction();
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
      await recordSimulationResultAction({
        id: activeModalItem.id,
        status: modalStatus,
        attendanceCount: Number(modalAttendance),
        issuesFound: modalIssues,
        remarks: modalRemarks,
      });
      setActiveModalItem(null);
    });
  };

  const handleCreateDrill = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
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
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Info */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Internet, Power &amp; Genset Simulation Scheduler
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                background: 'rgba(234, 179, 8, 0.2)',
                color: '#facc15',
                border: '1px solid #eab308',
              }}
            >
              1st &amp; 3rd Saturday Cadence
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Mandatory bi-weekly operational contingency drill to verify genset switchover, ISP failover, and emergency procedures.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleGenerateSlots}
            disabled={isPending}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            🔄 Auto-Generate 1st &amp; 3rd Saturday Slots
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            ➕ Schedule Custom Drill
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === st ? 'var(--accent)' : 'var(--bg-card)',
                color: statusFilter === st ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>
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
            No simulation drills found. Click &quot;Auto-Generate 1st &amp; 3rd Saturday Slots&quot; to populate your bi-weekly drill schedule.
          </div>
        ) : (
          filtered.map((drill) => {
            const dateObj = new Date(drill.scheduledDate);
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background:
                          drill.drillType === 'GENSET_OPERATION'
                            ? 'rgba(234, 179, 8, 0.15)'
                            : drill.drillType === 'INTERNET_OUTAGE'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(168, 85, 247, 0.15)',
                        color:
                          drill.drillType === 'GENSET_OPERATION'
                            ? '#facc15'
                            : drill.drillType === 'INTERNET_OUTAGE'
                            ? '#93c5fd'
                            : '#d8b4fe',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {drill.drillType.replace(/_/g, ' ')}
                    </span>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {drill.title}
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: isCompleted ? 'rgba(15, 118, 110, 0.1)' : 'rgba(180, 83, 9, 0.1)',
                      color: isCompleted ? '#0F766E' : '#B45309',
                      border: `1px solid ${isCompleted ? 'rgba(15,118,110,0.35)' : 'rgba(180,83,9,0.35)'}`,
                    }}
                  >
                    {drill.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  📅 Scheduled:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </strong>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  👤 Responsible Officer: <strong style={{ color: 'var(--text-primary)' }}>{drill.responsibleOfficer}</strong>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  🏢 Branch: <strong style={{ color: 'var(--text-primary)' }}>{drill.branch}</strong>
                </div>

                {isCompleted && (
                  <div style={{ background: 'var(--bg-surface)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                    <div>👥 Participants Count: {drill.attendanceCount}</div>
                    {drill.issuesFound && <div style={{ color: '#ef4444', marginTop: '0.25rem' }}>⚠️ Issues: {drill.issuesFound}</div>}
                    {drill.remarks && <div style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>📝 Remarks: {drill.remarks}</div>}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleOpenResultModal(drill)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
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
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Audit Drill: {activeModalItem.title}
            </h3>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Status:
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as SimulationStatus)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Attendance Count (Teachers, Admin &amp; IT present):
              </label>
              <input
                type="number"
                value={modalAttendance}
                onChange={(e) => setModalAttendance(Number(e.target.value))}
                min={0}
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
                Issues Encountered (e.g. ATS failover delay, fuel pressure):
              </label>
              <textarea
                value={modalIssues}
                onChange={(e) => setModalIssues(e.target.value)}
                placeholder="Log any hardware, power, or connectivity bottlenecks..."
                rows={2}
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
                Resolution Remarks &amp; Management Notes:
              </label>
              <textarea
                value={modalRemarks}
                onChange={(e) => setModalRemarks(e.target.value)}
                placeholder="Action items or preventive maintenance needed..."
                rows={2}
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
                onClick={() => setActiveModalItem(null)}
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
                onClick={handleSaveResult}
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
                Save Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Drill Modal */}
      {isCreateOpen && (
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
          <form
            onSubmit={handleCreateDrill}
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
              Schedule Custom Simulation Drill
            </h3>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Drill Title:
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Unscheduled Genset Blackout Drill"
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
                Drill Type:
              </label>
              <select
                value={newDrillType}
                onChange={(e) => setNewDrillType(e.target.value as SimulationType)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="GENSET_OPERATION">GENSET_OPERATION</option>
                <option value="INTERNET_OUTAGE">INTERNET_OUTAGE</option>
                <option value="POWER_OUTAGE">POWER_OUTAGE</option>
                <option value="BACKUP_INTERNET">BACKUP_INTERNET</option>
                <option value="EMERGENCY_PROCEDURES">EMERGENCY_PROCEDURES</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Scheduled Date:
              </label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
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
                Responsible Officer:
              </label>
              <input
                type="text"
                required
                value={newOfficer}
                onChange={(e) => setNewOfficer(e.target.value)}
                placeholder="e.g. Lead Network Engineer / Shift Admin"
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
                Branch:
              </label>
              <input
                type="text"
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
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
                type="button"
                onClick={() => setIsCreateOpen(false)}
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
                type="submit"
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
                Create Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

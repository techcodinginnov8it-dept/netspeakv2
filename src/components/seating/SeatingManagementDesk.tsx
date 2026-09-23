'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { SeatStatus } from '@prisma/client';
import {
  assignTeacherToSeatAction,
  unassignTeacherAction,
  updateWorkstationStatusAction,
  addWorkstationAction,
  deleteWorkstationAction,
} from '@/actions/seating';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkstationItem = {
  id: string;
  branch: string;
  workstationNo: string;
  seatNo: string;
  specs?: string | null;
  status: SeatStatus;
  notes?: string | null;
  assignment?: {
    id: string;
    teacherId: string;
    teacherName: string;
    schedule?: string | null;
    assignedAt: string;
  } | null;
};

export type AvailableTeacher = {
  id: string;
  displayName: string;
  realFullName: string;
  projectType: string;
};

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<SeatStatus, { label: string; bg: string; border: string; text: string; icon: string }> = {
  AVAILABLE:        { label: 'Available',        bg: 'rgba(13,148,136,0.10)', border: 'rgba(13,148,136,0.3)', text: '#0F766E', icon: '✅' },
  OCCUPIED:         { label: 'Occupied',         bg: 'rgba(0,82,204,0.10)',   border: 'rgba(0,82,204,0.3)',   text: '#0052CC', icon: '🪑' },
  PENDING_REFORMAT: { label: 'Pending Reformat', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.35)',  text: '#B45309', icon: '⚠️' },
  UNDER_REFORMAT:   { label: 'Under Reformat',   bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.35)',  text: '#DC2626', icon: '🔧' },
  RESERVED:         { label: 'Reserved',         bg: 'rgba(125,110,216,0.10)',border: 'rgba(125,110,216,0.3)',text: '#6D28D9', icon: '🔒' },
};

const BRANCHES = ['Main Branch', 'Branch 2'];
const UNASSIGN_REASONS = ['MANUAL', 'TRANSFER', 'RESIGNED', 'AWOL'] as const;
type UnassignReason = typeof UNASSIGN_REASONS[number];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SeatingManagementDesk({
  initialWorkstations,
  availableTeachers,
}: {
  initialWorkstations: WorkstationItem[];
  availableTeachers: AvailableTeacher[];
}) {
  const [workstations, setWorkstations] = useState<WorkstationItem[]>(initialWorkstations);
  const [activeBranch, setActiveBranch] = useState<string>(BRANCHES[0]);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [assignModal, setAssignModal] = useState<WorkstationItem | null>(null);
  const [unassignModal, setUnassignModal] = useState<WorkstationItem | null>(null);
  const [statusModal, setStatusModal] = useState<WorkstationItem | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [detailModal, setDetailModal] = useState<WorkstationItem | null>(null);

  // Form states
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignSchedule, setAssignSchedule] = useState('');
  const [unassignReason, setUnassignReason] = useState<UnassignReason>('MANUAL');
  const [newStatus, setNewStatus] = useState<SeatStatus>(SeatStatus.AVAILABLE);
  const [newNotes, setNewNotes] = useState('');
  const [addBranch, setAddBranch] = useState('Main Branch');
  const [addWsNo, setAddWsNo] = useState('');
  const [addSeatNo, setAddSeatNo] = useState('');
  const [addSpecs, setAddSpecs] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Reload data from server after mutation
  const refresh = () => window.location.reload();

  // Branch-filtered workstations
  const branchWs = useMemo(
    () => workstations.filter((w) => w.branch === activeBranch),
    [workstations, activeBranch]
  );

  // KPI counts per branch
  const kpi = useMemo(() => {
    const all = workstations.filter((w) => w.branch === activeBranch);
    return {
      total: all.length,
      occupied: all.filter((w) => w.status === 'OCCUPIED').length,
      available: all.filter((w) => w.status === 'AVAILABLE').length,
      pendingReformat: all.filter((w) => w.status === 'PENDING_REFORMAT').length,
      underReformat: all.filter((w) => w.status === 'UNDER_REFORMAT').length,
      reserved: all.filter((w) => w.status === 'RESERVED').length,
    };
  }, [workstations, activeBranch]);

  // Teachers not yet assigned
  const unassignedTeachers = useMemo(() => {
    const assignedTeacherIds = new Set(
      workstations.filter((w) => w.assignment).map((w) => w.assignment!.teacherId)
    );
    return availableTeachers.filter((t) => !assignedTeacherIds.has(t.id));
  }, [workstations, availableTeachers]);

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleAssign() {
    if (!assignModal || !assignTeacherId) return;
    startTransition(async () => {
      const res = await assignTeacherToSeatAction({
        workstationId: assignModal.id,
        teacherId: assignTeacherId,
        schedule: assignSchedule,
      });
      if (res.error) { showToast(res.error, false); return; }
      showToast('Teacher assigned successfully.');
      setAssignModal(null);
      setAssignTeacherId('');
      setAssignSchedule('');
      refresh();
    });
  }

  function handleUnassign() {
    if (!unassignModal) return;
    startTransition(async () => {
      const res = await unassignTeacherAction(unassignModal.id, unassignReason);
      if (res.error) { showToast(res.error, false); return; }
      showToast(`Teacher unassigned. Workstation marked ${unassignReason === 'RESIGNED' || unassignReason === 'AWOL' ? 'PENDING_REFORMAT' : 'AVAILABLE'}.`);
      setUnassignModal(null);
      refresh();
    });
  }

  function handleStatusUpdate() {
    if (!statusModal) return;
    startTransition(async () => {
      const res = await updateWorkstationStatusAction(statusModal.id, newStatus, newNotes);
      if (res.error) { showToast(res.error, false); return; }
      showToast('Workstation status updated.');
      setStatusModal(null);
      refresh();
    });
  }

  function handleAddWorkstation() {
    startTransition(async () => {
      const res = await addWorkstationAction({ branch: addBranch, workstationNo: addWsNo, seatNo: addSeatNo, specs: addSpecs });
      if (res.error) { showToast(res.error, false); return; }
      showToast('Workstation added.');
      setAddModal(false);
      setAddWsNo(''); setAddSeatNo(''); setAddSpecs('');
      refresh();
    });
  }

  function handleDelete(ws: WorkstationItem) {
    if (!confirm(`Delete ${ws.workstationNo} (${ws.branch})? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteWorkstationAction(ws.id);
      if (res.error) { showToast(res.error, false); return; }
      showToast('Workstation deleted.');
      refresh();
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.875rem',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '0.35rem',
    fontSize: '0.75rem', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)',
  };
  const btnPrimary: React.CSSProperties = {
    padding: '0.5rem 1.1rem', borderRadius: 'var(--radius-sm)',
    background: 'rgba(37,99,235,0.85)', color: '#fff', border: 'none',
    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
  };
  const btnDanger: React.CSSProperties = { ...btnPrimary, background: 'rgba(220,38,38,0.8)' };
  const btnGhost: React.CSSProperties = {
    ...btnPrimary, background: 'transparent',
    border: '1px solid var(--border-color)', color: 'var(--text-muted)',
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999,
          padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm)',
          background: toast.ok ? 'rgba(15,118,110,0.08)' : 'rgba(220,38,38,0.08)',
          border: `1px solid ${toast.ok ? 'rgba(15,118,110,0.35)' : 'rgba(220,38,38,0.35)'}`,
          color: toast.ok ? '#0F766E' : '#DC2626',
          fontSize: '0.85rem', fontWeight: 600, maxWidth: '340px',
        }}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🗺️ Seating Arrangement
          </h1>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Manage branch workstations and teacher seat assignments.
          </p>
        </div>
        <button onClick={() => setAddModal(true)} style={btnPrimary}>
          + Add Workstation
        </button>
      </div>

      {/* Branch Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        {BRANCHES.map((b) => (
          <button
            key={b}
            onClick={() => setActiveBranch(b)}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              border: '1px solid',
              borderColor: activeBranch === b ? 'rgba(37,99,235,0.5)' : 'transparent',
              borderBottom: activeBranch === b ? '1px solid var(--bg-secondary)' : '1px solid transparent',
              background: activeBranch === b ? 'var(--bg-secondary)' : 'transparent',
              color: activeBranch === b ? 'var(--text-primary)' : 'var(--text-dim)',
              fontWeight: activeBranch === b ? 600 : 400,
              fontSize: '0.875rem', cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {b}
          </button>
        ))}
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Seats', value: kpi.total, icon: '🖥️', color: 'var(--ns-blue)' },
          { label: 'Occupied', value: kpi.occupied, icon: '🪑', color: 'var(--ns-blue)' },
          { label: 'Available', value: kpi.available, icon: '✅', color: '#0F766E' },
          { label: 'Pending Reformat', value: kpi.pendingReformat, icon: '⚠️', color: '#B45309' },
          { label: 'Under Reformat', value: kpi.underReformat, icon: '🔧', color: '#DC2626' },
          { label: 'Reserved', value: kpi.reserved, icon: '🔒', color: '#6D28D9' },
        ].map((k) => (
          <div key={k.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)', padding: '0.9rem 1rem',
          }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{k.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Seat Grid */}
      {branchWs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🖥️</div>
          <div>No workstations found for {activeBranch}. Add one above.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {branchWs.map((ws) => {
            const cfg = STATUS_CFG[ws.status];
            return (
              <div
                key={ws.id}
                onClick={() => setDetailModal(ws)}
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem 1.15rem',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = '';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                }}
              >
                {/* Status badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.2rem 0.65rem', borderRadius: '100px',
                  background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
                  fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.75rem',
                }}>
                  {cfg.icon} {cfg.label}
                </div>

                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  {ws.workstationNo}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                  {ws.seatNo}
                </div>

                {ws.assignment ? (
                  <div style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.65rem', marginBottom: '0.75rem',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      👤 {ws.assignment.teacherName}
                    </div>
                    {ws.assignment.schedule && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                        ⏰ {ws.assignment.schedule}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ height: '54px' }} />
                )}

                {/* Quick action buttons */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {ws.status === 'AVAILABLE' && (
                    <button
                      onClick={() => { setAssignModal(ws); setAssignTeacherId(''); setAssignSchedule(''); }}
                      style={{ ...btnPrimary, padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                    >
                      Assign
                    </button>
                  )}
                  {ws.assignment && (
                    <button
                      onClick={() => { setUnassignModal(ws); setUnassignReason('MANUAL'); }}
                      style={{ ...btnDanger, padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                    >
                      Unassign
                    </button>
                  )}
                  <button
                    onClick={() => { setStatusModal(ws); setNewStatus(ws.status); setNewNotes(ws.notes || ''); }}
                    style={{ ...btnGhost, padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                  >
                    Status
                  </button>
                  {ws.status === 'AVAILABLE' && !ws.assignment && (
                    <button
                      onClick={() => handleDelete(ws)}
                      style={{ ...btnGhost, padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: '#DC2626', borderColor: 'rgba(220,38,38,0.35)' }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Detail Modal */}
      {detailModal && (
        <Modal title={`${detailModal.workstationNo} — Details`} onClose={() => setDetailModal(null)}>
          {[
            ['Branch', detailModal.branch],
            ['Workstation No.', detailModal.workstationNo],
            ['Seat No.', detailModal.seatNo],
            ['Status', `${STATUS_CFG[detailModal.status].icon} ${STATUS_CFG[detailModal.status].label}`],
            ['Specs', detailModal.specs || '—'],
            ['Notes', detailModal.notes || '—'],
            ['Assigned Teacher', detailModal.assignment?.teacherName || 'None'],
            ['Schedule', detailModal.assignment?.schedule || '—'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>{l}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button onClick={() => setDetailModal(null)} style={btnGhost}>Close</button>
          </div>
        </Modal>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <Modal title={`Assign Teacher — ${assignModal.workstationNo}`} onClose={() => setAssignModal(null)}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Teacher <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select value={assignTeacherId} onChange={(e) => setAssignTeacherId(e.target.value)} style={inputStyle}>
              <option value="">— Select Teacher —</option>
              {unassignedTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.realFullName} ({t.displayName}) · {t.projectType}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Schedule (optional)</label>
            <input value={assignSchedule} onChange={(e) => setAssignSchedule(e.target.value)} placeholder="e.g. Morning Shift 08:00–17:00" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setAssignModal(null)} style={btnGhost}>Cancel</button>
            <button onClick={handleAssign} disabled={!assignTeacherId || isPending} style={btnPrimary}>
              {isPending ? 'Saving…' : 'Assign Teacher'}
            </button>
          </div>
        </Modal>
      )}

      {/* Unassign Modal */}
      {unassignModal && (
        <Modal title={`Unassign — ${unassignModal.workstationNo}`} onClose={() => setUnassignModal(null)}>
          <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Removing <strong>{unassignModal.assignment?.teacherName}</strong> from <strong>{unassignModal.workstationNo}</strong>.
            RESIGNED or AWOL will automatically flag the workstation for IT reformat.
          </p>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select value={unassignReason} onChange={(e) => setUnassignReason(e.target.value as UnassignReason)} style={inputStyle}>
              {UNASSIGN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setUnassignModal(null)} style={btnGhost}>Cancel</button>
            <button onClick={handleUnassign} disabled={isPending} style={btnDanger}>
              {isPending ? 'Processing…' : 'Confirm Unassign'}
            </button>
          </div>
        </Modal>
      )}

      {/* Status Update Modal */}
      {statusModal && (
        <Modal title={`Update Status — ${statusModal.workstationNo}`} onClose={() => setStatusModal(null)}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as SeatStatus)} style={inputStyle}>
              {(Object.keys(STATUS_CFG) as SeatStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CFG[s].icon} {STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Maintenance notes, reformat ticket ID, etc." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setStatusModal(null)} style={btnGhost}>Cancel</button>
            <button onClick={handleStatusUpdate} disabled={isPending} style={btnPrimary}>
              {isPending ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Workstation Modal */}
      {addModal && (
        <Modal title="Add Workstation" onClose={() => setAddModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Branch <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select value={addBranch} onChange={(e) => setAddBranch(e.target.value)} style={inputStyle}>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Workstation No. <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input value={addWsNo} onChange={(e) => setAddWsNo(e.target.value)} placeholder="PC-11" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Seat No. <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input value={addSeatNo} onChange={(e) => setAddSeatNo(e.target.value)} placeholder="Seat 11" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Specs (optional)</label>
              <input value={addSpecs} onChange={(e) => setAddSpecs(e.target.value)} placeholder="Intel i5, 16GB RAM, 500GB SSD" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={() => setAddModal(false)} style={btnGhost}>Cancel</button>
            <button onClick={handleAddWorkstation} disabled={!addWsNo || !addSeatNo || isPending} style={btnPrimary}>
              {isPending ? 'Adding…' : 'Add Workstation'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reusable Modal Shell ─────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem 1.75rem',
          width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

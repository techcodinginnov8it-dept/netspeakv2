'use client';

import { useState, useTransition } from 'react';
import {
  approveSRDRequestAction,
  rejectSRDRequestAction,
  approveEarlyTimeOffAction,
  rejectEarlyTimeOffAction,
} from '@/actions/requests';

interface SRDRequest {
  id: string;
  status: string;
  originalRestDay: string;
  dateNotWorking: Date | string;
  switchedWorkDate: Date | string;
  reason: string;
  approverRemarks: string | null;
  approvedAt: Date | string | null;
  createdAt: Date | string;
  teacher: {
    displayName: string;
    realFullName: string | null;
  };
}

interface ETORequest {
  id: string;
  status: string;
  shiftDate: Date | string;
  timeOffStart: Date | string;
  reason: string;
  checklistAcknowledged: boolean;
  expiresAt: Date | string;
  approverRemarks: string | null;
  approvedAt: Date | string | null;
  createdAt: Date | string;
  teacher: {
    displayName: string;
    realFullName: string | null;
  };
}

interface RequestsApprovalQueueProps {
  srdRequests: SRDRequest[];
  etoRequests: ETORequest[];
}

type ActiveTab = 'srd' | 'eto';

function statusBadge(status: string) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    PENDING: { color: '#B45309', bg: 'rgba(217,119,6,0.12)', label: 'Pending' },
    APPROVED: { color: '#0F766E', bg: 'rgba(13,148,136,0.12)', label: 'Approved' },
    AUTO_APPROVED: { color: '#0F766E', bg: 'rgba(13,148,136,0.08)', label: 'Auto-Approved' },
    REJECTED: { color: '#DC2626', bg: 'rgba(239,68,68,0.12)', label: 'Rejected' },
  };
  const style = map[status] || { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', label: status };
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: style.color,
        background: style.bg,
        border: `1px solid ${style.color}40`,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActionButtons({
  requestId,
  type,
  onDone,
}: {
  requestId: string;
  type: 'srd' | 'eto';
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [remarks, setRemarks] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    startTransition(async () => {
      try {
        if (type === 'srd') {
          await approveSRDRequestAction(requestId, remarks || undefined);
        } else {
          await approveEarlyTimeOffAction(requestId, remarks || undefined);
        }
        onDone();
      } catch (e: any) {
        setError(e.message || 'Failed to approve.');
      }
    });
  }

  async function handleReject() {
    if (!remarks.trim()) {
      setError('Please provide a rejection reason.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (type === 'srd') {
          await rejectSRDRequestAction(requestId, remarks);
        } else {
          await rejectEarlyTimeOffAction(requestId, remarks);
        }
        onDone();
      } catch (e: any) {
        setError(e.message || 'Failed to reject.');
      }
    });
  }

  const btnBase: React.CSSProperties = {
    padding: '0.4rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: isPending ? 'not-allowed' : 'pointer',
    opacity: isPending ? 0.6 : 1,
    transition: 'opacity 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
      {!showRejectInput ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleApprove}
            disabled={isPending}
            style={{
              ...btnBase,
              background: 'rgba(15,118,110,0.08)',
              color: '#0F766E',
              border: '1px solid rgba(15,118,110,0.35)',
            }}
          >
            {isPending ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isPending}
            style={{
              ...btnBase,
              background: 'rgba(220,38,38,0.08)',
              color: '#DC2626',
              border: '1px solid rgba(220,38,38,0.35)',
            }}
          >
            ✕ Reject
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Rejection reason (required)…"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={handleReject}
              disabled={isPending}
              style={{
                ...btnBase,
                background: 'rgba(220,38,38,0.12)',
                color: '#DC2626',
                border: '1px solid rgba(220,38,38,0.35)',
              }}
            >
              {isPending ? '…' : 'Confirm Reject'}
            </button>
            <button
              onClick={() => { setShowRejectInput(false); setRemarks(''); setError(null); }}
              disabled={isPending}
              style={{
                ...btnBase,
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <span style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 600 }}>⚠️ {error}</span>
      )}
    </div>
  );
}

export default function RequestsApprovalQueue({ srdRequests, etoRequests }: RequestsApprovalQueueProps) {
  const [tab, setTab] = useState<ActiveTab>('srd');
  const [, startTransition] = useTransition();

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.55rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  const pendingSRD = srdRequests.filter((r) => r.status === 'PENDING').length;
  const pendingETO = etoRequests.filter((r) => r.status === 'PENDING').length;

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-dim)',
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: '0.875rem',
    verticalAlign: 'top',
    borderBottom: '1px solid var(--border-color)',
  };

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          marginBottom: '1.25rem',
          background: 'var(--bg-secondary)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-sm)',
          width: 'fit-content',
        }}
      >
        <button style={tabStyle(tab === 'srd')} onClick={() => setTab('srd')}>
          Switch Rest Day
          {pendingSRD > 0 && (
            <span
              style={{
                marginLeft: '0.5rem',
                background: '#f87171',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '0.7rem',
                padding: '1px 6px',
              }}
            >
              {pendingSRD}
            </span>
          )}
        </button>
        <button style={tabStyle(tab === 'eto')} onClick={() => setTab('eto')}>
          Early Time-Off
          {pendingETO > 0 && (
            <span
              style={{
                marginLeft: '0.5rem',
                background: '#fcd34d',
                color: '#1a1a1a',
                borderRadius: '999px',
                fontSize: '0.7rem',
                padding: '1px 6px',
              }}
            >
              {pendingETO}
            </span>
          )}
        </button>
      </div>

      {/* SRD Table */}
      {tab === 'srd' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={thStyle}>Teacher</th>
                <th style={thStyle}>Rest Day</th>
                <th style={thStyle}>Date Not Working</th>
                <th style={thStyle}>Will Work On</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Submitted</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {srdRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-dim)', padding: '2.5rem' }}>
                    No Switch Rest Day requests found.
                  </td>
                </tr>
              ) : (
                srdRequests.map((req) => (
                  <tr key={req.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{req.teacher.displayName}</div>
                      {req.teacher.realFullName && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{req.teacher.realFullName}</div>
                      )}
                    </td>
                    <td style={tdStyle}>{req.originalRestDay}</td>
                    <td style={tdStyle}>{fmtDate(req.dateNotWorking)}</td>
                    <td style={tdStyle}>{fmtDate(req.switchedWorkDate)}</td>
                    <td style={{ ...tdStyle, maxWidth: '200px' }}>
                      <span style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>{req.reason}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{fmtDate(req.createdAt)}</span>
                    </td>
                    <td style={tdStyle}>{statusBadge(req.status)}</td>
                    <td style={tdStyle}>
                      {req.status === 'PENDING' ? (
                        <ActionButtons
                          requestId={req.id}
                          type="srd"
                          onDone={() => startTransition(() => {})}
                        />
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          {req.approverRemarks ? (
                            <span title={req.approverRemarks}>
                              {req.approverRemarks.slice(0, 40)}{req.approverRemarks.length > 40 ? '…' : ''}
                            </span>
                          ) : '—'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ETO Table */}
      {tab === 'eto' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={thStyle}>Teacher</th>
                <th style={thStyle}>Shift Date</th>
                <th style={thStyle}>Leave At</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Auto-Approves</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {etoRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-dim)', padding: '2.5rem' }}>
                    No Early Time-Off requests found.
                  </td>
                </tr>
              ) : (
                etoRequests.map((req) => {
                  const now = Date.now();
                  const expires = new Date(req.expiresAt).getTime();
                  const minLeft = Math.max(0, Math.round((expires - now) / 60000));
                  const isExpiring = req.status === 'PENDING' && minLeft < 5;

                  return (
                    <tr key={req.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{req.teacher.displayName}</div>
                        {req.teacher.realFullName && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{req.teacher.realFullName}</div>
                        )}
                      </td>
                      <td style={tdStyle}>{fmtDate(req.shiftDate)}</td>
                      <td style={tdStyle}>{fmtDateTime(req.timeOffStart)}</td>
                      <td style={{ ...tdStyle, maxWidth: '180px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{req.reason}</span>
                      </td>
                      <td style={tdStyle}>
                        {req.status === 'PENDING' ? (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: isExpiring ? '#f87171' : '#fcd34d',
                              fontWeight: 600,
                            }}
                          >
                            {minLeft}m remaining
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {fmtDateTime(req.expiresAt)}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{statusBadge(req.status)}</td>
                      <td style={tdStyle}>
                        {req.status === 'PENDING' ? (
                          <ActionButtons
                            requestId={req.id}
                            type="eto"
                            onDone={() => startTransition(() => {})}
                          />
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {req.approverRemarks ? (
                              <span title={req.approverRemarks}>
                                {req.approverRemarks.slice(0, 40)}{req.approverRemarks.length > 40 ? '…' : ''}
                              </span>
                            ) : '—'}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

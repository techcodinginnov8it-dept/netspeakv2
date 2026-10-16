'use client';

import React, { useState, useTransition } from 'react';
import { AuditLogItem, getAuditLogsAction } from '@/actions/audit';
import { fmtDate, fmtTime } from '@/lib/formatTime';

/* ── Module options matching what auditLogger.ts actually stores ── */
const MODULE_OPTIONS = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'system', label: 'System / Settings' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'operations', label: 'Operations' },
  { value: 'requests', label: 'Self-Service Requests' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'reports', label: 'Reports' },
  { value: 'referrals', label: 'Referrals' },
  { value: 'incentives', label: 'Incentives' },
  { value: 'branches', label: 'Branches' },
  { value: 'seating', label: 'Seating' },
  { value: 'resignation', label: 'Resignation' },
  { value: 'tickets', label: 'Tickets / Concerns' },
  { value: 'users', label: 'User Management' },
];

/* ── Action options matching what auditLogger.ts actually stores ── */
const ACTION_OPTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'CREATE', label: 'CREATE — New record created' },
  { value: 'UPDATE', label: 'UPDATE — Record updated' },
  { value: 'DELETE', label: 'DELETE — Record deleted' },
  { value: 'APPROVE', label: 'APPROVE — Approved request' },
  { value: 'REJECT', label: 'REJECT — Rejected request' },
  { value: 'LOGIN', label: 'LOGIN — User session' },
  { value: 'RECONCILE', label: 'RECONCILE — Data sync' },
  { value: 'SETTINGS_UPDATE', label: 'SETTINGS_UPDATE — Config changed' },
  { value: 'TOGGLE', label: 'TOGGLE — Status toggled' },
  { value: 'ASSIGN', label: 'ASSIGN — Assignment made' },
  { value: 'UNASSIGN', label: 'UNASSIGN — Assignment removed' },
  { value: 'EXPORT', label: 'EXPORT — Report exported' },
  { value: 'BROADCAST', label: 'BROADCAST — Alert dispatched' },
];

/* ── Action badge colour map ── */
const ACTION_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  CREATE:          { bg: 'rgba(22,163,74,0.10)',  color: '#15803d', border: 'rgba(22,163,74,0.3)' },
  UPDATE:          { bg: 'rgba(59,130,246,0.10)', color: '#1d4ed8', border: 'rgba(59,130,246,0.3)' },
  DELETE:          { bg: 'rgba(239,68,68,0.10)',  color: '#b91c1c', border: 'rgba(239,68,68,0.3)' },
  APPROVE:         { bg: 'rgba(22,163,74,0.10)',  color: '#15803d', border: 'rgba(22,163,74,0.3)' },
  REJECT:          { bg: 'rgba(239,68,68,0.10)',  color: '#b91c1c', border: 'rgba(239,68,68,0.3)' },
  SETTINGS_UPDATE: { bg: 'rgba(217,119,6,0.10)',  color: '#b45309', border: 'rgba(217,119,6,0.3)' },
  LOGIN:           { bg: 'rgba(99,102,241,0.10)', color: '#4338ca', border: 'rgba(99,102,241,0.3)' },
  RECONCILE:       { bg: 'rgba(6,182,212,0.10)',  color: '#0e7490', border: 'rgba(6,182,212,0.3)' },
  BROADCAST:       { bg: 'rgba(234,179,8,0.10)',  color: '#a16207', border: 'rgba(234,179,8,0.3)' },
  TOGGLE:          { bg: 'rgba(168,85,247,0.10)', color: '#7c3aed', border: 'rgba(168,85,247,0.3)' },
  ASSIGN:          { bg: 'rgba(20,184,166,0.10)', color: '#0f766e', border: 'rgba(20,184,166,0.3)' },
  UNASSIGN:        { bg: 'rgba(107,114,128,0.10)',color: '#374151', border: 'rgba(107,114,128,0.3)' },
  EXPORT:          { bg: 'rgba(59,130,246,0.10)', color: '#1d4ed8', border: 'rgba(59,130,246,0.3)' },
};

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_COLORS[action] ?? {
    bg: 'rgba(0,82,204,0.08)',
    color: 'var(--ns-blue)',
    border: 'rgba(0,82,204,0.25)',
  };
  return (
    <span
      style={{
        fontSize: '0.68rem',
        fontWeight: 700,
        padding: '0.2rem 0.55rem',
        borderRadius: '4px',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
      }}
    >
      {action}
    </span>
  );
}

interface Props {
  initialLogs: AuditLogItem[];
  totalCount: number;
}

export default function AuditLogViewer({ initialLogs, totalCount }: Props) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [total, setTotal] = useState<number>(totalCount);
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runFilter = (module = selectedModule, action = selectedAction, q = search) => {
    setFilterError(null);
    startTransition(async () => {
      const res = await getAuditLogsAction({
        module,
        action,
        search: q,
        limit: 200,
      });
      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotal(res.totalCount ?? 0);
      } else {
        setFilterError(res.error || 'Failed to fetch audit logs.');
      }
    });
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    runFilter();
  };

  const handleReset = () => {
    setSelectedModule('ALL');
    setSelectedAction('ALL');
    setSearch('');
    runFilter('ALL', 'ALL', '');
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    display: 'block',
    marginBottom: '0.25rem',
  };

  const selectStyle: React.CSSProperties = {
    padding: '0.45rem 0.7rem',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.82rem',
    width: '100%',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header Banner ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          border: '1px solid var(--border-light)',
          borderLeft: '4px solid var(--ns-violet)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.5rem' }}>📋</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              System Audit Logs
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--ns-violet-pale)',
                color: 'var(--ns-violet-dark)',
                border: '1px solid rgba(125, 110, 216, 0.25)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Audit Trail
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Immutable record of operational changes, attendance overrides, settings revisions, and administrative actions.
          </p>
        </div>

        <div
          style={{
            background: 'var(--ns-violet-pale)',
            border: '1px solid rgba(125,110,216,0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.6rem 1.25rem',
            textAlign: 'center',
            minWidth: '100px',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ns-violet-dark)', lineHeight: 1 }}>
            {isPending ? '…' : total.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
            {total === 1 ? 'Entry Found' : 'Entries Found'}
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <form
        onSubmit={handleFilter}
        style={{
          background: 'var(--bg-card)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Module dropdown */}
          <div>
            <label style={labelStyle}>Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={selectStyle}
            >
              {MODULE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Action dropdown */}
          <div>
            <label style={labelStyle}>Action Type</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              style={selectStyle}
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label style={labelStyle}>Search</label>
            <input
              type="text"
              placeholder="Actor name, action details, entity type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...selectStyle, cursor: 'text' }}
            />
          </div>
        </div>

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              opacity: isPending ? 0.75 : 1,
              cursor: isPending ? 'not-allowed' : 'pointer',
            }}
          >
            <span>{isPending ? '⏳' : '🔍'}</span>
            <span>{isPending ? 'Searching...' : 'Filter Logs'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Reset Filters
          </button>

          {isPending && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Loading audit records...
            </span>
          )}
        </div>

        {/* Error feedback */}
        {filterError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {filterError}
          </div>
        )}
      </form>

      {/* ── Logs Table ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-color)' }}>
              {['Timestamp', 'Actor', 'Action', 'Module / Entity', 'Details', 'Payload'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: '0.85rem 1rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textAlign: i === 5 ? 'center' : 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      No audit log entries found
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      {selectedModule !== 'ALL' || selectedAction !== 'ALL' || search.trim()
                        ? 'No records match the current filter criteria. Try adjusting your filters or click Reset Filters.'
                        : 'No system actions have been recorded yet. Logs appear here as administrators and staff perform tracked actions.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {fmtDate(log.createdAt)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {fmtTime(log.createdAt)}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {log.userName || 'System'}
                        </div>
                        {log.userEmail && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.userEmail}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <ActionBadge action={log.action} />
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {log.module}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.entityType}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '280px' }}>
                        {log.details || '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {(log.oldValue || log.newValue) && (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            style={{
                              background: isExpanded ? 'var(--ns-violet-pale)' : 'transparent',
                              border: `1px solid ${isExpanded ? 'rgba(125,110,216,0.4)' : 'var(--border-color)'}`,
                              color: isExpanded ? 'var(--ns-violet-dark)' : 'var(--text-primary)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {isExpanded ? 'Hide ▲' : 'View ▼'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                        <td colSpan={6} style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.35rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Previous State
                              </div>
                              <pre
                                style={{
                                  background: 'var(--bg-card)',
                                  padding: '0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  overflowX: 'auto',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-color)',
                                  margin: 0,
                                  lineHeight: 1.5,
                                }}
                              >
                                {log.oldValue
                                  ? (() => { try { return JSON.stringify(JSON.parse(log.oldValue), null, 2); } catch { return log.oldValue; } })()
                                  : 'None'}
                              </pre>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: '0.35rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Updated State
                              </div>
                              <pre
                                style={{
                                  background: 'var(--bg-card)',
                                  padding: '0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  overflowX: 'auto',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  margin: 0,
                                  lineHeight: 1.5,
                                }}
                              >
                                {log.newValue
                                  ? (() => { try { return JSON.stringify(JSON.parse(log.newValue), null, 2); } catch { return log.newValue; } })()
                                  : 'None'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      {logs.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, textAlign: 'right' }}>
          Showing {logs.length.toLocaleString()} of {total.toLocaleString()} entries.
          {total > 200 && ' Refine your filters to narrow results.'}
        </p>
      )}
    </div>
  );
}

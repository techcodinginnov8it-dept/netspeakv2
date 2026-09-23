'use client';

import React, { useState, useTransition } from 'react';
import { AuditLogItem, getAuditLogsAction } from '@/actions/audit';

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
  const [isPending, startTransition] = useTransition();

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await getAuditLogsAction({
        module: selectedModule,
        action: selectedAction,
        search,
        limit: 100,
      });

      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotal(res.totalCount || 0);
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
          borderLeft: '4px solid var(--ns-violet)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            System Audit &amp; Event Logs
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
          Immutable record of operational changes, system settings revisions, attendance overrides, and administrative actions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleFilter}
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Module:</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
            }}
          >
            <option value="ALL">All Modules</option>
            <option value="system">System / Settings</option>
            <option value="attendance">Attendance</option>
            <option value="operations">Operations</option>
            <option value="requests">Self-Service Requests</option>
            <option value="teachers">Teachers</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Action:</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="SETTINGS_UPDATE">SETTINGS_UPDATE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search details, actor, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.75rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '0.45rem 1.25rem',
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {isPending ? 'Searching...' : 'Filter Logs'}
        </button>
      </form>

      {/* Logs Table */}
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
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
              <th style={{ padding: '0.85rem 1rem' }}>Actor</th>
              <th style={{ padding: '0.85rem 1rem' }}>Action</th>
              <th style={{ padding: '0.85rem 1rem' }}>Module / Entity</th>
              <th style={{ padding: '0.85rem 1rem' }}>Details</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Payload</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit logs recorded matching this query.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.userName}</div>
                        {log.userEmail && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.userEmail}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            background: 'rgba(0, 82, 204, 0.08)',
                            color: 'var(--ns-blue)',
                            border: '1px solid rgba(0, 82, 204, 0.25)',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{log.module}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.entityType}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{log.details || '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {(log.oldValue || log.newValue) && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                        <td colSpan={6} style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.35rem' }}>
                                PREVIOUS STATE:
                              </div>
                              <pre
                                style={{
                                  background: 'var(--bg-card)',
                                  padding: '0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  overflowX: 'auto',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-color)',
                                }}
                              >
                                {log.oldValue ? JSON.stringify(JSON.parse(log.oldValue), null, 2) : 'None'}
                              </pre>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: '0.35rem' }}>
                                UPDATED STATE:
                              </div>
                              <pre
                                style={{
                                  background: 'var(--bg-card)',
                                  padding: '0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  overflowX: 'auto',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                }}
                              >
                                {log.newValue ? JSON.stringify(JSON.parse(log.newValue), null, 2) : 'None'}
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
    </div>
  );
}

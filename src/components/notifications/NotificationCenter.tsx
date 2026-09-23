'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  dispatchNotificationAction,
} from '@/actions/notifications';
import { runScheduledAlertsEvaluationAction } from '@/actions/scheduledJobs';
import { NotificationType, NotificationPriority } from '@prisma/client';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface Props {
  notifications: NotificationItem[];
  canBroadcast: boolean;
  canRunJobs: boolean;
}

export default function NotificationCenter({ notifications, canBroadcast, canRunJobs }: Props) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [items, setItems] = useState<NotificationItem[]>(notifications);

  // Broadcast modal state
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL');
  const [broadcastType, setBroadcastType] = useState<NotificationType>(NotificationType.SYSTEM_NOTICE);
  const [broadcastPriority, setBroadcastPriority] = useState<NotificationPriority>(NotificationPriority.NORMAL);

  // Job runner state
  const [jobLog, setJobLog] = useState<string[] | null>(null);

  const filtered = items.filter((n) => {
    if (filter === 'UNREAD' && n.isRead) return false;
    return true;
  });

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    });
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await dispatchNotificationAction({
        targetRole: broadcastTarget,
        title: broadcastTitle,
        message: broadcastMsg,
        type: broadcastType,
        priority: broadcastPriority,
      });

      if (res.success) {
        setIsBroadcastOpen(false);
        setBroadcastTitle('');
        setBroadcastMsg('');
        alert(`Broadcast dispatched to ${res.count} active users.`);
      }
    });
  };

  const handleRunJobs = () => {
    startTransition(async () => {
      const res = await runScheduledAlertsEvaluationAction();
      if (res.success) {
        setJobLog(res.log);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          border: '1px solid var(--border-light)',
          borderLeft: '4px solid var(--ns-gold)',
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
            <span style={{ fontSize: '1.5rem' }}>🔔</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              Centralized Notification &amp; Alerts Hub
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--ns-gold-pale)',
                color: 'var(--ns-gold-dark)',
                border: '1px solid rgba(214, 164, 28, 0.3)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Unified Notification Engine
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time delivery of attendance alerts, no-login/no-logout reminders, checklists, and system notices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canRunJobs && (
            <button
              onClick={handleRunJobs}
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
              }}
            >
              ⚙️ Run Alerts Evaluation
            </button>
          )}

          {canBroadcast && (
            <button
              onClick={() => setIsBroadcastOpen(true)}
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
              📢 Create Broadcast Alert
            </button>
          )}
        </div>
      </div>

      {/* Scheduled Job Log Output */}
      {jobLog && (
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid #3b82f6',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: '0.5rem' }}>
            ⚡ Scheduled Alerts Evaluator Execution Results:
          </div>
          {jobLog.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No new alert triggers found (system is up to date &amp; idempotent).</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-primary)' }}>
              {jobLog.map((log, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                  {log}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filter / Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('ALL')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: filter === 'ALL' ? 'var(--accent)' : 'var(--bg-card)',
              color: filter === 'ALL' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: filter === 'UNREAD' ? 'var(--accent)' : 'var(--bg-card)',
              color: filter === 'UNREAD' ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Unread ({items.filter((n) => !n.isRead).length})
          </button>
        </div>

        {items.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
            }}
          >
            No notifications to display.
          </div>
        ) : (
          filtered.map((n) => {
            const isUrgent = n.priority === 'URGENT' || n.priority === 'HIGH';

            return (
              <div
                key={n.id}
                style={{
                  background: n.isRead ? 'var(--bg-card)' : 'rgba(59, 130, 246, 0.05)',
                  border: `1px solid ${n.isRead ? 'var(--border-color)' : '#3b82f6'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: isUrgent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 82, 204, 0.10)',
                        color: isUrgent ? '#DC2626' : '#0052CC',
                        border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 82, 204, 0.25)'}`,
                      }}
                    >
                      {n.type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: n.isRead ? 600 : 800,
                      color: n.isRead ? 'var(--text-primary)' : 'var(--ns-blue)',
                    }}
                  >
                    {n.title}
                  </h3>

                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {n.message}
                  </p>

                  {n.link && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <Link
                        href={n.link}
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--accent)',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Action Target →
                      </Link>
                    </div>
                  )}
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Modal */}
      {isBroadcastOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <form
            onSubmit={handleSendBroadcast}
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
              Dispatch Broadcast Notification
            </h3>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Target Audience:
              </label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="ALL">All Active Users (System-wide)</option>
                <option value="TEACHER">Teachers Only</option>
                <option value="ADMIN">Center Admins Only</option>
                <option value="IT">IT Staff Only</option>
                <option value="OPERATIONS_MANAGER">Operations Managers</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Notification Type:
              </label>
              <select
                value={broadcastType}
                onChange={(e) => setBroadcastType(e.target.value as NotificationType)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="SYSTEM_NOTICE">SYSTEM_NOTICE</option>
                <option value="ATTENDANCE_ALERT">ATTENDANCE_ALERT</option>
                <option value="SLOT_DEADLINE">SLOT_DEADLINE</option>
                <option value="SIMULATION_REMINDER">SIMULATION_REMINDER</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Priority:
              </label>
              <select
                value={broadcastPriority}
                onChange={(e) => setBroadcastPriority(e.target.value as NotificationPriority)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Title:
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Center Maintenance Notice"
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
                Message:
              </label>
              <textarea
                required
                rows={3}
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Enter alert body..."
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
                onClick={() => setIsBroadcastOpen(false)}
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
                Send Broadcast
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  dispatchNotificationAction,
} from '@/actions/notifications';
import { runScheduledAlertsEvaluationAction } from '@/actions/scheduledJobs';
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  toggleAnnouncementStatusAction,
  deleteAnnouncementAction,
} from '@/actions/announcements';
import { fmtTime, fmtDate } from '@/lib/formatTime';

/* ── Types ── */

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

type Tab = 'notifications' | 'announcements';

interface Props {
  userId?: string;
  notifications: NotificationItem[];
  announcements: AnnouncementItem[];
  canRunJobs: boolean;
  canManageAnnouncements: boolean;
  canBroadcast?: boolean;
}

export default function NotificationCenter({
  userId,
  notifications,
  announcements: initialAnnouncements,
  canRunJobs,
  canManageAnnouncements,
  canBroadcast = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* ── Active Tab ── */
  const [activeTab, setActiveTab] = useState<Tab>('notifications');

  /* ── Notifications state ── */
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [items, setItems] = useState<NotificationItem[]>(notifications);

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  /* ── Job runner state ── */
  const [jobStatus, setJobStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    log?: string[];
  } | null>(null);

  /* ── Announcements state ── */
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [annFilter, setAnnFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [readAnnIds, setReadAnnIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  // Load per-user read announcements from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      try {
        const stored = localStorage.getItem(`netspeak_read_ann_${userId}`);
        if (stored) {
          setReadAnnIds(new Set(JSON.parse(stored)));
        }
      } catch {
        // ignore
      }
    }
  }, [userId]);

  const markAnnAsRead = (id: string) => {
    setReadAnnIds((prev) => {
      const next = new Set(prev).add(id);
      if (typeof window !== 'undefined' && userId) {
        try {
          localStorage.setItem(`netspeak_read_ann_${userId}`, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  /* ── Broadcast Alert Modal / Form state ── */
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastTargetRole, setBroadcastTargetRole] = useState<'ALL' | 'TEACHER' | 'ADMIN' | 'IT' | 'MANAGEMENT'>('ALL');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('HIGH');
  const [broadcastStatus, setBroadcastStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ── Announcement manager form state ── */
  const [isCreatingAnn, setIsCreatingAnn] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annIsActive, setAnnIsActive] = useState(true);
  const [annMessage, setAnnMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ── Handlers: Notifications ── */
  const unreadCount = items.filter((n) => !n.isRead).length;
  const filteredNotifications = items.filter((n) => (filter === 'UNREAD' ? !n.isRead : true));

  const handleMarkRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      router.refresh();
    });
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      router.refresh();
    });
  };

  const handleDispatchBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastStatus(null);
    startTransition(async () => {
      try {
        const res = await dispatchNotificationAction({
          targetRole: broadcastTargetRole,
          title: broadcastTitle,
          message: broadcastMessage,
          priority: broadcastPriority as any,
          type: 'SYSTEM_NOTICE' as any,
        });

        if (res.success) {
          setBroadcastStatus({
            type: 'success',
            text: `Broadcast alert dispatched successfully to ${res.count} recipient(s).`,
          });
          setBroadcastTitle('');
          setBroadcastMessage('');
          setIsBroadcasting(false);
          router.refresh();
        } else {
          setBroadcastStatus({
            type: 'error',
            text: (res as any).error || 'Failed to dispatch broadcast alert.',
          });
        }
      } catch (err: any) {
        setBroadcastStatus({
          type: 'error',
          text: err?.message || 'Error occurred while broadcasting alert.',
        });
      }
    });
  };

  /* ── Handlers: Run Alerts Evaluation ── */
  const handleRunJobs = () => {
    setJobStatus(null);
    startTransition(async () => {
      try {
        const res = await runScheduledAlertsEvaluationAction();
        if (res.success) {
          setJobStatus({
            type: 'success',
            message: `Evaluation completed successfully (${res.alertsDispatched ?? res.log?.length ?? 0} alert triggers evaluated).`,
            log: res.log,
          });
          router.refresh();
        } else {
          setJobStatus({
            type: 'error',
            message: (res as any)?.error || 'Alert evaluation encountered an issue.',
          });
        }
      } catch (err: any) {
        setJobStatus({
          type: 'error',
          message: err?.message || 'Failed to run alert evaluation.',
        });
      }
    });
  };

  /* ── Handlers: Announcements ── */
  const isAnnRead = (ann: AnnouncementItem) => readAnnIds.has(ann.id);
  const unreadAnnCount = announcements.filter((a) => !isAnnRead(a)).length;
  const filteredAnnouncements = announcements.filter((a) => (annFilter === 'UNREAD' ? !isAnnRead(a) : true));

  const openCreateAnn = () => {
    setEditingAnnId(null);
    setAnnTitle('');
    setAnnContent('');
    setAnnIsActive(true);
    setIsCreatingAnn(true);
    setAnnMessage(null);
  };

  const openEditAnn = (ann: AnnouncementItem) => {
    setEditingAnnId(ann.id);
    setAnnTitle(ann.title);
    setAnnContent(ann.content);
    setAnnIsActive(ann.isActive);
    setIsCreatingAnn(true);
    setAnnMessage(null);
  };

  const handleCancelAnn = () => {
    setIsCreatingAnn(false);
    setEditingAnnId(null);
    setAnnTitle('');
    setAnnContent('');
  };

  const handleSubmitAnn = (e: React.FormEvent) => {
    e.preventDefault();
    setAnnMessage(null);
    startTransition(async () => {
      if (editingAnnId) {
        const res = await updateAnnouncementAction(editingAnnId, {
          title: annTitle,
          content: annContent,
          isActive: annIsActive,
        });
        if (res.error) {
          setAnnMessage({ type: 'error', text: res.error });
        } else {
          setAnnouncements((prev) =>
            prev.map((a) =>
              a.id === editingAnnId
                ? { ...a, title: annTitle, content: annContent, isActive: annIsActive, updatedAt: new Date().toISOString() }
                : a
            )
          );
          setAnnMessage({ type: 'success', text: 'Announcement updated successfully.' });
          setIsCreatingAnn(false);
          setEditingAnnId(null);
          router.refresh();
        }
      } else {
        const res = await createAnnouncementAction({
          title: annTitle,
          content: annContent,
          isActive: annIsActive,
        });
        if (res.error) {
          setAnnMessage({ type: 'error', text: res.error });
        } else {
          setAnnMessage({ type: 'success', text: 'Announcement published successfully.' });
          if (res.announcementId) {
            const nowIso = new Date().toISOString();
            setAnnouncements((prev) => [
              {
                id: res.announcementId!,
                title: annTitle,
                content: annContent,
                isActive: annIsActive,
                createdAt: nowIso,
                updatedAt: nowIso,
              },
              ...prev,
            ]);
          }
          setIsCreatingAnn(false);
          setAnnTitle('');
          setAnnContent('');
          router.refresh();
        }
      }
    });
  };

  const handleToggleAnn = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleAnnouncementStatusAction(id, !currentStatus);
      if (res.error) {
        setAnnMessage({ type: 'error', text: res.error });
      } else {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isActive: !currentStatus } : a))
        );
        router.refresh();
      }
    });
  };

  const handleDeleteAnn = (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    startTransition(async () => {
      const res = await deleteAnnouncementAction(id);
      if (res.error) {
        setAnnMessage({ type: 'error', text: res.error });
      } else {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        setAnnMessage({ type: 'success', text: 'Announcement deleted.' });
        router.refresh();
      }
    });
  };

  /* ── Styles ── */
  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: '0.35rem',
    fontWeight: 500,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Modern Header Banner ── */}
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
          gap: '1.25rem',
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🔔</span>
            <h2
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                margin: 0,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Notifications, Alerts &amp; Announcements
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--ns-gold-pale)',
                color: 'var(--ns-gold-dark)',
                border: '1px solid rgba(214, 164, 28, 0.3)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Unified Hub
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Personal alerts, operational notices, and center announcements — all in one place.
          </p>
        </div>

        {canRunJobs && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleRunJobs}
              disabled={isPending}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '0.55rem 1.1rem',
                whiteSpace: 'nowrap',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-xs)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.75 : 1,
              }}
            >
              <span
                style={{
                  fontSize: '1rem',
                  display: 'inline-block',
                  animation: isPending ? 'spin 1s linear infinite' : 'none',
                }}
              >
                ⚙️
              </span>
              <span>{isPending ? 'Evaluating Alerts…' : 'Run Alerts Evaluation'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Job Evaluator Results Feedback ── */}
      {jobStatus && (
        <div
          style={{
            background: jobStatus.type === 'success' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${jobStatus.type === 'success' ? '#3b82f6' : '#ef4444'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '1rem 1.25rem',
            fontSize: '0.85rem',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: jobStatus.type === 'success' ? 'var(--ns-blue-light)' : '#dc2626',
              marginBottom: jobStatus.log && jobStatus.log.length > 0 ? '0.5rem' : 0,
            }}
          >
            ⚡ {jobStatus.message}
          </div>
          {jobStatus.log && jobStatus.log.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-primary)' }}>
              {jobStatus.log.map((log, idx) => (
                <li key={idx} style={{ marginBottom: '0.2rem' }}>
                  {log}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Tab Bar: Streamlined into 2 Core Hubs ── */}
      <div
        style={{
          display: 'inline-flex',
          padding: '4px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xs)',
          gap: '4px',
          alignSelf: 'flex-start',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '0.5rem 1.2rem',
            borderRadius: 'var(--radius-sm)',
            background: activeTab === 'notifications' ? 'var(--ns-blue)' : 'transparent',
            color: activeTab === 'notifications' ? '#ffffff' : 'var(--text-muted)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
            boxShadow: activeTab === 'notifications' ? 'var(--shadow-sm)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <span>🔔</span>
          <span>My Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                background: activeTab === 'notifications' ? 'rgba(255,255,255,0.28)' : 'rgba(239,68,68,0.15)',
                color: activeTab === 'notifications' ? '#fff' : '#DC2626',
                border: `1px solid ${activeTab === 'notifications' ? 'rgba(255,255,255,0.35)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: 'var(--radius-full)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.05rem 0.45rem',
                lineHeight: 1.5,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          style={{
            padding: '0.5rem 1.2rem',
            borderRadius: 'var(--radius-sm)',
            background: activeTab === 'announcements' ? 'var(--ns-blue)' : 'transparent',
            color: activeTab === 'announcements' ? '#ffffff' : 'var(--text-muted)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
            boxShadow: activeTab === 'announcements' ? 'var(--shadow-sm)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <span>📢</span>
          <span>Center Announcements</span>
          {unreadAnnCount > 0 && (
            <span
              style={{
                background: activeTab === 'announcements' ? 'rgba(255,255,255,0.28)' : 'rgba(217,119,6,0.15)',
                color: activeTab === 'announcements' ? '#fff' : '#B45309',
                border: `1px solid ${activeTab === 'announcements' ? 'rgba(255,255,255,0.35)' : 'rgba(217,119,6,0.3)'}`,
                borderRadius: 'var(--radius-full)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.05rem 0.45rem',
                lineHeight: 1.5,
              }}
            >
              {unreadAnnCount}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: MY NOTIFICATIONS
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filter & Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div
              style={{
                display: 'inline-flex',
                padding: '3px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xs)',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: filter === 'ALL' ? 'var(--ns-blue)' : 'transparent',
                  color: filter === 'ALL' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  boxShadow: filter === 'ALL' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('UNREAD')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: filter === 'UNREAD' ? 'var(--ns-blue)' : 'transparent',
                  color: filter === 'UNREAD' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  boxShadow: filter === 'UNREAD' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Unread ({unreadCount})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {canBroadcast && (
                <button
                  type="button"
                  id="btn-open-broadcast-modal"
                  onClick={() => {
                    setIsBroadcasting(true);
                    setBroadcastStatus(null);
                  }}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <span>📢</span>
                  <span>Create Broadcast Alert</span>
                </button>
              )}

              {items.some((n) => !n.isRead) && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ns-blue)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  ✓ Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Broadcast status feedback message */}
          {broadcastStatus && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: broadcastStatus.type === 'success' ? 'rgba(15, 118, 110, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                border: `1px solid ${broadcastStatus.type === 'success' ? 'rgba(15,118,110,0.35)' : 'rgba(220,38,38,0.35)'}`,
                color: broadcastStatus.type === 'success' ? '#0F766E' : '#DC2626',
              }}
            >
              {broadcastStatus.text}
            </div>
          )}

          {/* Broadcast Alert Composer Modal */}
          {isBroadcasting && (
            <div
              className="card"
              style={{
                padding: '1.5rem',
                border: '1.5px solid var(--ns-blue)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📢</span>
                  <span>Dispatch Broadcast Alert</span>
                </h4>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--ns-blue)',
                    fontWeight: 600,
                  }}
                >
                  Direct System &amp; In-App Alert
                </span>
              </div>

              <form onSubmit={handleDispatchBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>
                      Target Audience / Recipients <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="input"
                      value={broadcastTargetRole}
                      onChange={(e) => setBroadcastTargetRole(e.target.value as any)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                    >
                      <option value="ALL">All Active Users (Universal Broadcast)</option>
                      <option value="TEACHER">All Teachers Only</option>
                      <option value="ADMIN">Admins &amp; Operations Managers</option>
                      <option value="IT">IT Support Team Only</option>
                      <option value="MANAGEMENT">Executive Management</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Alert Priority Level <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="input"
                      value={broadcastPriority}
                      onChange={(e) => setBroadcastPriority(e.target.value as any)}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                    >
                      <option value="NORMAL">Normal Priority</option>
                      <option value="HIGH">High Priority (Highlighted)</option>
                      <option value="URGENT">Urgent (Immediate Warning)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Alert Headline / Subject <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Scheduled Maintenance Advisory: Power Generator Switchover"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Detailed Alert Message / Instructions <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Specify the operational notice, impact window, affected departments, and action items..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary"
                    style={{ padding: '0.55rem 1.4rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                  >
                    <span>⚡</span>
                    <span>{isPending ? 'Dispatching Broadcast…' : 'Send Broadcast Alert'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBroadcasting(false);
                      setBroadcastStatus(null);
                    }}
                    disabled={isPending}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem 1rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredNotifications.length === 0 ? (
              <div
                style={{
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔔</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications found'}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  {filter === 'UNREAD'
                    ? 'All operational alerts and notifications are marked as read.'
                    : 'You have no alerts or notices on record.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isUrgent = n.priority === 'URGENT' || n.priority === 'HIGH';
                return (
                  <div
                    key={n.id}
                    style={{
                      background: n.isRead ? 'var(--bg-card)' : 'rgba(59, 130, 246, 0.05)',
                      border: `1px solid ${n.isRead ? 'var(--border-color)' : '#3b82f6'}`,
                      borderLeft: n.isRead ? '3px solid var(--border-color)' : '3px solid var(--ns-blue)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                          {fmtDate(n.createdAt)} at {fmtTime(n.createdAt)}
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          fontSize: '0.98rem',
                          fontWeight: n.isRead ? 600 : 700,
                          color: n.isRead ? 'var(--text-primary)' : 'var(--ns-blue)',
                        }}
                      >
                        {n.title}
                      </h3>

                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {n.message}
                      </p>

                      {n.link && (
                        <div style={{ marginTop: '0.25rem' }}>
                          <Link
                            href={n.link}
                            style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                          >
                            Action Target →
                          </Link>
                        </div>
                      )}
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={isPending}
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: CENTER ANNOUNCEMENTS (ACCESSIBLE TO ALL ROLES)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Header row with All / Unread Filter and New Announcement Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Filter buttons */}
            <div
              style={{
                display: 'inline-flex',
                padding: '3px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xs)',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setAnnFilter('ALL')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: annFilter === 'ALL' ? 'var(--ns-blue)' : 'transparent',
                  color: annFilter === 'ALL' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  boxShadow: annFilter === 'ALL' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                All ({announcements.length})
              </button>
              <button
                type="button"
                onClick={() => setAnnFilter('UNREAD')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: annFilter === 'UNREAD' ? 'var(--ns-blue)' : 'transparent',
                  color: annFilter === 'UNREAD' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  boxShadow: annFilter === 'UNREAD' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Unread ({unreadAnnCount})
              </button>
            </div>

            {canManageAnnouncements && !isCreatingAnn && (
              <button
                type="button"
                onClick={openCreateAnn}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <span>+</span>
                <span>New Announcement</span>
              </button>
            )}
          </div>

          {/* Status feedback message */}
          {annMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: annMessage.type === 'success' ? 'rgba(15, 118, 110, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                border: `1px solid ${annMessage.type === 'success' ? 'rgba(15,118,110,0.35)' : 'rgba(220,38,38,0.35)'}`,
                color: annMessage.type === 'success' ? '#0F766E' : '#DC2626',
              }}
            >
              {annMessage.text}
            </div>
          )}

          {/* Create / Edit Form (Manager only) */}
          {isCreatingAnn && canManageAnnouncements && (
            <div
              className="card"
              style={{ padding: '1.5rem', border: '1px solid var(--color-primary)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', marginTop: 0 }}>
                {editingAnnId ? 'Edit Announcement' : 'Publish New Announcement'}
              </h4>
              <form onSubmit={handleSubmitAnn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>
                    Announcement Title <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Mandatory Policy: Shift Slot Advance Opening"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Content / Instructions <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Provide detailed instructions, policy rules, or operational updates..."
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="checkbox"
                    id="annIsActiveCheckbox"
                    checked={annIsActive}
                    onChange={(e) => setAnnIsActive(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="annIsActiveCheckbox" style={{ fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                    Broadcast actively to team (visible to all staff &amp; teachers)
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontWeight: 600 }}
                  >
                    {isPending ? 'Saving…' : editingAnnId ? 'Update Notice' : 'Publish Notice'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAnn}
                    disabled={isPending}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Announcements List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredAnnouncements.length === 0 ? (
              <div
                className="card"
                style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📢</div>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {annFilter === 'UNREAD' ? 'No unread announcements' : 'No announcements found'}
                </p>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>
                  {annFilter === 'UNREAD'
                    ? 'You have reviewed and acknowledged all operational announcements.'
                    : 'No center-wide announcements are active at this time.'}
                </p>
              </div>
            ) : (
              filteredAnnouncements.map((ann) => {
                const read = isAnnRead(ann);
                return (
                  <div
                    key={ann.id}
                    className="card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1.5rem',
                      borderLeft: ann.isActive ? '4px solid var(--color-primary)' : '4px solid var(--border-color)',
                      opacity: ann.isActive ? 1 : 0.75,
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{ann.title}</h4>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: ann.isActive ? 'rgba(15, 118, 110, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                            color: ann.isActive ? '#0F766E' : '#6B7280',
                            border: `1px solid ${ann.isActive ? 'rgba(15,118,110,0.3)' : 'var(--border-color)'}`,
                          }}
                        >
                          {ann.isActive ? 'Active Notice' : 'Draft / Inactive'}
                        </span>
                        {read ? (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#0F766E',
                              background: 'rgba(15,118,110,0.08)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            ✓ Read
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#B45309',
                              background: 'rgba(217,119,6,0.1)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            ● Unread
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line', margin: 0 }}>
                        {ann.content}
                      </p>
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Published on {fmtDate(ann.createdAt)} at {fmtTime(ann.createdAt)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '110px' }}>
                      {!read && (
                        <button
                          type="button"
                          onClick={() => markAnnAsRead(ann.id)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', fontWeight: 600 }}
                        >
                          Mark as Read
                        </button>
                      )}
                      {canManageAnnouncements && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleAnn(ann.id, ann.isActive)}
                            disabled={isPending}
                            className="btn btn-secondary"
                            style={{
                              fontSize: '0.78rem',
                              padding: '0.35rem 0.75rem',
                              color: ann.isActive ? '#B45309' : '#0F766E',
                              fontWeight: 600,
                            }}
                          >
                            {ann.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditAnn(ann)}
                            disabled={isPending}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnn(ann.id)}
                            disabled={isPending}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

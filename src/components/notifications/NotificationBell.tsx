'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from '@/actions/notifications';
import { fmtTime } from '@/lib/formatTime';

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

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const fetchNotifications = async () => {
    try {
      const res = await getUserNotificationsAction();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for background alerts
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.28)',
          borderRadius: '10px',
          padding: '0.45rem 0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: '#ffffff',
          position: 'relative',
          backdropFilter: 'blur(8px)',
          transition: 'background 0.2s',
        }}
        title="Notifications"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
      >
        <span style={{ fontSize: '1rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              background: 'var(--ns-gold)',
              color: '#0F172A',
              borderRadius: '9999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.12rem 0.42rem',
              lineHeight: 1,
              fontFamily: 'var(--font-heading)',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          />

          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '360px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '480px',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No notifications yet.
                </div>
              ) : (
                notifications.slice(0, 8).map((n) => {
                  const isUrgent = n.priority === 'URGENT' || n.priority === 'HIGH';

                  return (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div
                          style={{
                            fontWeight: n.isRead ? 600 : 700,
                            fontSize: '0.85rem',
                            color: n.isRead ? 'var(--text-primary)' : 'var(--ns-blue)',
                          }}
                        >
                          {n.title}
                        </div>

                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            title="Mark as read"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dim)',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              padding: '0 0.2rem',
                            }}
                          >
                            ✓
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {n.message}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                          {fmtTime(n.createdAt)}
                        </span>

                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => setIsOpen(false)}
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--accent)',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '0.65rem 1rem',
                borderTop: '1px solid var(--border-color)',
                textAlign: 'center',
                background: 'var(--bg-surface)',
              }}
            >
              <Link
                href="/dashboard/notifications"
                onClick={() => setIsOpen(false)}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Open Notification Center &amp; Alerts →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  toggleAnnouncementStatusAction,
  deleteAnnouncementAction,
} from '@/actions/announcements';
import { fmtTime } from '@/lib/formatTime';

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export default function AnnouncementManager({
  initialAnnouncements,
  canManage,
}: {
  initialAnnouncements: AnnouncementItem[];
  canManage: boolean;
}) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsActive(true);
    setIsCreating(true);
    setMessage(null);
  };

  const openEdit = (ann: AnnouncementItem) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setIsActive(ann.isActive);
    setIsCreating(true);
    setMessage(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setTitle('');
    setContent('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      if (editingId) {
        const res = await updateAnnouncementAction(editingId, { title, content, isActive });
        if (res.error) {
          setMessage({ type: 'error', text: res.error });
        } else {
          setAnnouncements((prev) =>
            prev.map((a) => (a.id === editingId ? { ...a, title, content, isActive } : a))
          );
          setMessage({ type: 'success', text: 'Announcement updated successfully.' });
          setIsCreating(false);
          setEditingId(null);
        }
      } else {
        const res = await createAnnouncementAction({ title, content, isActive });
        if (res.error) {
          setMessage({ type: 'error', text: res.error });
        } else {
          setMessage({ type: 'success', text: 'Announcement published successfully.' });
          if (res.announcementId) {
            setAnnouncements((prev) => [
              {
                id: res.announcementId!,
                title,
                content,
                isActive,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              ...prev,
            ]);
          }
          setIsCreating(false);
          setTitle('');
          setContent('');
        }
      }
    });
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleAnnouncementStatusAction(id, !currentStatus);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isActive: !currentStatus } : a))
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    startTransition(async () => {
      const res = await deleteAnnouncementAction(id);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        setMessage({ type: 'success', text: 'Announcement deleted.' });
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Center Announcements & Operational Notices</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Notices configured here are broadcasted to all teachers and require acknowledgment during Daily Output entry.
          </p>
        </div>

        {!isCreating && canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>+</span>
            <span>New Announcement</span>
          </button>
        )}
      </div>

      {message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            fontWeight: 600,
            backgroundColor: message.type === 'success' ? 'rgba(15, 118, 110, 0.08)' : 'rgba(220, 38, 38, 0.08)',
            border: `1px solid ${message.type === 'success' ? 'rgba(15,118,110,0.35)' : 'rgba(220,38,38,0.35)'}`,
            color: message.type === 'success' ? '#0F766E' : '#DC2626',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Create / Edit Form Card */}
      {isCreating && (
        <div
          className="card"
          style={{
            padding: '1.5rem',
            border: '1px solid var(--color-primary)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {editingId ? 'Edit Announcement' : 'Create New Announcement'}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Announcement Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Mandatory Policy: Shift Slot Advance Opening"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Announcement Content / Instructions <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                className="input"
                rows={4}
                placeholder="Provide detailed instructions, policy rules, or operational updates..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="checkbox"
                id="isActiveCheckbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="isActiveCheckbox" style={{ fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                Broadcast actively to teachers (visible on daily output modal)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                {isPending ? 'Saving...' : editingId ? 'Update Notice' : 'Publish Notice'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
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
        {announcements.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>📢 No announcements found</p>
            <p style={{ fontSize: '0.85rem' }}>
              Create your first announcement to notify teachers of operational updates.
            </p>
          </div>
        ) : (
          announcements.map((ann) => (
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
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{ann.title}</h4>
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
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                  {ann.content}
                </p>

                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Created on {new Date(ann.createdAt).toLocaleDateString()} at{' '}
                  {fmtTime(ann.createdAt)}
                </div>
              </div>

              {canManage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '100px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(ann.id, ann.isActive)}
                    disabled={isPending}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.75rem',
                      color: ann.isActive ? '#B45309' : '#0F766E',
                      fontWeight: 600,
                    }}
                  >
                    {ann.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(ann)}
                    disabled={isPending}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.75rem',
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(ann.id)}
                    disabled={isPending}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.75rem',
                      color: 'var(--danger)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

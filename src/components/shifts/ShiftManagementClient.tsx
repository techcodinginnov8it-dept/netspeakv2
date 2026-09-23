'use client';

import React, { useState, useTransition } from 'react';
import {
  createShiftScheduleAction,
  updateShiftScheduleAction,
  deleteShiftScheduleAction,
  ShiftScheduleRecord,
} from '@/actions/shifts';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Convert "HH:MM" to "HH:MM AM/PM" display */
function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/** Duration label (handles overnight wrapping) */
function duration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // overnight
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─────────────────────────────────────────────
// Shift Form (create / edit)
// ─────────────────────────────────────────────

function ShiftForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ShiftScheduleRecord;
  onClose: () => void;
  onSaved: (shift: ShiftScheduleRecord) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);

    startTransition(async () => {
      const res = initial
        ? await updateShiftScheduleAction(initial.id, data)
        : await createShiftScheduleAction(data);

      if (res.error) {
        setError(res.error);
      } else if (res.shift) {
        onSaved(res.shift);
      }
    });
  };

  const isEdit = Boolean(initial);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: '28px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
          {isEdit ? '✏️ Edit Shift Schedule' : '➕ Create Shift Schedule'}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--foreground-muted)', marginBottom: '20px' }}>
          Times are in <strong>Manila (PHT, UTC+8)</strong> timezone.
        </p>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontSize: '0.88rem', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Shift Name *</label>
            <input
              name="name"
              className="input"
              placeholder="e.g. Mid Shift (15:00 - 00:00)"
              defaultValue={initial?.name}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem' }}>Start Time (PHT) *</label>
              <input
                name="startTime"
                type="time"
                className="input"
                defaultValue={initial?.startTime}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', marginTop: '4px', display: 'block' }}>
                Manila local time
              </span>
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem' }}>End Time (PHT) *</label>
              <input
                name="endTime"
                type="time"
                className="input"
                defaultValue={initial?.endTime}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', marginTop: '4px', display: 'block' }}>
                Use 00:00 for midnight
              </span>
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Description (optional)</label>
            <textarea
              name="description"
              className="input"
              rows={2}
              placeholder="Brief description of this shift..."
              defaultValue={initial?.description ?? ''}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.88rem' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary"
              style={{ fontSize: '0.88rem' }}
            >
              {isPending ? 'Saving…' : isEdit ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Shift Management Component
// ─────────────────────────────────────────────

export default function ShiftManagementClient({
  initialShifts,
  canManage,
}: {
  initialShifts: ShiftScheduleRecord[];
  canManage: boolean;
}) {
  const [shifts, setShifts] = useState<ShiftScheduleRecord[]>(initialShifts);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftScheduleRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSaved = (saved: ShiftScheduleRecord) => {
    setShifts((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    setShowForm(false);
    setEditingShift(null);
  };

  const handleDelete = (id: string) => {
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteShiftScheduleAction(id);
      if (res.error) {
        setDeleteError(res.error);
      } else {
        setShifts((prev) => prev.filter((s) => s.id !== id));
        setDeletingId(null);
      }
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>🕐 Shift Schedules</h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
            Define and manage teacher shift templates. All times are in <strong>Manila (PHT, UTC+8)</strong>.
          </p>
        </div>
        {canManage && (
          <button
            className="btn btn-primary"
            onClick={() => { setShowForm(true); setEditingShift(null); }}
            style={{ whiteSpace: 'nowrap' }}
          >
            + New Shift
          </button>
        )}
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius)',
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', fontSize: '0.9rem', marginBottom: '20px',
        }}>
          ⚠️ {deleteError}
          <button
            onClick={() => setDeleteError(null)}
            style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Shift cards grid */}
      {shifts.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🕐</div>
          <p>No shift schedules defined yet.</p>
          {canManage && (
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowForm(true)}>
              Create First Shift
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="card"
              style={{ padding: '20px', position: 'relative', transition: 'box-shadow 0.2s' }}
            >
              {/* Shift name */}
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '12px', color: 'var(--foreground)' }}>
                {shift.name}
              </div>

              {/* Time block visual */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '999px',
                background: 'linear-gradient(135deg, rgba(0,82,204,0.12), rgba(23,185,120,0.12))',
                border: '1px solid rgba(0,82,204,0.2)',
                marginBottom: '12px',
              }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0052CC', fontFamily: 'monospace' }}>
                  {fmt12(shift.startTime)}
                </span>
                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>→</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#12945E', fontFamily: 'monospace' }}>
                  {shift.endTime === '00:00' ? '12:00 AM (next day)' : fmt12(shift.endTime)}
                </span>
              </div>

              {/* Duration + teacher count */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
                <span>⏱ {duration(shift.startTime, shift.endTime === '00:00' ? '24:00' : shift.endTime)} shift</span>
                <span>👩‍🏫 {shift._count?.teachers ?? 0} teacher(s)</span>
              </div>

              {/* Description */}
              {shift.description && (
                <p style={{ fontSize: '0.82rem', color: 'var(--foreground-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                  {shift.description}
                </p>
              )}

              {/* Actions */}
              {canManage && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    onClick={() => { setEditingShift(shift); setShowForm(false); }}
                  >
                    Edit
                  </button>
                  {deletingId === shift.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#f87171' }}>Confirm?</span>
                      <button
                        className="btn"
                        style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: 'var(--danger)', color: 'white', border: 'none' }}
                        disabled={isPending}
                        onClick={() => handleDelete(shift.id)}
                      >
                        {isPending ? 'Deleting…' : 'Yes, Delete'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        onClick={() => setDeletingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn"
                      style={{
                        fontSize: '0.8rem', padding: '4px 10px',
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#f87171',
                      }}
                      onClick={() => { setDeletingId(shift.id); setDeleteError(null); }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <ShiftForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Edit modal */}
      {editingShift && (
        <ShiftForm
          initial={editingShift}
          onClose={() => setEditingShift(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

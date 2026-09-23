'use client';

import React, { useState, useTransition } from 'react';
import { submitDailyOutputAction } from '@/actions/dailyOutput';

export default function DailyOutputModal({
  isOpen,
  onClose,
  initialData,
  announcements,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    openSlots: number;
    bookedSlots: number;
    classTardiness: number;
    absentClasses: number;
    earlyLeaveClasses: number;
    remarks?: string | null;
  } | null;
  announcements?: Array<{ id: string; title: string; content: string }>;
}) {
  const [openSlots, setOpenSlots] = useState(initialData?.openSlots || 16);
  const [bookedSlots, setBookedSlots] = useState(initialData?.bookedSlots || 14);
  const [classTardiness, setClassTardiness] = useState(initialData?.classTardiness || 0);
  const [absentClasses, setAbsentClasses] = useState(initialData?.absentClasses || 0);
  const [earlyLeaveClasses, setEarlyLeaveClasses] = useState(initialData?.earlyLeaveClasses || 0);
  const [remarks, setRemarks] = useState(initialData?.remarks || '');
  const [acknowledged, setAcknowledged] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) {
      setError('You must acknowledge mandatory operational policies to complete daily output.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitDailyOutputAction({
        openSlots: Number(openSlots),
        bookedSlots: Number(bookedSlots),
        classTardiness: Number(classTardiness),
        absentClasses: Number(absentClasses),
        earlyLeaveClasses: Number(earlyLeaveClasses),
        remarks,
        announcementAcknowledged: acknowledged,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      }
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    }}>
      <div className="card" style={{ maxWidth: 560, width: '100%', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>📝 Shift Daily Output Report</h2>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>
              Required before completing shift. Correctable up to 48 hours post-shift.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            color: '#DC2626',
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '14px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(15, 118, 110, 0.08)',
            border: '1px solid rgba(15, 118, 110, 0.35)',
            color: '#0F766E',
            fontWeight: 600,
            fontSize: '0.85rem',
            marginBottom: '14px',
          }}>
            ✓ Daily Output saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Slot Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Total Open Slots *</label>
              <input
                type="number"
                min="0"
                className="input"
                value={openSlots}
                onChange={(e) => setOpenSlots(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label>Booked Slots *</label>
              <input
                type="number"
                min="0"
                className="input"
                value={bookedSlots}
                onChange={(e) => setBookedSlots(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Exceptions */}
          <div style={{
            padding: '14px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
              ⚠️ Attendance Exceptions
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem' }}>Class Tardiness</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={classTardiness}
                  onChange={(e) => setClassTardiness(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem' }}>Absent Classes</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={absentClasses}
                  onChange={(e) => setAbsentClasses(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem' }}>Early Leave</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={earlyLeaveClasses}
                  onChange={(e) => setEarlyLeaveClasses(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Operational Remarks (Optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. Student network failure in slot 3..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* Mandatory Announcement Acknowledgment */}
          {announcements && announcements.length > 0 && (
            <div style={{
              padding: '12px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '0.8rem',
            }}>
              <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>
                📢 {announcements[0].title}
              </strong>
              <p style={{ color: 'var(--foreground-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
                {announcements[0].content}
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>I have read and acknowledge this mandatory announcement.</span>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn btn-primary" style={{ minWidth: 160 }}>
              {isPending ? 'Submitting...' : 'Submit Daily Output ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import { submitTeacherResignationAction, bookExitInterviewSlotAction } from '@/actions/resignation';
import { ResignationReason } from '@prisma/client';

const REASON_LABELS: Record<ResignationReason, string> = {
  PERSONAL_FAMILY: 'Personal / Family Reasons',
  HEALTH_MEDICAL: 'Health / Medical Reasons',
  SCHEDULE_CONFLICT: 'Schedule Conflict',
  FOUND_ANOTHER_JOB: 'Found Another Job / Better Opportunity',
  HIGHER_PAY_COMPENSATION: 'Higher Pay / Compensation',
  STUDIES_EDUCATION: 'Studies / Education',
  RELOCATION: 'Relocation',
  WORKLOAD_BURNOUT: 'Workload / Burnout',
  PROJECT_WORK_CONCERNS: 'Project / Work Concerns',
  MANAGEMENT_WORKPLACE_CONCERNS: 'Management / Workplace Concerns',
  INTERNET_EQUIPMENT_ISSUES: 'Internet / Equipment Issues',
  CAREER_CHANGE: 'Career Change / No Longer Interested in Teaching',
  OTHER_NOT_SPECIFIED: 'Other / Not Specified',
};

export type ActiveResignationData = {
  id: string;
  fullName: string;
  branch: string;
  project: string;
  dateFiled: string | Date;
  effectivityDate: string | Date;
  reason: ResignationReason;
  resignationLetter: string;
  signature: string;
  status: string;
  exitInterviewSlot?: {
    id: string;
    slotDateTime: string | Date;
    interviewerName: string;
    isCompleted: boolean;
  } | null;
} | null;

export type AvailableSlot = {
  id: string;
  slotDateTime: string | Date;
  interviewerName: string;
};

export default function TeacherResignationForm({
  teacherProfile,
  existingResignation,
  availableSlots,
}: {
  teacherProfile: {
    fullName: string;
    branch?: string;
    project: string;
  };
  existingResignation: ActiveResignationData;
  availableSlots: AvailableSlot[];
}) {
  const [resignation, setResignation] = useState<ActiveResignationData>(existingResignation);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Form input states
  const [effectivityDate, setEffectivityDate] = useState<string>(() => {
    // Default to 30 days in the future
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState<ResignationReason>(ResignationReason.PERSONAL_FAMILY);
  const [signature, setSignature] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Generated Standard Resignation Letter template
  const generateLetterContent = (effDate: string, rReason: ResignationReason, sig: string) => {
    const todayFormatted = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const effDateFormatted = effDate
      ? new Date(effDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '[Date]';

    return `Date: ${todayFormatted}

To: Operations Management & Human Resources
Netspeak Learning Center

Dear Operations Team,

Please accept this letter as formal notification that I am resigning from my position as an ESL Teacher at Netspeak Learning Center (${teacherProfile.branch || 'Main Branch'} - ${teacherProfile.project} Project).

My last day of teaching and effective date of resignation will be on ${effDateFormatted}.

Reason for Resignation:
${REASON_LABELS[rReason]}

I will do my best to ensure a smooth transition of my active class schedules and complete all required exit obligations, including the exit interview and equipment handover, prior to my departure date.

Thank you for the guidance and opportunities during my tenure at Netspeak.

Sincerely,

${sig || teacherProfile.fullName}
${teacherProfile.fullName}`;
  };

  const letterContent = generateLetterContent(effectivityDate, reason, signature);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim()) {
      setMessage({ type: 'error', text: 'Please provide your digital signature to proceed.' });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const res = await submitTeacherResignationAction({
        fullName: teacherProfile.fullName,
        branch: teacherProfile.branch || 'Main Branch',
        project: teacherProfile.project,
        effectivityDate,
        reason,
        resignationLetter: letterContent,
        signature: signature.trim(),
        remarks,
      });

      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({
          type: 'success',
          text: 'Your resignation letter has been submitted and sent to Operations for review.',
        });
        setResignation({
          id: res.resignationId!,
          fullName: teacherProfile.fullName,
          branch: teacherProfile.branch || 'Main Branch',
          project: teacherProfile.project,
          dateFiled: new Date().toISOString(),
          effectivityDate,
          reason,
          resignationLetter: letterContent,
          signature,
          status: 'SUBMITTED',
        });
      }
    });
  };

  const handleBookSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId || !resignation) return;

    setMessage(null);
    startTransition(async () => {
      const res = await bookExitInterviewSlotAction(resignation.id, selectedSlotId);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Exit interview slot confirmed and booked.' });
        const slot = availableSlots.find((s) => s.id === selectedSlotId);
        setResignation((prev) =>
          prev
            ? {
                ...prev,
                status: 'EXIT_INTERVIEW_SCHEDULED',
                exitInterviewSlot: slot
                  ? {
                      id: slot.id,
                      slotDateTime: slot.slotDateTime,
                      interviewerName: slot.interviewerName,
                      isCompleted: false,
                    }
                  : null,
              }
            : null
        );
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Existing Resignation Status Banner */}
      {resignation && (
        <div
          className="card"
          style={{
            padding: '1.75rem',
            borderLeft: '5px solid var(--color-primary)',
            backgroundColor: 'rgba(37, 99, 235, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(37, 99, 235, 0.2)',
                  color: 'var(--color-primary)',
                }}
              >
                Workflow Status: {resignation.status}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>
                Resignation Filed on {new Date(resignation.dateFiled).toLocaleDateString()}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Effective departure date:{' '}
                <strong>{new Date(resignation.effectivityDate).toLocaleDateString()}</strong> | Reason:{' '}
                <strong>{REASON_LABELS[resignation.reason] || resignation.reason}</strong>
              </p>
            </div>
          </div>

          {/* Exit Interview Slot Booking Section */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              🗓 Exit Interview Slot Booking
            </h4>

            {resignation.exitInterviewSlot ? (
              <div style={{ fontSize: '0.9rem', color: '#0F766E', fontWeight: 600 }}>
                ✓ <strong>Exit Interview Confirmed:</strong>{' '}
                {new Date(resignation.exitInterviewSlot.slotDateTime).toLocaleString()} with{' '}
                <em>{resignation.exitInterviewSlot.interviewerName}</em>.
              </div>
            ) : availableSlots.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No exit interview slots currently open. Operations will post interview slots on the 1st day of the month.
              </div>
            ) : (
              <form onSubmit={handleBookSlot} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="input"
                  required
                  style={{ minWidth: '280px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <option value="">-- Choose an available slot --</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {new Date(slot.slotDateTime).toLocaleString()} ({slot.interviewerName})
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={isPending || !selectedSlotId}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  {isPending ? 'Booking...' : 'Confirm Exit Interview Slot'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

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

      {/* Resignation Submission Form */}
      {!resignation && (
        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Teacher Resignation Application</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Please complete all mandatory fields per Netspeak operational offboarding guidelines.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Full Name
              </label>
              <input
                type="text"
                value={teacherProfile.fullName}
                disabled
                className="input"
                style={{ width: '100%', opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.02)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Branch & Project
              </label>
              <input
                type="text"
                value={`${teacherProfile.branch || 'Main Branch'} — ${teacherProfile.project}`}
                disabled
                className="input"
                style={{ width: '100%', opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.02)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Effective Resignation Date <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="date"
                value={effectivityDate}
                onChange={(e) => setEffectivityDate(e.target.value)}
                required
                className="input"
                style={{ width: '100%', padding: '0.55rem 0.75rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Reason for Resignation <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ResignationReason)}
                className="input"
                style={{ width: '100%', padding: '0.55rem 0.75rem' }}
              >
                {Object.entries(REASON_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Standard Resignation Letter Template Preview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              📄 Standard Resignation Letter Template Preview
            </label>
            <textarea
              value={letterContent}
              readOnly
              rows={12}
              className="input"
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: '1.5',
                padding: '1rem',
                backgroundColor: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Digital Signature (Type your Full Name) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Maria Santos"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                required
                className="input"
                style={{
                  width: '100%',
                  fontFamily: 'cursive, sans-serif',
                  fontSize: '1.1rem',
                  padding: '0.55rem 0.75rem',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                Typing your name acts as your binding electronic signature.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Additional Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="Any handover notes or special arrangements..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="input"
                style={{ width: '100%', padding: '0.55rem 0.75rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.75rem', fontSize: '0.95rem' }}
            >
              {isPending ? 'Submitting Resignation...' : 'Submit Resignation Letter ✉️'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

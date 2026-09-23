'use client';

import React, { useState, useTransition } from 'react';
import { submitTeacherConcernAction } from '@/actions/tickets';
import { ConcernCategory, TicketUrgency, TicketStatus } from '@prisma/client';

export type ConcernTicketItem = {
  id: string;
  title: string;
  category: ConcernCategory;
  urgency: TicketUrgency;
  description: string;
  attachmentUrl?: string | null;
  status: TicketStatus;
  assignedToName?: string | null;
  actionTaken?: string | null;
  resolutionNotes?: string | null;
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
};

const CATEGORY_LABELS: Record<ConcernCategory, string> = {
  TECHNICAL_CONCERN: 'Technical Concern',
  ATTENDANCE_CONCERN: 'Attendance Concern',
  SCHEDULE_CONCERN: 'Schedule Concern',
  STUDENT_CONCERN: 'Student Concern',
  ADMIN_CONCERN: 'Admin Concern',
  PROJECT_CONCERN: 'Project Concern',
  PAYMENT_CONCERN: 'Payment Concern',
  EMERGENCY: 'Emergency',
  OTHER: 'Other',
};

const URGENCY_COLORS: Record<TicketUrgency, { bg: string; text: string }> = {
  LOW: { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569' },
  NORMAL: { bg: 'rgba(0, 82, 204, 0.10)', text: '#0052CC' },
  HIGH: { bg: 'rgba(217, 119, 6, 0.12)', text: '#B45309' },
  URGENT: { bg: 'rgba(220, 38, 38, 0.12)', text: '#DC2626' },
};

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  SUBMITTED: { bg: 'rgba(0, 82, 204, 0.10)', text: '#0052CC' },
  ASSIGNED: { bg: 'rgba(125, 110, 216, 0.12)', text: '#6D28D9' },
  UNDER_REVIEW: { bg: 'rgba(217, 119, 6, 0.12)', text: '#B45309' },
  ACTION_TAKEN: { bg: 'rgba(2, 132, 199, 0.12)', text: '#0284C7' },
  RESOLVED: { bg: 'rgba(13, 148, 136, 0.12)', text: '#0F766E' },
  CLOSED: { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569' },
};

export default function TeacherConcernsView({
  initialTickets,
}: {
  initialTickets: ConcernTicketItem[];
}) {
  const [tickets, setTickets] = useState<ConcernTicketItem[]>(initialTickets);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ConcernTicketItem | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ConcernCategory>(ConcernCategory.TECHNICAL_CONCERN);
  const [urgency, setUrgency] = useState<TicketUrgency>(TicketUrgency.NORMAL);
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenModal = () => {
    setTitle('');
    setCategory(ConcernCategory.TECHNICAL_CONCERN);
    setUrgency(TicketUrgency.NORMAL);
    setDescription('');
    setAttachmentUrl('');
    setMessage(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await submitTeacherConcernAction({
        title,
        category,
        urgency,
        description,
        attachmentUrl: attachmentUrl || undefined,
      });

      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Concern ticket filed and submitted to Operations.' });
        if (res.ticketId) {
          setTickets((prev) => [
            {
              id: res.ticketId!,
              title,
              category,
              urgency,
              description,
              attachmentUrl,
              status: TicketStatus.SUBMITTED,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
        setShowModal(false);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            💬 Teacher Concern Ticketing
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Submit and monitor your support requests across technical, attendance, payment, and student concerns.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>+</span>
          <span>Submit Concern Ticket</span>
        </button>
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

      {/* Tickets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {tickets.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎫</div>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No concern tickets filed yet</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              If you experience any equipment issues, scheduling conflicts, or attendance questions, click "Submit Concern Ticket".
            </p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const urgencyBadge = URGENCY_COLORS[ticket.urgency] || URGENCY_COLORS.NORMAL;
            const statusBadge = STATUS_COLORS[ticket.status] || STATUS_COLORS.SUBMITTED;

            return (
              <div
                key={ticket.id}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1.5rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.text,
                      }}
                    >
                      {ticket.status}
                    </span>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: urgencyBadge.bg,
                        color: urgencyBadge.text,
                      }}
                    >
                      {ticket.urgency}
                    </span>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      • {CATEGORY_LABELS[ticket.category]}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    {ticket.title}
                  </h3>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {ticket.description}
                  </p>

                  {ticket.actionTaken && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(13, 148, 136, 0.08)',
                        borderLeft: '3px solid #0D9488',
                        fontSize: '0.85rem',
                        color: '#0F766E',
                      }}
                    >
                      <strong>Operations Action Taken:</strong> {ticket.actionTaken}
                    </div>
                  )}

                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>Filed: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.assignedToName && <span>Assigned to: <strong>{ticket.assignedToName}</strong></span>}
                    {ticket.resolvedAt && (
                      <span style={{ color: 'var(--success)' }}>
                        Resolved on {new Date(ticket.resolvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(ticket)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}
                >
                  View Details
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* New Concern Ticket Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Submit Teacher Concern Ticket</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Concern Title / Summary <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Headset mic static during morning shift"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Category <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ConcernCategory)}
                    className="input"
                    style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as TicketUrgency)}
                    className="input"
                    style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent / Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Detailed Description <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide complete context, class times affected, or troubleshooting done..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="input"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Attachment / Evidence Link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Screenshot link, image URL, or Google Drive link"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket Details View Modal */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Ticket Details</h3>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Title:</span>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem' }}>
                  {selectedTicket.title}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Category:</span>
                  <div style={{ fontWeight: 500 }}>{CATEGORY_LABELS[selectedTicket.category]}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Status:</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{selectedTicket.status}</div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Description:</span>
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '0.25rem',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {selectedTicket.description}
                </div>
              </div>

              {selectedTicket.actionTaken && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Action Taken:</span>
                  <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{selectedTicket.actionTaken}</div>
                </div>
              )}

              {selectedTicket.resolutionNotes && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Resolution Notes:</span>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedTicket.resolutionNotes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setSelectedTicket(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

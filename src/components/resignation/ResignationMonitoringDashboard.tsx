'use client';

import React, { useState, useTransition } from 'react';
import {
  updateResignationStatusAction,
  completeExitInterviewAction,
  completeITClearanceAction,
  deactivateResignedTeacherAction,
  createExitInterviewSlotAction,
} from '@/actions/resignation';
import { ResignationWorkflowStatus, ResignationReason } from '@prisma/client';

export type ResignationMonitoringItem = {
  id: string;
  teacherId: string;
  fullName: string;
  branch: string;
  project: string;
  dateFiled: string | Date;
  effectivityDate: string | Date;
  reason: ResignationReason;
  status: ResignationWorkflowStatus;
  resignationLetter: string;
  signature: string;
  reviewNotes?: string | null;
  tpcapNotified: boolean;
  itCleared: boolean;
  itRemarks?: string | null;
  deactivatedAt?: string | Date | null;
  exitInterviewSlot?: {
    id: string;
    slotDateTime: string | Date;
    interviewerName: string;
    isCompleted: boolean;
    interviewNotes?: string | null;
  } | null;
};

export type ExitSlotItem = {
  id: string;
  slotDateTime: string | Date;
  interviewerName: string;
  isBooked: boolean;
  isCompleted: boolean;
};

const REASON_LABELS: Record<string, string> = {
  PERSONAL_FAMILY: 'Personal / Family',
  HEALTH_MEDICAL: 'Health / Medical',
  SCHEDULE_CONFLICT: 'Schedule Conflict',
  FOUND_ANOTHER_JOB: 'Another Opportunity',
  HIGHER_PAY_COMPENSATION: 'Higher Compensation',
  STUDIES_EDUCATION: 'Studies / Education',
  RELOCATION: 'Relocation',
  WORKLOAD_BURNOUT: 'Workload / Burnout',
  PROJECT_WORK_CONCERNS: 'Project Concerns',
  MANAGEMENT_WORKPLACE_CONCERNS: 'Management Concerns',
  INTERNET_EQUIPMENT_ISSUES: 'Equipment / Internet',
  CAREER_CHANGE: 'Career Change',
  OTHER_NOT_SPECIFIED: 'Other / Not Specified',
};

export default function ResignationMonitoringDashboard({
  initialResignations,
  initialSlots,
}: {
  initialResignations: ResignationMonitoringItem[];
  initialSlots: ExitSlotItem[];
}) {
  const [resignations, setResignations] = useState<ResignationMonitoringItem[]>(initialResignations);
  const [slots, setSlots] = useState<ExitSlotItem[]>(initialSlots);

  // Filters
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'WEEKLY' | 'MONTHLY'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Slot modal state
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [newSlotDateTime, setNewSlotDateTime] = useState('');
  const [newSlotInterviewer, setNewSlotInterviewer] = useState('Operations Manager Assistant');

  // Letter dialog modal
  const [viewLetterItem, setViewLetterItem] = useState<ResignationMonitoringItem | null>(null);

  // Actions dialog states
  const [selectedActionItem, setSelectedActionItem] = useState<ResignationMonitoringItem | null>(null);
  const [actionType, setActionType] = useState<'REVIEW' | 'EXIT_INTERVIEW' | 'IT_CLEARANCE' | 'DEACTIVATE' | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // KPI Calculations
  const totalResignations = resignations.length;
  const pendingInterviews = resignations.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'EXIT_INTERVIEW_SCHEDULED'
  ).length;
  const pendingITClearance = resignations.filter(
    (r) => r.status === 'EXIT_INTERVIEW_COMPLETED' || (!r.itCleared && r.status !== 'DEACTIVATED')
  ).length;
  const completedDeactivations = resignations.filter((r) => r.status === 'DEACTIVATED').length;

  // Filter application
  const filteredResignations = resignations.filter((r) => {
    // Search
    if (searchQuery && !r.fullName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Branch
    if (branchFilter !== 'ALL' && r.branch !== branchFilter) {
      return false;
    }
    // Project
    if (projectFilter !== 'ALL' && r.project !== projectFilter) {
      return false;
    }
    // Reason
    if (reasonFilter !== 'ALL' && r.reason !== reasonFilter) {
      return false;
    }
    // Time filter
    if (timeFilter !== 'ALL') {
      const filingDate = new Date(r.dateFiled);
      const now = new Date();
      if (timeFilter === 'WEEKLY') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (filingDate < oneWeekAgo) return false;
      } else if (timeFilter === 'MONTHLY') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (filingDate < oneMonthAgo) return false;
      }
    }
    return true;
  });

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotDateTime) return;

    startTransition(async () => {
      const res = await createExitInterviewSlotAction(newSlotDateTime, newSlotInterviewer);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Exit interview slot opened successfully.' });
        setSlots((prev) => [
          {
            id: 'temp-' + Date.now(),
            slotDateTime: newSlotDateTime,
            interviewerName: newSlotInterviewer,
            isBooked: false,
            isCompleted: false,
          },
          ...prev,
        ]);
        setNewSlotDateTime('');
        setShowSlotModal(false);
      }
    });
  };

  const handleExecuteAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActionItem || !actionType) return;

    setMessage(null);
    startTransition(async () => {
      let res: any = null;

      if (actionType === 'REVIEW') {
        res = await updateResignationStatusAction(
          selectedActionItem.id,
          ResignationWorkflowStatus.UNDER_REVIEW,
          actionNotes
        );
        if (!res.error) {
          setResignations((prev) =>
            prev.map((r) =>
              r.id === selectedActionItem.id
                ? { ...r, status: ResignationWorkflowStatus.UNDER_REVIEW, reviewNotes: actionNotes }
                : r
            )
          );
        }
      } else if (actionType === 'EXIT_INTERVIEW') {
        const slotId = selectedActionItem.exitInterviewSlot?.id;
        if (!slotId) {
          setMessage({ type: 'error', text: 'No exit interview slot booked for this record.' });
          return;
        }
        res = await completeExitInterviewAction(slotId, actionNotes);
        if (!res.error) {
          setResignations((prev) =>
            prev.map((r) =>
              r.id === selectedActionItem.id
                ? {
                    ...r,
                    status: ResignationWorkflowStatus.EXIT_INTERVIEW_COMPLETED,
                    tpcapNotified: true,
                    exitInterviewSlot: r.exitInterviewSlot
                      ? { ...r.exitInterviewSlot, isCompleted: true, interviewNotes: actionNotes }
                      : null,
                  }
                : r
            )
          );
        }
      } else if (actionType === 'IT_CLEARANCE') {
        res = await completeITClearanceAction(selectedActionItem.id, actionNotes);
        if (!res.error) {
          setResignations((prev) =>
            prev.map((r) =>
              r.id === selectedActionItem.id
                ? {
                    ...r,
                    itCleared: true,
                    itRemarks: actionNotes,
                    status: ResignationWorkflowStatus.IT_CLEARANCE_PENDING,
                  }
                : r
            )
          );
        }
      } else if (actionType === 'DEACTIVATE') {
        res = await deactivateResignedTeacherAction(selectedActionItem.id);
        if (!res.error) {
          setResignations((prev) =>
            prev.map((r) =>
              r.id === selectedActionItem.id
                ? {
                    ...r,
                    status: ResignationWorkflowStatus.DEACTIVATED,
                    deactivatedAt: new Date(),
                  }
                : r
            )
          );
        }
      }

      if (res?.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: `Action successfully updated.` });
        setSelectedActionItem(null);
        setActionType(null);
        setActionNotes('');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            📋 Resignation & Exit Monitoring
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Supervise the complete offboarding pipeline: Resignation → Exit Interview → IT Action → Deactivation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSlotModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>🗓</span>
          <span>Open Exit Interview Slot</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Resignations
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{totalResignations}</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#fcd34d', textTransform: 'uppercase', fontWeight: 600 }}>
            Pending Interviews
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#fcd34d' }}>
            {pendingInterviews}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 600 }}>
            Pending IT Clearance
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#93c5fd' }}>
            {pendingITClearance}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 600 }}>
            Completed Deactivations
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>
            {completedDeactivations}
          </div>
        </div>
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

      {/* Filter Controls Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <input
          type="text"
          placeholder="Search teacher name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ minWidth: '180px', flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Time:</span>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="input"
            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Time</option>
            <option value="WEEKLY">Last 7 Days</option>
            <option value="MONTHLY">Last 30 Days</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Reason:</span>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="input"
            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem', maxWidth: '160px' }}
          >
            <option value="ALL">All Reasons</option>
            {Object.entries(REASON_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Project:</span>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input"
            style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Projects</option>
            <option value="FT">FT</option>
            <option value="PT">PT</option>
            <option value="SPECIAL">SPECIAL</option>
          </select>
        </div>
      </div>

      {/* Monitoring Roster Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Teacher</th>
              <th style={{ padding: '0.85rem 1rem' }}>Branch / Project</th>
              <th style={{ padding: '0.85rem 1rem' }}>Date Filed</th>
              <th style={{ padding: '0.85rem 1rem' }}>Effectivity</th>
              <th style={{ padding: '0.85rem 1rem' }}>Reason</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem' }}>Exit Interview</th>
              <th style={{ padding: '0.85rem 1rem' }}>IT Clearance</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResignations.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No resignation records matching selected filters.
                </td>
              </tr>
            ) : (
              filteredResignations.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{item.fullName}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {item.branch} · <strong>{item.project}</strong>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {new Date(item.dateFiled).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                    {new Date(item.effectivityDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {REASON_LABELS[item.reason] || item.reason}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor:
                          item.status === 'DEACTIVATED'
                            ? 'rgba(156, 163, 175, 0.15)'
                            : item.status === 'EXIT_INTERVIEW_COMPLETED'
                            ? 'rgba(15, 118, 110, 0.1)'
                            : 'rgba(0, 82, 204, 0.1)',
                        color:
                          item.status === 'DEACTIVATED'
                            ? 'var(--text-muted)'
                            : item.status === 'EXIT_INTERVIEW_COMPLETED'
                            ? '#0F766E'
                            : 'var(--ns-blue)',
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                    {item.exitInterviewSlot ? (
                      item.exitInterviewSlot.isCompleted ? (
                        <span style={{ color: 'var(--success)' }}>✓ Completed</span>
                      ) : (
                        <span style={{ color: '#fcd34d' }}>
                          📅 {new Date(item.exitInterviewSlot.slotDateTime).toLocaleDateString()}
                        </span>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>Unscheduled</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                    {item.itCleared ? (
                      <span style={{ color: 'var(--success)' }}>✓ Cleared</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setViewLetterItem(item)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Letter
                      </button>

                      {item.status === 'SUBMITTED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('REVIEW');
                            setActionNotes('');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Review
                        </button>
                      )}

                      {item.exitInterviewSlot && !item.exitInterviewSlot.isCompleted && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('EXIT_INTERVIEW');
                            setActionNotes('');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#fcd34d' }}
                        >
                          Complete Interview
                        </button>
                      )}

                      {!item.itCleared && item.status !== 'DEACTIVATED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('IT_CLEARANCE');
                            setActionNotes('');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#93c5fd' }}
                        >
                          IT Clearance
                        </button>
                      )}

                      {item.status !== 'DEACTIVATED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActionItem(item);
                            setActionType('DEACTIVATE');
                            setActionNotes('');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resignation Letter Modal */}
      {viewLetterItem && (
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
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Resignation Letter — {viewLetterItem.fullName}</h3>
              <button
                type="button"
                onClick={() => setViewLetterItem(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
                padding: '1.25rem',
                backgroundColor: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                marginBottom: '1.5rem',
              }}
            >
              {viewLetterItem.resignationLetter}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div>
                Digital Signature: <strong style={{ color: 'var(--text-primary)' }}>{viewLetterItem.signature}</strong>
              </div>
              <button type="button" onClick={() => setViewLetterItem(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog Modal */}
      {selectedActionItem && actionType && (
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
            onSubmit={handleExecuteAction}
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {actionType === 'REVIEW' && 'Mark Resignation Under Review'}
              {actionType === 'EXIT_INTERVIEW' && 'Complete Exit Interview Evaluation'}
              {actionType === 'IT_CLEARANCE' && 'Record IT / Equipment Clearance'}
              {actionType === 'DEACTIVATE' && 'Confirm Teacher Account Deactivation'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Teacher: <strong>{selectedActionItem.fullName}</strong> ({selectedActionItem.branch} · {selectedActionItem.project})
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                {actionType === 'EXIT_INTERVIEW'
                  ? 'Exit Interview Notes / Feedback'
                  : actionType === 'IT_CLEARANCE'
                  ? 'IT Checklist / Reformat & Equipment Remarks'
                  : 'Operational Remarks'}
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                placeholder="Enter evaluation notes..."
                required={actionType === 'EXIT_INTERVIEW' || actionType === 'IT_CLEARANCE'}
                className="input"
                style={{ width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedActionItem(null);
                  setActionType(null);
                }}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary"
                style={{
                  backgroundColor: actionType === 'DEACTIVATE' ? 'var(--danger)' : undefined,
                  borderColor: actionType === 'DEACTIVATE' ? 'var(--danger)' : undefined,
                }}
              >
                {isPending ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Open Exit Interview Slot Modal */}
      {showSlotModal && (
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
            onSubmit={handleCreateSlot}
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Open Exit Interview Slot
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Publish an available slot for resigning teachers to schedule their exit interview.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Slot Date & Time <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  value={newSlotDateTime}
                  onChange={(e) => setNewSlotDateTime(e.target.value)}
                  required
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Interviewer Name / Designation <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newSlotInterviewer}
                  onChange={(e) => setNewSlotInterviewer(e.target.value)}
                  required
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowSlotModal(false)}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? 'Publishing...' : 'Publish Slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import {
  updateTeacherConcernStatusAction,
  reportIncidentAction,
  updateIncidentStatusAction,
} from '@/actions/tickets';
import {
  ConcernCategory,
  TicketUrgency,
  TicketStatus,
  IncidentCategory,
  IncidentStatus,
} from '@prisma/client';

export type ManagerConcernItem = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherProject: string;
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
};

export type IncidentItem = {
  id: string;
  incidentDate: string | Date;
  incidentTime: string;
  reporterName: string;
  branch: string;
  personInvolved: string;
  category: IncidentCategory;
  description: string;
  evidenceUrl?: string | null;
  actionTaken?: string | null;
  remarks?: string | null;
  status: IncidentStatus;
  createdAt: string | Date;
};

export default function OperationsTicketingDesk({
  initialConcerns,
  initialIncidents,
}: {
  initialConcerns: ManagerConcernItem[];
  initialIncidents: IncidentItem[];
}) {
  const [activeTab, setActiveTab] = useState<'CONCERNS' | 'INCIDENTS'>('CONCERNS');
  const [concerns, setConcerns] = useState<ManagerConcernItem[]>(initialConcerns);
  const [incidents, setIncidents] = useState<IncidentItem[]>(initialIncidents);

  // Concern Filters
  const [concernCategoryFilter, setConcernCategoryFilter] = useState<string>('ALL');
  const [concernStatusFilter, setConcernStatusFilter] = useState<string>('ALL');
  const [concernSearch, setConcernSearch] = useState('');

  // Incident Filters
  const [incidentBranchFilter, setIncidentBranchFilter] = useState<string>('ALL');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('ALL');

  // Concern Action Modal
  const [actionConcern, setActionConcern] = useState<ManagerConcernItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<TicketStatus>(TicketStatus.UNDER_REVIEW);
  const [actionTakenText, setActionTakenText] = useState('');
  const [resolutionNotesText, setResolutionNotesText] = useState('');
  const [assignedToInput, setAssignedToInput] = useState('');

  // New Incident Report Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incDate, setIncDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incTime, setIncTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [incBranch, setIncBranch] = useState('Main Branch');
  const [incPerson, setIncPerson] = useState('');
  const [incCategory, setIncCategory] = useState<IncidentCategory>(IncidentCategory.BEHAVIORAL_MISCONDUCT);
  const [incDesc, setIncDesc] = useState('');
  const [incEvidence, setIncEvidence] = useState('');
  const [incAction, setIncAction] = useState('');
  const [incRemarks, setIncRemarks] = useState('');

  // Incident Resolution Modal
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [incActionUpdate, setIncActionUpdate] = useState('');
  const [incRemarksUpdate, setIncRemarksUpdate] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter Concerns
  const filteredConcerns = concerns.filter((c) => {
    if (concernSearch && !c.teacherName.toLowerCase().includes(concernSearch.toLowerCase()) && !c.title.toLowerCase().includes(concernSearch.toLowerCase())) {
      return false;
    }
    if (concernCategoryFilter !== 'ALL' && c.category !== concernCategoryFilter) return false;
    if (concernStatusFilter !== 'ALL' && c.status !== concernStatusFilter) return false;
    return true;
  });

  // Filter Incidents
  const filteredIncidents = incidents.filter((i) => {
    if (incidentBranchFilter !== 'ALL' && i.branch !== incidentBranchFilter) return false;
    if (incidentStatusFilter !== 'ALL' && i.status !== incidentStatusFilter) return false;
    return true;
  });

  const handleUpdateConcern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionConcern) return;

    startTransition(async () => {
      const res = await updateTeacherConcernStatusAction(
        actionConcern.id,
        targetStatus,
        actionTakenText,
        resolutionNotesText,
        assignedToInput
      );

      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Teacher concern ticket updated.' });
        setConcerns((prev) =>
          prev.map((c) =>
            c.id === actionConcern.id
              ? {
                  ...c,
                  status: targetStatus,
                  actionTaken: actionTakenText || c.actionTaken,
                  resolutionNotes: resolutionNotesText || c.resolutionNotes,
                  assignedToName: assignedToInput || c.assignedToName,
                }
              : c
          )
        );
        setActionConcern(null);
      }
    });
  };

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await reportIncidentAction({
        incidentDate: incDate,
        incidentTime: incTime,
        branch: incBranch,
        personInvolved: incPerson,
        category: incCategory,
        description: incDesc,
        evidenceUrl: incEvidence || undefined,
        actionTaken: incAction || undefined,
        remarks: incRemarks || undefined,
      });

      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: 'Formal incident report filed.' });
        if (res.ticketId) {
          setIncidents((prev) => [
            {
              id: res.ticketId!,
              incidentDate: incDate,
              incidentTime: incTime,
              reporterName: 'Operations / Staff',
              branch: incBranch,
              personInvolved: incPerson,
              category: incCategory,
              description: incDesc,
              evidenceUrl: incEvidence,
              actionTaken: incAction,
              remarks: incRemarks,
              status: IncidentStatus.REPORTED,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
        setShowIncidentModal(false);
      }
    });
  };

  const handleUpdateIncident = (e: React.FormEvent, targetStatus: IncidentStatus) => {
    e.preventDefault();
    if (!selectedIncident) return;

    startTransition(async () => {
      const res = await updateIncidentStatusAction(
        selectedIncident.id,
        targetStatus,
        incActionUpdate,
        incRemarksUpdate
      );

      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({ type: 'success', text: `Incident status updated to ${targetStatus}.` });
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === selectedIncident.id
              ? {
                  ...i,
                  status: targetStatus,
                  actionTaken: incActionUpdate || i.actionTaken,
                  remarks: incRemarksUpdate || i.remarks,
                }
              : i
          )
        );
        setSelectedIncident(null);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            🎫 Support Desk & Incident Reports
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Central operations management desk for Teacher Concerns and Incident Tickets.
          </p>
        </div>

        {activeTab === 'INCIDENTS' && (
          <button
            type="button"
            onClick={() => setShowIncidentModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>⚠️</span>
            <span>File Incident Report</span>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('CONCERNS')}
          className="btn"
          style={{
            backgroundColor: activeTab === 'CONCERNS' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'CONCERNS' ? '#fff' : 'var(--text-muted)',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            padding: '0.5rem 1.25rem',
          }}
        >
          💬 Teacher Concerns ({concerns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INCIDENTS')}
          className="btn"
          style={{
            backgroundColor: activeTab === 'INCIDENTS' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'INCIDENTS' ? '#fff' : 'var(--text-muted)',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            padding: '0.5rem 1.25rem',
          }}
        >
          ⚠️ Incident Reports ({incidents.length})
        </button>
      </div>

      {/* TAB 1: TEACHER CONCERNS DESK */}
      {activeTab === 'CONCERNS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <input
              type="text"
              placeholder="Search teacher or issue..."
              value={concernSearch}
              onChange={(e) => setConcernSearch(e.target.value)}
              className="input"
              style={{ minWidth: '200px', flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            />

            <select
              value={concernCategoryFilter}
              onChange={(e) => setConcernCategoryFilter(e.target.value)}
              className="input"
              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Categories</option>
              <option value="TECHNICAL_CONCERN">Technical Concern</option>
              <option value="ATTENDANCE_CONCERN">Attendance Concern</option>
              <option value="SCHEDULE_CONCERN">Schedule Concern</option>
              <option value="STUDENT_CONCERN">Student Concern</option>
              <option value="ADMIN_CONCERN">Admin Concern</option>
              <option value="PROJECT_CONCERN">Project Concern</option>
              <option value="PAYMENT_CONCERN">Payment Concern</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={concernStatusFilter}
              onChange={(e) => setConcernStatusFilter(e.target.value)}
              className="input"
              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="ACTION_TAKEN">ACTION_TAKEN</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Roster Table */}
          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Teacher</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Title & Issue</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Urgency</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Assigned To</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Filed Date</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredConcerns.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No teacher concerns matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredConcerns.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{c.teacherName}</td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {c.category}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: c.urgency === 'URGENT' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 82, 204, 0.1)',
                            color: c.urgency === 'URGENT' ? '#DC2626' : '#0052CC',
                            border: `1px solid ${c.urgency === 'URGENT' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 82, 204, 0.25)'}`,
                          }}
                        >
                          {c.urgency}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: c.status === 'RESOLVED' ? 'rgba(13, 148, 136, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                            color: c.status === 'RESOLVED' ? '#0F766E' : '#B45309',
                            border: `1px solid ${c.status === 'RESOLVED' ? 'rgba(13, 148, 136, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                        {c.assignedToName || <span style={{ color: 'var(--text-dim)' }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setActionConcern(c);
                            setTargetStatus(c.status);
                            setActionTakenText(c.actionTaken || '');
                            setResolutionNotesText(c.resolutionNotes || '');
                            setAssignedToInput(c.assignedToName || '');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          Manage Ticket
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENT REPORTS LOG */}
      {activeTab === 'INCIDENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters */}
          <div
            className="card"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <select
              value={incidentBranchFilter}
              onChange={(e) => setIncidentBranchFilter(e.target.value)}
              className="input"
              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Branches</option>
              <option value="Main Branch">Main Branch</option>
              <option value="Branch 2">Branch 2</option>
            </select>

            <select
              value={incidentStatusFilter}
              onChange={(e) => setIncidentStatusFilter(e.target.value)}
              className="input"
              style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">REPORTED</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="ACTION_TAKEN">ACTION_TAKEN</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          {/* Incidents Table */}
          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Date & Time</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Branch</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Person Involved</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Description</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No incident reports filed.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => (
                    <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div>{new Date(inc.incidentDate).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{inc.incidentTime}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{inc.branch}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{inc.personInvolved}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {inc.category}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inc.description}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            backgroundColor: inc.status === 'RESOLVED' ? 'rgba(15, 118, 110, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                            border: `1px solid ${inc.status === 'RESOLVED' ? 'rgba(15, 118, 110, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`,
                            color: inc.status === 'RESOLVED' ? '#0F766E' : '#DC2626',
                          }}
                        >
                          {inc.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncident(inc);
                            setIncActionUpdate(inc.actionTaken || '');
                            setIncRemarksUpdate(inc.remarks || '');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          Review Incident
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Concern Manage Modal */}
      {actionConcern && (
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
            onSubmit={handleUpdateConcern}
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Manage Concern Ticket</h3>
              <button
                type="button"
                onClick={() => setActionConcern(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{actionConcern.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Teacher: <strong>{actionConcern.teacherName}</strong> ({actionConcern.teacherProject})
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', whiteSpace: 'pre-line', color: 'var(--text-primary)' }}>
                  {actionConcern.description}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Lifecycle Status
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as TicketStatus)}
                    className="input"
                    style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="ACTION_TAKEN">ACTION_TAKEN</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Assigned Personnel
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., IT Specialist John"
                    value={assignedToInput}
                    onChange={(e) => setAssignedToInput(e.target.value)}
                    className="input"
                    style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Action Taken (Visible to Teacher)
                </label>
                <textarea
                  rows={2}
                  placeholder="Record immediate troubleshooting or actions..."
                  value={actionTakenText}
                  onChange={(e) => setActionTakenText(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Internal Resolution Notes
                </label>
                <input
                  type="text"
                  placeholder="Internal audit notes..."
                  value={resolutionNotesText}
                  onChange={(e) => setResolutionNotesText(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActionConcern(null)}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? 'Updating...' : 'Save Ticket Status'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Incident Modal */}
      {showIncidentModal && (
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
            onSubmit={handleCreateIncident}
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>File Formal Incident Report</h3>
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Incident Date <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={incDate}
                    onChange={(e) => setIncDate(e.target.value)}
                    required
                    className="input"
                    style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Incident Time <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="time"
                    value={incTime}
                    onChange={(e) => setIncTime(e.target.value)}
                    required
                    className="input"
                    style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Branch <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={incBranch}
                    onChange={(e) => setIncBranch(e.target.value)}
                    required
                    className="input"
                    style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                    Person Involved <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Teacher Maria / Student Kevin"
                    value={incPerson}
                    onChange={(e) => setIncPerson(e.target.value)}
                    required
                    className="input"
                    style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Incident Category <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={incCategory}
                  onChange={(e) => setIncCategory(e.target.value as IncidentCategory)}
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                >
                  <option value="BEHAVIORAL_MISCONDUCT">Behavioral Misconduct</option>
                  <option value="EQUIPMENT_DAMAGE">Equipment Damage</option>
                  <option value="UNAUTHORIZED_ABSENCE">Unauthorized Absence</option>
                  <option value="INTERNET_POWER_OUTAGE">Internet / Power Outage</option>
                  <option value="STUDENT_DISPUTE">Student Dispute</option>
                  <option value="SECURITY_BREACH">Security Breach</option>
                  <option value="POLICY_VIOLATION">Policy Violation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Description of Incident <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail exact events and circumstances..."
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  required
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                  Action Taken Immediately
                </label>
                <input
                  type="text"
                  placeholder="Immediate intervention or resolution..."
                  value={incAction}
                  onChange={(e) => setIncAction(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? 'Filing Report...' : 'File Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review / Resolve Incident Modal */}
      {selectedIncident && (
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Review Incident Report</h3>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Branch / Person Involved:</span>
                <div style={{ fontWeight: 600 }}>{selectedIncident.branch} — {selectedIncident.personInvolved}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)' }}>Incident Category & Time:</span>
                <div>{selectedIncident.category} at {selectedIncident.incidentTime} ({new Date(selectedIncident.incidentDate).toLocaleDateString()})</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)' }}>Description:</span>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '0.25rem' }}>
                  {selectedIncident.description}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Action Taken / Resolution
                </label>
                <input
                  type="text"
                  value={incActionUpdate}
                  onChange={(e) => setIncActionUpdate(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Management Remarks
                </label>
                <input
                  type="text"
                  value={incRemarksUpdate}
                  onChange={(e) => setIncRemarksUpdate(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.75rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={(e) => handleUpdateIncident(e, IncidentStatus.INVESTIGATING)}
                className="btn btn-secondary"
                disabled={isPending}
              >
                Mark Investigating
              </button>
              <button
                type="button"
                onClick={(e) => handleUpdateIncident(e, IncidentStatus.RESOLVED)}
                className="btn btn-primary"
                disabled={isPending}
              >
                Mark Resolved ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

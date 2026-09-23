'use client';

import React, { useState, useTransition } from 'react';
import {
  RequirementStatus,
  OnboardingStatus,
} from '@prisma/client';
import {
  updateRequirementStatusAction,
  verifyAndGrantSlotEligibilityAction,
  createNewHireRecordAction,
  NewHireSummary,
} from '@/actions/newHire';

export type AdminRequirementItem = {
  id: string;
  requirementKey: string;
  label: string;
  status: RequirementStatus;
  completedAt?: string | Date | null;
  verifiedById?: string | null;
  verifiedAt?: string | Date | null;
  notes?: string | null;
};

export type AdminNewHireRecord = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  teacherSystemId?: string | null;
  startDate: string | Date;
  branch: string;
  project: string;
  status: OnboardingStatus;
  completionPct: number;
  slotsEligible: boolean;
  slotsEligibleAt?: string | Date | null;
  notes?: string | null;
  requirements: AdminRequirementItem[];
};

export type TeacherOption = {
  id: string;
  fullName: string;
  systemId: string;
  branch?: string | null;
};

const STATUS_CFG: Record<RequirementStatus, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Pending', bg: 'rgba(107, 114, 128, 0.12)', text: '#6B7280' },
  COMPLETED: { label: 'Completed', bg: 'rgba(15, 118, 110, 0.12)', text: '#0F766E' },
  MISSING: { label: 'Missing', bg: 'rgba(220, 38, 38, 0.1)', text: '#DC2626' },
  VERIFIED: { label: 'Verified', bg: 'rgba(0, 82, 204, 0.1)', text: 'var(--ns-blue)' },
};

const ONBOARDING_STATUS_CFG: Record<OnboardingStatus, { label: string; bg: string; text: string }> = {
  IN_PROGRESS: { label: 'In Progress', bg: 'rgba(180, 83, 9, 0.1)', text: '#B45309' },
  COMPLETED: { label: 'Completed', bg: 'rgba(15, 118, 110, 0.12)', text: '#0F766E' },
  OVERDUE: { label: 'Overdue', bg: 'rgba(220, 38, 38, 0.1)', text: '#DC2626' },
  SLOTS_ELIGIBLE: { label: 'Slots Eligible', bg: 'rgba(0, 82, 204, 0.1)', text: 'var(--ns-blue)' },
};

export default function NewHireDashboard({
  initialRecords,
  summary,
  availableTeachers,
}: {
  initialRecords: AdminNewHireRecord[];
  summary: NewHireSummary;
  availableTeachers: TeacherOption[];
}) {
  const [records, setRecords] = useState<AdminNewHireRecord[]>(initialRecords);
  const [activeTab, setActiveTab] = useState<'ALL' | OnboardingStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AdminNewHireRecord | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBranch, setNewBranch] = useState('MAIN');
  const [newProject, setNewProject] = useState('ESL Regular');

  const [notesModalReq, setNotesModalReq] = useState<AdminRequirementItem | null>(null);
  const [reqNotes, setReqNotes] = useState('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter records
  const filteredRecords = records.filter(r => {
    const matchesTab = activeTab === 'ALL' || r.status === activeTab;
    const matchesQuery =
      r.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.teacherSystemId && r.teacherSystemId.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesQuery;
  });

  // Handle requirement update
  const handleUpdateReqStatus = (reqId: string, status: RequirementStatus, notes?: string) => {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await updateRequirementStatusAction(reqId, status, notes);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess('Requirement status updated.');
        // Update local state
        setRecords(prev =>
          prev.map(rec => {
            if (!rec.requirements.some(req => req.id === reqId)) return rec;
            const updatedReqs = rec.requirements.map(req =>
              req.id === reqId ? { ...req, status, notes: notes ?? req.notes } : req
            );
            const doneCount = updatedReqs.filter(r => r.status === 'COMPLETED' || r.status === 'VERIFIED').length;
            const pct = Math.round((doneCount / updatedReqs.length) * 100);
            const allVerified = updatedReqs.every(r => r.status === 'VERIFIED' || r.status === 'COMPLETED');
            const updatedRec: AdminNewHireRecord = {
              ...rec,
              requirements: updatedReqs,
              completionPct: pct,
              status: allVerified ? OnboardingStatus.COMPLETED : rec.status,
            };
            if (selectedRecord && selectedRecord.id === rec.id) {
              setSelectedRecord(updatedRec);
            }
            return updatedRec;
          })
        );
      }
    });
  };

  // Handle Grant Slot Eligibility
  const handleGrantEligibility = (recordId: string) => {
    if (!confirm('Are you sure you want to grant Slot Eligibility to this teacher?')) return;
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await verifyAndGrantSlotEligibilityAction(recordId);
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionSuccess('Slot eligibility granted successfully!');
        setRecords(prev =>
          prev.map(rec => {
            if (rec.id !== recordId) return rec;
            const updated = {
              ...rec,
              slotsEligible: true,
              slotsEligibleAt: new Date().toISOString(),
              status: OnboardingStatus.SLOTS_ELIGIBLE,
            };
            if (selectedRecord && selectedRecord.id === recordId) {
              setSelectedRecord(updated);
            }
            return updated;
          })
        );
      }
    });
  };

  // Handle Create Record
  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setActionError('Please select a teacher.');
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const res = await createNewHireRecordAction({
        teacherId: selectedTeacherId,
        startDate: newStartDate,
        branch: newBranch,
        project: newProject,
      });
      if (res.error) {
        setActionError(res.error);
      } else {
        setShowCreateModal(false);
        setActionSuccess('New hire onboarding record created! Refreshing table...');
        window.location.reload();
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            🎓 New Hire Onboarding Desk
          </h1>
          <p style={{ color: 'var(--text-dim)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Monitor and verify standard 18-point requirements, ensure 3-day window compliance, and grant slot eligibility.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>➕</span> Add New Hire Record
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total In Pipeline</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{summary.total}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Progress</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#B45309', marginTop: '0.25rem' }}>{summary.inProgress}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requirements Done</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F766E', marginTop: '0.25rem' }}>{summary.completed}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slots Eligible ✅</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ns-blue)', marginTop: '0.25rem' }}>{summary.slotsEligible}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue (&gt;3 Days)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#DC2626', marginTop: '0.25rem' }}>{summary.overdue}</div>
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.35)', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
          ⚠️ {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ background: 'rgba(15, 118, 110, 0.08)', border: '1px solid rgba(15, 118, 110, 0.35)', color: '#0F766E', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          {(['ALL', 'IN_PROGRESS', 'SLOTS_ELIGIBLE', 'COMPLETED', 'OVERDUE'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-dim)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab === 'ALL' ? 'All Hires' : ONBOARDING_STATUS_CFG[tab]?.label || tab}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by teacher, ID, branch..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1rem',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            width: '280px',
          }}
        />
      </div>

      {/* Roster Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontWeight: 600 }}>Teacher</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontWeight: 600 }}>Start Date</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontWeight: 600 }}>Branch / Project</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontWeight: 600 }}>Progress</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontWeight: 600 }}>Slot Eligibility</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No onboarding records found matching current criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map(rec => {
                const sDate = new Date(rec.startDate);
                const daysIn = Math.floor((new Date().getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
                const is3DaysPassed = daysIn >= 3;
                const statusBadge = ONBOARDING_STATUS_CFG[rec.status] || ONBOARDING_STATUS_CFG.IN_PROGRESS;

                return (
                  <tr key={rec.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rec.teacherName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{rec.teacherSystemId || rec.teacherEmail}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>
                      <div>{sDate.toLocaleDateString('en-PH')}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: is3DaysPassed ? '#0F766E' : '#B45309' }}>
                        {daysIn} day{daysIn !== 1 ? 's' : ''} since start
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>
                      <div>{rec.branch}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{rec.project}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', minWidth: '130px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${rec.completionPct}%`,
                              height: '100%',
                              background: rec.completionPct === 100 ? '#10b981' : 'var(--accent-primary)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rec.completionPct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ background: statusBadge.bg, color: statusBadge.text, padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {rec.slotsEligible ? (
                        <span style={{ background: 'rgba(15,118,110,0.1)', border: '1px solid rgba(15,118,110,0.35)', color: '#0F766E', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
                          ✅ Eligible
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(107,114,128,0.15)', color: '#6B7280', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                          ⏳ Pending ({is3DaysPassed ? 'Window Met' : `${3 - daysIn}d left`})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.375rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        📋 Checklist ({rec.requirements.filter(r => r.status === 'COMPLETED' || r.status === 'VERIFIED').length}/18)
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 18-Item Checklist Modal */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                  Onboarding Checklist — {selectedRecord.teacherName}
                </h2>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Branch: {selectedRecord.branch} &bull; Project: {selectedRecord.project} &bull; Start Date: {new Date(selectedRecord.startDate).toLocaleDateString('en-PH')}
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Eligibility Banner & Action */}
            <div
              style={{
                background: selectedRecord.slotsEligible ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${selectedRecord.slotsEligible ? '#10b981' : '#f59e0b'}`,
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: selectedRecord.slotsEligible ? '#0F766E' : '#B45309', fontSize: '0.95rem' }}>
                  {selectedRecord.slotsEligible ? '✅ Slot Eligibility Granted' : '⏳ Slot Eligibility Verification Pending'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  3-day minimum window required from start date before admin verification.
                </div>
              </div>
              {!selectedRecord.slotsEligible && (
                <button
                  onClick={() => handleGrantEligibility(selectedRecord.id)}
                  disabled={isPending}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 1rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  Verify & Grant Slots Eligibility
                </button>
              )}
            </div>

            {/* 18-Item Requirements List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '0.75rem' }}>
              {selectedRecord.requirements.map(req => {
                const badge = STATUS_CFG[req.status];
                return (
                  <div
                    key={req.id}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{req.label}</span>
                      <span style={{ background: badge.bg, color: badge.text, padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 600 }}>
                        {badge.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.25rem' }}>
                      <select
                        value={req.status}
                        onChange={e => handleUpdateReqStatus(req.id, e.target.value as RequirementStatus)}
                        disabled={isPending}
                        style={{
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          flex: 1,
                        }}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="MISSING">Missing</option>
                        <option value="VERIFIED">Verified</option>
                      </select>

                      <button
                        onClick={() => {
                          setNotesModalReq(req);
                          setReqNotes(req.notes || '');
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-dim)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        📝 {req.notes ? 'Notes' : 'Add Note'}
                      </button>
                    </div>

                    {req.notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Note: {req.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'right', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 1.25rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Editor Sub-modal */}
      {notesModalReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              maxWidth: '450px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
              Notes for {notesModalReq.label}
            </h3>
            <textarea
              rows={4}
              value={reqNotes}
              onChange={e => setReqNotes(e.target.value)}
              placeholder="e.g. Verified NBI copy on file, document expires Dec 2026..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '0.5rem',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setNotesModalReq(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-dim)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateReqStatus(notesModalReq.id, notesModalReq.status, reqNotes);
                  setNotesModalReq(null);
                }}
                style={{
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Hire Record Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                Create Onboarding Record
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                  Select Teacher *
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">-- Choose Teacher --</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.systemId}) {t.branch ? `[${t.branch}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                    Branch *
                  </label>
                  <input
                    type="text"
                    value={newBranch}
                    onChange={e => setNewBranch(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                    Project *
                  </label>
                  <input
                    type="text"
                    value={newProject}
                    onChange={e => setNewProject(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-dim)',
                    padding: '0.5rem 1rem',
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
                    background: 'var(--accent-primary)',
                    border: 'none',
                    color: '#fff',
                    padding: '0.5rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isPending ? 'Creating...' : 'Create Record & Seed 18 Points'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

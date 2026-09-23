'use client';

import React, { useState, useTransition } from 'react';
import {
  reviewTeacherRegistrationAction,
  approveTeacherRegistrationAction,
  rejectTeacherRegistrationAction,
  updateTeacherOperationalAction,
} from '@/actions/teachers';
import { assignTeacherShiftAction } from '@/actions/shifts';
import type { ShiftScheduleRecord } from '@/actions/shifts';
import Link from 'next/link';

type TeacherProfileData = {
  id: string;
  userId: string | null;
  displayName: string;
  realFullName: string;
  birthday: Date;
  cellphone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  schoolAttended: string;
  course: string;
  major: string;
  launchDate: Date | null;
  projectType: string;
  department: string;
  assignedRestDay: string;
  portalUsername: string | null;
  portalPassword: string | null;
  shiftScheduleId: string | null;
  shiftSchedule: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    description: string | null;
  } | null;
  registrationStatus: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewedById: string | null;
  reviewedAt: Date | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  user?: {
    id: string;
    username: string;
    email: string;
    isActive: boolean;
  } | null;
};

export default function TeacherProfileDetail({
  teacher,
  allShifts,
  canReview,
  canApprove,
  canUpdate,
}: {
  teacher: TeacherProfileData;
  allShifts: ShiftScheduleRecord[];
  canReview: boolean;
  canApprove: boolean;
  canUpdate: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newCredentials, setNewCredentials] = useState<{
    username: string;
    temporaryPassword: string;
    email: string;
  } | null>(null);

  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Operational Edit State
  const [isEditingOps, setIsEditingOps] = useState(false);
  const [opsForm, setOpsForm] = useState({
    launchDate: teacher.launchDate ? new Date(teacher.launchDate).toISOString().split('T')[0] : '',
    projectType: teacher.projectType as 'FTEX' | 'FT' | 'TTP',
    department: teacher.department as 'DOMESTIC' | 'OVERSEAS',
    assignedRestDay: teacher.assignedRestDay,
    portalUsername: teacher.portalUsername || '',
    portalPassword: teacher.portalPassword || '',
  });

  // Shift assignment state
  const [shiftId, setShiftId] = useState<string>(teacher.shiftScheduleId || '');
  const [isAssigningShift, setIsAssigningShift] = useState(false);
  const [shiftSuccess, setShiftSuccess] = useState<string | null>(null);

  const handleMarkReview = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await reviewTeacherRegistrationAction(teacher.id);
        if (res.success) {
          setSuccessMessage('Registration marked as Under Review.');
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await approveTeacherRegistrationAction(teacher.id);
        if (res.success && res.credentials) {
          setNewCredentials(res.credentials);
          setSuccessMessage('Teacher approved and account activated successfully!');
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await rejectTeacherRegistrationAction(teacher.id, rejectionReason);
        if (res.success) {
          setRejectionModalOpen(false);
          setSuccessMessage('Registration rejected with recorded rationale.');
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleSaveOps = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateTeacherOperationalAction(teacher.id, opsForm);
        if (res.success) {
          setIsEditingOps(false);
          setSuccessMessage('Operational details updated successfully.');
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  const handleAssignShift = () => {
    setError(null);
    setShiftSuccess(null);
    setIsAssigningShift(true);
    startTransition(async () => {
      try {
        const res = await assignTeacherShiftAction(teacher.id, shiftId || null);
        if (res.success) {
          const found = allShifts.find((s) => s.id === shiftId);
          setShiftSuccess(
            found
              ? `Shift assigned: ${found.name}`
              : 'Shift cleared successfully.'
          );
        } else if (res.error) {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsAssigningShift(false);
      }
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{
            padding: '5px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(15, 118, 110, 0.1)',
            color: '#0F766E',
            fontSize: '0.85rem',
            fontWeight: 700,
            border: '1px solid rgba(15, 118, 110, 0.35)'
          }}>
            ✓ Approved & Active
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span style={{
            padding: '5px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(0, 82, 204, 0.1)',
            color: '#0052CC',
            fontSize: '0.85rem',
            fontWeight: 700,
            border: '1px solid rgba(0, 82, 204, 0.25)'
          }}>
            🔍 Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{
            padding: '5px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#DC2626',
            fontSize: '0.85rem',
            fontWeight: 700,
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            ✕ Rejected
          </span>
        );
      default:
        return (
          <span style={{
            padding: '5px 14px',
            borderRadius: '999px',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            color: '#B45309',
            fontSize: '0.85rem',
            fontWeight: 700,
            border: '1px solid rgba(217, 119, 6, 0.25)'
          }}>
            ⏳ Pending Admin Review
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Card */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 700 }}>{teacher.displayName}</h1>
              {statusBadge(teacher.registrationStatus)}
            </div>
            <div style={{ color: 'var(--foreground-muted)', fontSize: '0.95rem' }}>
              Real Name: <strong style={{ color: 'var(--foreground)' }}>{teacher.realFullName}</strong> | Cellphone: <strong style={{ color: 'var(--foreground)' }}>{teacher.cellphone}</strong>
            </div>
          </div>

          {/* Action Workflow Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/dashboard/teachers" className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              ← Back to Teachers
            </Link>

            {teacher.registrationStatus === 'PENDING' && canReview && (
              <button
                type="button"
                onClick={handleMarkReview}
                disabled={isPending}
                className="btn btn-secondary"
                style={{ borderColor: 'var(--primary)', color: '#93c5fd' }}
              >
                {isPending ? 'Updating...' : 'Mark Under Review'}
              </button>
            )}

            {['PENDING', 'UNDER_REVIEW'].includes(teacher.registrationStatus) && canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="btn btn-primary"
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                {isPending ? 'Processing...' : '✓ Approve & Activate Account'}
              </button>
            )}

            {['PENDING', 'UNDER_REVIEW'].includes(teacher.registrationStatus) && (canReview || canApprove) && (
              <button
                type="button"
                onClick={() => setRejectionModalOpen(true)}
                disabled={isPending}
                className="btn btn-secondary"
                style={{ borderColor: 'var(--danger)', color: '#f87171' }}
              >
                ✕ Reject Application
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            color: '#DC2626',
            fontWeight: 600
          }}>
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(15, 118, 110, 0.08)',
            border: '1px solid rgba(15, 118, 110, 0.35)',
            color: '#0F766E',
            fontWeight: 600
          }}>
            ✓ {successMessage}
          </div>
        )}

        {newCredentials && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid var(--primary)',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              🔑 Credentials Generated Successfully
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)', marginBottom: '12px' }}>
              Initial login credentials have been generated and the user account is now active.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block' }}>USERNAME</span>
                <code>{newCredentials.username}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block' }}>TEMPORARY PASSWORD</span>
                <code>{newCredentials.temporaryPassword}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'block' }}>ASSOCIATED EMAIL</span>
                <code>{newCredentials.email}</code>
              </div>
            </div>
          </div>
        )}

        {teacher.registrationStatus === 'REJECTED' && teacher.rejectionReason && (
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <strong style={{ color: '#f87171' }}>Rejection Reason:</strong> {teacher.rejectionReason}
          </div>
        )}
      </div>

      {/* Grid: Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Card 1: Personal & Emergency Contact */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            👤 Personal Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Display Name</span>
              <strong>{teacher.displayName}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Complete Real Name</span>
              <strong>{teacher.realFullName}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Birthday</span>
              <strong>{new Date(teacher.birthday).toLocaleDateString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Cellphone</span>
              <strong>{teacher.cellphone}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Emergency Contact</span>
              <strong>{teacher.emergencyContactName} ({teacher.emergencyContactPhone})</strong>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Address</span>
              <span>{teacher.address}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Academic Background */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            🎓 Academic Background
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>School Attended</span>
              <strong>{teacher.schoolAttended}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Degree / Course</span>
              <strong>{teacher.course}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Major / Specialization</span>
              <strong>{teacher.major}</strong>
            </div>
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Linked User Account</span>
              {teacher.user ? (
                <div>
                  <code>{teacher.user.username}</code> ({teacher.user.email}) - {teacher.user.isActive ? 'Active' : 'Disabled'}
                </div>
              ) : (
                <span style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>No system account created yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Operational Information */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              ⚙️ Operational Setup
            </h3>
            {canUpdate && !isEditingOps && (
              <button
                type="button"
                onClick={() => setIsEditingOps(true)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                Edit Details
              </button>
            )}
          </div>

          {isEditingOps ? (
            <form onSubmit={handleSaveOps} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Launch Date</label>
                <input
                  type="date"
                  className="input"
                  value={opsForm.launchDate}
                  onChange={(e) => setOpsForm({ ...opsForm, launchDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Project Type</label>
                <select
                  className="input"
                  value={opsForm.projectType}
                  onChange={(e) => setOpsForm({ ...opsForm, projectType: e.target.value as any })}
                >
                  <option value="FT">Full Time (FT)</option>
                  <option value="FTEX">Full Time Extended (FTEX)</option>
                  <option value="TTP">Top Teacher Program (TTP)</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Department</label>
                <select
                  className="input"
                  value={opsForm.department}
                  onChange={(e) => setOpsForm({ ...opsForm, department: e.target.value as any })}
                >
                  <option value="DOMESTIC">Domestic</option>
                  <option value="OVERSEAS">Overseas / Global</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>Assigned Rest Day</label>
                <select
                  className="input"
                  value={opsForm.assignedRestDay}
                  onChange={(e) => setOpsForm({ ...opsForm, assignedRestDay: e.target.value })}
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>51Talk Portal Username</label>
                <input
                  type="text"
                  className="input"
                  value={opsForm.portalUsername}
                  onChange={(e) => setOpsForm({ ...opsForm, portalUsername: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem' }}>51Talk Portal Password</label>
                <input
                  type="password"
                  className="input"
                  value={opsForm.portalPassword}
                  onChange={(e) => setOpsForm({ ...opsForm, portalPassword: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditingOps(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Launch / Start Date</span>
                <strong>{teacher.launchDate ? new Date(teacher.launchDate).toLocaleDateString() : 'Not Set'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Project Type</span>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  fontWeight: 600
                }}>
                  {teacher.projectType}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Department</span>
                <strong>{teacher.department}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>Assigned Rest Day</span>
                <strong>{teacher.assignedRestDay}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>51Talk Portal Username</span>
                <code>{teacher.portalUsername || 'None'}</code>
              </div>
              <div>
                <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block' }}>51Talk Portal Password</span>
                <code>{teacher.portalPassword ? '••••••••' : 'None'}</code>
              </div>
            </div>
          )}
        </div>

      {/* Card 4: Shift Assignment */}
      <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>🕐 Shift Assignment</h3>
          {teacher.shiftSchedule && (
            <span style={{
              padding: '4px 12px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(0,82,204,0.12), rgba(23,185,120,0.12))',
              border: '1px solid rgba(0,82,204,0.2)', color: '#0052CC',
            }}>
              {teacher.shiftSchedule.startTime} – {teacher.shiftSchedule.endTime} PHT
            </span>
          )}
        </div>

        {/* Current shift display */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Current Assigned Shift</span>
          {teacher.shiftSchedule ? (
            <div>
              <strong style={{ fontSize: '1rem' }}>{teacher.shiftSchedule.name}</strong>
              {teacher.shiftSchedule.description && (
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--foreground-muted)' }}>
                  {teacher.shiftSchedule.description}
                </p>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>No shift assigned</span>
          )}
        </div>

        {/* Shift assign UI */}
        {canUpdate && (
          <div>
            {shiftSuccess && (
              <div style={{
                padding: '8px 14px', borderRadius: 'var(--radius)',
                backgroundColor: 'rgba(23,185,120,0.1)', border: '1px solid rgba(23,185,120,0.3)',
                color: '#17B978', fontSize: '0.88rem', marginBottom: '12px',
              }}>
                ✓ {shiftSuccess}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="input"
                value={shiftId}
                onChange={(e) => { setShiftId(e.target.value); setShiftSuccess(null); }}
                style={{ flex: 1, minWidth: '240px' }}
              >
                <option value="">— No Shift Assigned —</option>
                {allShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime} PHT)
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending || isAssigningShift}
                onClick={handleAssignShift}
                style={{ whiteSpace: 'nowrap', fontSize: '0.88rem' }}
              >
                {isPending && isAssigningShift ? 'Saving…' : 'Assign Shift'}
              </button>
            </div>
            <p style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--foreground-muted)' }}>
              All shift times are in <strong>Manila (PHT, UTC+8)</strong> timezone.
            </p>
          </div>
        )}
      </div>
      </div>

      {/* Rejection Modal */}
      {rejectionModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f87171', marginBottom: '12px' }}>
              Reject Teacher Registration
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)', marginBottom: '16px' }}>
              Please provide a clear reason for rejecting this application (e.g. invalid documentation, duplication, or eligibility requirements).
            </p>
            <form onSubmit={handleReject}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="reason">Rejection Reason *</label>
                <textarea
                  id="reason"
                  className="input"
                  rows={3}
                  required
                  placeholder="State the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRejectionModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !rejectionReason.trim()}
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                >
                  {isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

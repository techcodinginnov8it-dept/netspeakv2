'use client';

import React, { useState } from 'react';
import { updateReferralStatusAction } from '@/actions/referrals';
import type { ReferralStatus, ReferralFeeStatus } from '@prisma/client';

interface ReferralItem {
  id: string;
  realFullName: string;
  displayName: string;
  branch: string | null;
  projectType: string;
  launchDate: Date | null;
  registrationStatus: string;
  referringTeacherName: string | null;
  referredByTeacher?: {
    id: string;
    realFullName: string;
    displayName: string;
    branch: string | null;
  } | null;
  referralStatus: ReferralStatus;
  referralFeeStatus: ReferralFeeStatus;
  referralNotes: string | null;
  createdAt: Date;
}

export default function ReferralMonitoringDesk({
  referrals: initialReferrals,
  canManage = false,
}: {
  referrals: ReferralItem[];
  canManage?: boolean;
}) {
  const [referrals, setReferrals] = useState<ReferralItem[]>(initialReferrals);
  const [filterFee, setFilterFee] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReferralItem | null>(null);
  const [modalFeeStatus, setModalFeeStatus] = useState<ReferralFeeStatus>('PENDING_ELIGIBILITY');
  const [modalRefStatus, setModalRefStatus] = useState<ReferralStatus>('PENDING');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filtered = referrals.filter((item) => {
    if (filterFee !== 'ALL' && item.referralFeeStatus !== filterFee) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchApplicant = item.realFullName.toLowerCase().includes(q) || item.displayName.toLowerCase().includes(q);
      const matchReferrer = (item.referringTeacherName || '').toLowerCase().includes(q) ||
        (item.referredByTeacher?.realFullName || '').toLowerCase().includes(q);
      if (!matchApplicant && !matchReferrer) return false;
    }
    return true;
  });

  const handleOpenModal = (item: ReferralItem) => {
    setSelectedItem(item);
    setModalFeeStatus(item.referralFeeStatus);
    setModalRefStatus(item.referralStatus);
    setModalNotes(item.referralNotes || '');
  };

  const handleSaveModal = async () => {
    if (!selectedItem) return;
    setUpdatingId(selectedItem.id);
    try {
      await updateReferralStatusAction(
        selectedItem.id,
        modalRefStatus,
        modalFeeStatus,
        modalNotes
      );
      setReferrals((prev) =>
        prev.map((r) =>
          r.id === selectedItem.id
            ? {
                ...r,
                referralStatus: modalRefStatus,
                referralFeeStatus: modalFeeStatus,
                referralNotes: modalNotes,
              }
            : r
        )
      );
      setSuccessMsg(`Referral status updated for ${selectedItem.realFullName}`);
      setSelectedItem(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update referral status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getFeeBadge = (status: ReferralFeeStatus) => {
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success" style={{ backgroundColor: 'rgba(15, 118, 110, 0.1)', color: '#0F766E', border: '1px solid rgba(15, 118, 110, 0.35)' }}>💰 Paid</span>;
      case 'APPROVED_FOR_PAYMENT':
        return <span className="badge" style={{ backgroundColor: 'rgba(0, 82, 204, 0.1)', color: 'var(--ns-blue)', border: '1px solid rgba(0, 82, 204, 0.35)' }}>✓ Approved for Payout</span>;
      case 'PENDING_ELIGIBILITY':
        return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.35)' }}>⏳ Pending Eligibility</span>;
      case 'FORFEITED':
        return <span className="badge" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.35)' }}>✕ Forfeited</span>;
      default:
        return <span className="badge badge-secondary">N/A</span>;
    }
  };

  const totalReferred = referrals.length;
  const pendingFees = referrals.filter((r) => r.referralFeeStatus === 'PENDING_ELIGIBILITY').length;
  const approvedFees = referrals.filter((r) => r.referralFeeStatus === 'APPROVED_FOR_PAYMENT').length;
  const paidFees = referrals.filter((r) => r.referralFeeStatus === 'PAID').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--ns-blue)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>Total Referrals</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foreground)' }}>{totalReferred}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #B45309' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>Pending Eligibility</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#B45309' }}>{pendingFees}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--ns-violet)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>Approved for Payout</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ns-violet)' }}>{approvedFees}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0F766E' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>Referral Fees Paid</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F766E' }}>{paidFees}</div>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius)',
          backgroundColor: 'rgba(15, 118, 110, 0.1)',
          border: '1px solid rgba(15, 118, 110, 0.35)',
          color: '#0F766E',
          fontWeight: 600
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="input"
            placeholder="Search by applicant or referring teacher name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 380 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', fontWeight: 500 }}>Fee Status:</span>
          <select
            className="input"
            value={filterFee}
            onChange={(e) => setFilterFee(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_ELIGIBILITY">Pending Eligibility</option>
            <option value="APPROVED_FOR_PAYMENT">Approved for Payout</option>
            <option value="PAID">Paid</option>
            <option value="FORFEITED">Forfeited</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-variant)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '14px 16px' }}>Applicant / Teacher</th>
              <th style={{ padding: '14px 16px' }}>Branch</th>
              <th style={{ padding: '14px 16px' }}>Referring Teacher</th>
              <th style={{ padding: '14px 16px' }}>Application Date</th>
              <th style={{ padding: '14px 16px' }}>Launch / Start Date</th>
              <th style={{ padding: '14px 16px' }}>Referral Status</th>
              <th style={{ padding: '14px 16px' }}>Referral Fee Status</th>
              {canManage && <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} style={{ padding: '36px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                  No teacher referral records matching the filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const referrer = item.referredByTeacher
                  ? item.referredByTeacher.realFullName
                  : item.referringTeacherName || 'Unknown Referrer';

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{item.realFullName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>&quot;{item.displayName}&quot;</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-secondary">{item.branch || 'Atimonan'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ns-blue)' }}>{referrer}</div>
                      {item.referredByTeacher && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                          Verified Profile ({item.referredByTeacher.branch || 'HQ'})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                      {item.launchDate ? new Date(item.launchDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{ backgroundColor: 'var(--surface-variant)', border: '1px solid var(--border)' }}>
                        {item.referralStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{getFeeBadge(item.referralFeeStatus)}</td>
                    {canManage && (
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => handleOpenModal(item)}
                          disabled={updatingId === item.id}
                        >
                          Review Fee
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Review & Update Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: '28px', margin: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
              Referral Review & Fee Authorization
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', marginBottom: '20px' }}>
              Applicant: <strong>{selectedItem.realFullName}</strong> | Referrer: <strong>{selectedItem.referringTeacherName || 'N/A'}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Referral Status</label>
                <select
                  className="input"
                  value={modalRefStatus}
                  onChange={(e) => setModalRefStatus(e.target.value as ReferralStatus)}
                >
                  <option value="PENDING">PENDING (Under Evaluation)</option>
                  <option value="HIRED">HIRED (Passed Screening)</option>
                  <option value="ACTIVE_PROBATIONARY">ACTIVE_PROBATIONARY (Training/First Month)</option>
                  <option value="REGULARIZED">REGULARIZED (Completed Probation)</option>
                  <option value="DISQUALIFIED">DISQUALIFIED</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Referral Fee Status (§XXI)</label>
                <select
                  className="input"
                  value={modalFeeStatus}
                  onChange={(e) => setModalFeeStatus(e.target.value as ReferralFeeStatus)}
                >
                  <option value="PENDING_ELIGIBILITY">PENDING_ELIGIBILITY (Awaiting Start/Quota)</option>
                  <option value="APPROVED_FOR_PAYMENT">APPROVED_FOR_PAYMENT (Eligible for Cut-Off Payout)</option>
                  <option value="PAID">PAID (Disbursed)</option>
                  <option value="FORFEITED">FORFEITED (Late Claim / Disqualified)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Review Notes / Payout Remarks</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Completed 1 month of teaching, approved for cut-off disbursement..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedItem(null)}
                disabled={updatingId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveModal}
                disabled={updatingId !== null}
              >
                {updatingId ? 'Saving...' : 'Save & Authorize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import {
  approvePaymentAndExtend,
  rejectPaymentProof,
  updateSubscriptionConfig,
} from '@/actions/subscriptionActions';
import { useRouter } from 'next/navigation';

interface Props {
  sub: {
    id: string;
    organizationName: string;
    planName: string;
    monthlyFeePhp: number;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    gracePeriodDays: number;
    gracePeriodEnd: string;
    nextBillingDate: string;
    lastPaymentDate: string | null;
    paymentInstructions: string;
  };
  subStatus: {
    isLocked: boolean;
    isGracePeriod: boolean;
    daysRemaining: number;
    graceDaysRemaining: number;
    dueDate: Date | string;
    gracePeriodEnd: Date | string;
    status: string;
    monthlyFeePhp: number;
    organizationName: string;
  };
  payments: Array<{
    id: string;
    paymentMethod: string;
    referenceNumber: string;
    amountPaidPhp: number;
    status: string;
    notes: string | null;
    rejectionReason: string | null;
    periodExtendedMonths: number;
    createdAt: string;
    verifiedAt: string | null;
  }>;
  totalVerifiedRevenue: number;
  pendingApprovalsCount: number;
  adminName: string;
}

export default function SubscriptionDashboardClient({
  sub,
  subStatus,
  payments,
  totalVerifiedRevenue,
  pendingApprovalsCount,
  adminName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter state for payment table
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Subscription Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState(sub.status);
  const [feeInput, setFeeInput] = useState(sub.monthlyFeePhp.toString());
  const [graceDaysInput, setGraceDaysInput] = useState(sub.gracePeriodDays.toString());
  const [dueDateInput, setDueDateInput] = useState(sub.currentPeriodEnd.split('T')[0]);
  const [instructionsInput, setInstructionsInput] = useState(sub.paymentInstructions);

  // Reject Modal State
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Payment reference could not be verified with the bank.');

  const handleApprove = (paymentId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await approvePaymentAndExtend(paymentId, 1);
      if (res.success) {
        setFeedback({ text: 'Payment verified! Subscription extended by 1 month.', type: 'success' });
        router.refresh();
      } else {
        setFeedback({ text: res.error || 'Failed to approve payment.', type: 'error' });
      }
    });
  };

  const handleReject = () => {
    if (!rejectingPaymentId) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await rejectPaymentProof(rejectingPaymentId, rejectReason);
      if (res.success) {
        setFeedback({ text: 'Payment submission marked as REJECTED.', type: 'success' });
        setRejectingPaymentId(null);
        router.refresh();
      } else {
        setFeedback({ text: res.error || 'Failed to reject payment.', type: 'error' });
      }
    });
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData();
    fd.append('status', targetStatus);
    fd.append('monthlyFeePhp', feeInput);
    fd.append('gracePeriodDays', graceDaysInput);
    fd.append('currentPeriodEnd', dueDateInput);
    fd.append('paymentInstructions', instructionsInput);

    startTransition(async () => {
      const res = await updateSubscriptionConfig(fd);
      if (res.success) {
        setFeedback({ text: 'Subscription settings updated successfully!', type: 'success' });
        setShowEditModal(false);
        router.refresh();
      } else {
        setFeedback({ text: res.error || 'Failed to update settings.', type: 'error' });
      }
    });
  };

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        p.referenceNumber.toLowerCase().includes(term) ||
        p.paymentMethod.toLowerCase().includes(term) ||
        (p.notes && p.notes.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner / Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #1a56db 0%, #0ea579 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1.5rem',
            boxShadow: '0 4px 12px rgba(26, 86, 219, 0.25)',
          }}>
            💳
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
              Subscription & Tenant Billing Desk
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Manage monthly licensing, monitor grace periods, and verify client payment settlements.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowEditModal(true)}
            style={{
              padding: '0.6rem 1.15rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ⚙️ Subscription Settings
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '0.875rem',
          background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: feedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
          color: feedback.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {feedback.text}
        </div>
      )}

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        
        {/* Status Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            System Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: sub.status === 'ACTIVE' ? '#10b981' : sub.status === 'GRACE_PERIOD' ? '#f59e0b' : '#ef4444',
            }} />
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: sub.status === 'ACTIVE' ? '#059669' : sub.status === 'GRACE_PERIOD' ? '#d97706' : '#dc2626',
            }}>
              {sub.status}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            {sub.status === 'LOCKED' ? 'Portal locked for non-admins' : `${subStatus.daysRemaining} days until due`}
          </div>
        </div>

        {/* Due Date Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Billing Due Date
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            {new Date(sub.currentPeriodEnd).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Hard lock: {new Date(sub.gracePeriodEnd).toLocaleDateString()}
          </div>
        </div>

        {/* Pending Settlements */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Pending Verification
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: pendingApprovalsCount > 0 ? '#d97706' : '#0f172a', marginTop: '0.5rem' }}>
            {pendingApprovalsCount} Submission(s)
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Requires admin action
          </div>
        </div>

        {/* Total Collected Revenue */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Verified Payouts
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a56db', marginTop: '0.5rem' }}>
            ₱{totalVerifiedRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Across all extended months
          </div>
        </div>

      </div>

      {/* Main Payment Submissions Queue Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
      }}>
        {/* Table Filters & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === st ? '1px solid #1a56db' : '1px solid #e2e8f0',
                  background: statusFilter === st ? '#1a56db' : '#f8fafc',
                  color: statusFilter === st ? '#ffffff' : '#475569',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ width: '280px' }}>
            <input
              type="text"
              placeholder="Search reference or method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Reference No.</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Channel</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Amount Paid</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Submitted Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Notes / Reason</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    No payment submissions match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      {p.referenceNumber}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#334155' }}>
                      {p.paymentMethod}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#1a56db' }}>
                      ₱{p.amountPaidPhp.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#64748b' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: p.status === 'VERIFIED' ? '#ecfdf5' : p.status === 'REJECTED' ? '#fef2f2' : '#fffbeb',
                        color: p.status === 'VERIFIED' ? '#065f46' : p.status === 'REJECTED' ? '#991b1b' : '#92400e',
                        border: p.status === 'VERIFIED' ? '1px solid #a7f3d0' : p.status === 'REJECTED' ? '1px solid #fecaca' : '1px solid #fde68a',
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontSize: '0.8rem', maxWidth: '240px' }}>
                      {p.rejectionReason ? (
                        <span style={{ color: '#dc2626' }}>Reason: {p.rejectionReason}</span>
                      ) : p.notes ? (
                        p.notes
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      {p.status === 'PENDING' ? (
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={isPending}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              background: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                            }}
                          >
                            Verify & Extend
                          </button>
                          <button
                            onClick={() => setRejectingPaymentId(p.id)}
                            disabled={isPending}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingPaymentId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>
              Reject Payment Proof
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Specify the reason why this payment submission cannot be verified.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRejectingPaymentId(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isPending}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings / Manual Override Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>
              Subscription Configuration & Override
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Manually adjust status, pricing, and deadlines for testing or custom invoicing.
            </p>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Subscription Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="ACTIVE">ACTIVE (Normal Operations)</option>
                  <option value="GRACE_PERIOD">GRACE_PERIOD (Warning Banner)</option>
                  <option value="LOCKED">LOCKED (Full Operational Lock)</option>
                  <option value="SUSPENDED">SUSPENDED (Account Suspended)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Monthly Fee (PHP)
                  </label>
                  <input
                    type="number"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Grace Period Days
                  </label>
                  <input
                    type="number"
                    value={graceDaysInput}
                    onChange={(e) => setGraceDaysInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Billing Cycle Due Date
                </label>
                <input
                  type="date"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Payment Instructions Text
                </label>
                <textarea
                  value={instructionsInput}
                  onChange={(e) => setInstructionsInput(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1a56db',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

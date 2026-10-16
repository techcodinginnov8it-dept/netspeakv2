'use client';

import React, { useState, useTransition } from 'react';
import { submitPaymentProof, approvePaymentAndExtend } from '@/actions/subscriptionActions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
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
  instructions: string;
  recentPayments: Array<{
    id: string;
    paymentMethod: string;
    referenceNumber: string;
    amountPaidPhp: number;
    status: string;
    createdAt: string;
  }>;
  isSuperAdmin: boolean;
  userName: string;
}

export default function SubscriptionLockClient({
  subStatus,
  instructions,
  recentPayments,
  isSuperAdmin,
  userName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState(subStatus.monthlyFeePhp.toString());
  const [notes, setNotes] = useState('');

  const dueDateFormatted = new Date(subStatus.dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const graceDateFormatted = new Date(subStatus.gracePeriodEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData();
    formData.append('paymentMethod', paymentMethod);
    formData.append('referenceNumber', referenceNumber);
    formData.append('amountPaid', amountPaid);
    formData.append('notes', notes);

    startTransition(async () => {
      const res = await submitPaymentProof(formData);
      if (res.success) {
        setMessage({
          text: 'Payment proof submitted successfully! Verification is in progress.',
          type: 'success',
        });
        setReferenceNumber('');
        setNotes('');
        router.refresh();
      } else {
        setMessage({ text: res.error || 'Failed to submit payment proof.', type: 'error' });
      }
    });
  };

  const handleApprove = (paymentId: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await approvePaymentAndExtend(paymentId, 1);
      if (res.success) {
        setMessage({ text: 'Payment verified! System renewed and unlocked for 1 month.', type: 'success' });
        router.refresh();
      } else {
        setMessage({ text: res.error || 'Approval failed.', type: 'error' });
      }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(at 10% 15%, hsla(228, 85%, 96%, 1) 0, transparent 55%), radial-gradient(at 90% 85%, hsla(155, 75%, 95%, 1) 0, transparent 55%), #f1f5fb',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column',
      color: '#1e293b',
    }}>
      {/* Top Brand Navigation Bar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.875rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1a56db 0%, #0ea579 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.125rem',
            boxShadow: '0 4px 10px rgba(26, 86, 219, 0.25)',
          }}>
            N
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
              Netspeak Portal
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Billing & Subscription Desk • {subStatus.organizationName}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>
            <span style={{ color: '#94a3b8' }}>Logged in:</span> <strong>{userName}</strong>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        maxWidth: '1100px',
        width: '100%',
        margin: '2rem auto',
        padding: '0 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}>

        {/* Hero Notice Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2rem 2.25rem',
          border: subStatus.isLocked ? '1px solid #fecaca' : '1px solid #fde68a',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: subStatus.isLocked
              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
              : 'linear-gradient(90deg, #f59e0b, #d97706)',
          }} />

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: subStatus.isLocked ? '#fef2f2' : '#fffbeb',
            border: subStatus.isLocked ? '1px solid #fee2e2' : '1px solid #fef3c7',
            color: subStatus.isLocked ? '#dc2626' : '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            flexShrink: 0,
          }}>
            {subStatus.isLocked ? '🔒' : '⚠️'}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: subStatus.isLocked ? '#fee2e2' : '#fef3c7',
                color: subStatus.isLocked ? '#991b1b' : '#92400e',
              }}>
                {subStatus.isLocked ? 'System Locked' : 'Grace Period Notice'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>• Monthly Tenant License</span>
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 0.4rem 0',
              fontFamily: 'var(--font-heading)',
            }}>
              {subStatus.isLocked ? 'Portal Subscription Past Due' : 'Monthly Payment Renewal Due'}
            </h1>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.925rem', lineHeight: 1.5 }}>
              {subStatus.isLocked
                ? `Portal access is temporarily locked for ${subStatus.organizationName}. Regular teachers and staff cannot access operational desks until the monthly settlement has been verified.`
                : `Your monthly subscription cycle ended on ${dueDateFormatted}. You have ${subStatus.graceDaysRemaining} day(s) of grace period left before automatic system lockout on ${graceDateFormatted}.`}
            </p>
          </div>
        </div>

        {/* 2-Column Split: Settlement Details vs Payment Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>

          {/* LEFT: Billing Summary & Payment Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Amount & Period Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1.25rem 0', color: '#0f172a' }}>
                Subscription Summary
              </h2>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Plan Tier</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Enterprise Monthly</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Billing Cycle End</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>{dueDateFormatted}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Lockout Deadline</span>
                <span style={{ fontWeight: 600, color: '#b91c1c' }}>{graceDateFormatted}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Total Settlement Due</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>VAT Inclusive (Monthly)</div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a56db', fontFamily: 'var(--font-heading)' }}>
                  ₱{subStatus.monthlyFeePhp.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Official Settlement Channels Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
                Authorized Settlement Accounts
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#0a2970',
                    color: '#ffffff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                  }}>
                    BDO
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>BDO Unibank Inc.</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Acc: <strong>0012-3456-7890</strong> (Netspeak Learning Inc.)</div>
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#005CE6',
                    color: '#ffffff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                  }}>
                    GCash
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>GCash / Maya Corporate</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>Number: <strong>0917-123-4567</strong> (Billing Operations)</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: Submit Proof Form & Verification */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#0f172a' }}>
              Submit Payment Reference
            </h2>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.85rem' }}>
              Enter your bank or e-wallet transaction number to confirm payment and unlock your tenant account.
            </p>

            {message && (
              <div style={{
                padding: '0.875rem 1rem',
                borderRadius: '10px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                border: message.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
              }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Settlement Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                >
                  <option value="GCash">GCash Transfer</option>
                  <option value="Bank Transfer (BDO)">Bank Transfer (BDO)</option>
                  <option value="Bank Transfer (BPI)">Bank Transfer (BPI)</option>
                  <option value="Maya">Maya Wallet</option>
                  <option value="Corporate Check">Corporate Check / Direct Deposit</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Amount Settled (PHP)
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Transaction Reference / Trace Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 902341857312 or BDO-TXN-8821"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Billing Remarks (Optional)
                </label>
                <textarea
                  placeholder="Sender name, payment branch, or official receipt notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.875rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1a56db 0%, #0ea579 100%)',
                  color: '#ffffff',
                  fontSize: '0.925rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(26, 86, 219, 0.25)',
                  transition: 'transform 0.1s ease',
                }}
              >
                {isPending ? 'Verifying Reference...' : 'Submit Payment Proof'}
              </button>
            </form>
          </div>

        </div>

        {/* BOTTOM: Recent Submissions Audit Table */}
        {recentPayments.length > 0 && (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Payment Verification Records
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Showing last {recentPayments.length} submission(s)
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Reference</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Method</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Submission Date</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Verification Status</th>
                    {isSuperAdmin && <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Admin Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        {p.referenceNumber}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#334155' }}>
                        {p.paymentMethod}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1a56db' }}>
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
                      {isSuperAdmin && (
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          {p.status === 'PENDING' ? (
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={isPending}
                              style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '8px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                              }}
                            >
                              Verify & Unlock (+1 Mo)
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Processed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        fontSize: '0.75rem',
        color: '#94a3b8',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
      }}>
        NETSPEAK PORTAL v2.0 • Secured Tenant Billing Infrastructure by Innov8IT
      </footer>
    </div>
  );
}

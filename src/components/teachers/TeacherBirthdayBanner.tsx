'use client';

import React, { useState } from 'react';
import { grantTeacherIncentiveAction, TodayBirthdayTeacher } from '@/actions/incentives';
import type { IncentiveType } from '@prisma/client';

export default function TeacherBirthdayBanner({
  teachers,
  canGrantIncentive = false,
}: {
  teachers: TodayBirthdayTeacher[];
  canGrantIncentive?: boolean;
}) {
  const [selectedTeacher, setSelectedTeacher] = useState<TodayBirthdayTeacher | null>(null);
  const [incentiveType, setIncentiveType] = useState<IncentiveType>('BIRTHDAY_CASH_VOUCHER');
  const [amount, setAmount] = useState<number>(500);
  const [remarks, setRemarks] = useState<string>('Happy Birthday from the Netspeak Management Team!');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awardedList, setAwardedList] = useState<string[]>([]);

  if (!teachers || teachers.length === 0) {
    return null;
  }

  const handleGrant = async () => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    try {
      await grantTeacherIncentiveAction(selectedTeacher.id, incentiveType, amount, remarks);
      setAwardedList((prev) => [...prev, selectedTeacher.id]);
      alert(`Incentive successfully awarded to ${selectedTeacher.displayName}! 🎉`);
      setSelectedTeacher(null);
    } catch (err: any) {
      alert(err.message || 'Failed to grant incentive');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, rgba(244, 196, 48, 0.15) 0%, rgba(255, 235, 153, 0.25) 100%)',
        border: '1px solid rgba(244, 196, 48, 0.5)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 10px rgba(244, 196, 48, 0.1)',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            fontSize: '1.8rem',
            background: 'rgba(244, 196, 48, 0.25)',
            width: 46,
            height: 46,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            🎂
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#854D0E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Happy Birthday! Today&apos;s Celebrants:</span>
              <span className="badge" style={{ backgroundColor: '#F4C430', color: '#000', fontWeight: 700 }}>
                {teachers.length} Teacher{teachers.length > 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#713F12', marginTop: '2px' }}>
              {teachers.map((t, idx) => (
                <span key={t.id}>
                  <strong>{t.realFullName}</strong> (&quot;{t.displayName}&quot; — {t.branch || 'Atimonan'})
                  {idx < teachers.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {canGrantIncentive && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {teachers.map((t) => {
              const alreadyAwarded = awardedList.includes(t.id) || t.incentives.length > 0;
              return (
                <button
                  key={t.id}
                  className="btn"
                  style={{
                    backgroundColor: alreadyAwarded ? 'rgba(15, 118, 110, 0.15)' : '#F4C430',
                    color: alreadyAwarded ? '#0F766E' : '#000',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    border: alreadyAwarded ? '1px solid rgba(15, 118, 110, 0.4)' : 'none',
                    padding: '8px 14px',
                  }}
                  onClick={() => setSelectedTeacher(t)}
                  disabled={alreadyAwarded}
                >
                  {alreadyAwarded ? `✓ Incentive Granted (${t.displayName})` : `🎁 Grant Incentive (${t.displayName})`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grant Incentive Dialog */}
      {selectedTeacher && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: '28px', margin: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
              🎁 Assign Birthday Incentive
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', marginBottom: '20px' }}>
              Assigning reward for <strong>{selectedTeacher.realFullName}</strong> (&quot;{selectedTeacher.displayName}&quot;)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Incentive Type</label>
                <select
                  className="input"
                  value={incentiveType}
                  onChange={(e) => setIncentiveType(e.target.value as IncentiveType)}
                >
                  <option value="BIRTHDAY_CASH_VOUCHER">Cash Voucher (₱500 default)</option>
                  <option value="BIRTHDAY_IN_KIND_TOKEN">In-Kind Token / Company Gift</option>
                  <option value="PERFORMANCE_AWARD">Special Birthday Recognition Award</option>
                </select>
              </div>

              {incentiveType === 'BIRTHDAY_CASH_VOUCHER' && (
                <div className="form-group">
                  <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Amount (PHP)</label>
                  <input
                    type="number"
                    className="input"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={100}
                    step={50}
                  />
                </div>
              )}

              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Greeting / Certificate Remarks</label>
                <textarea
                  className="input"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedTeacher(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGrant}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Granting...' : 'Grant & Record Incentive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

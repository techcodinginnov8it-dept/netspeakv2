'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type TeacherItem = {
  id: string;
  displayName: string;
  realFullName: string;
  cellphone: string;
  branch: string | null;
  department: string;
  projectType: string;
  assignedRestDay: string;
  registrationStatus: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  launchDate: Date | null;
  user: {
    username: string;
    isActive: boolean;
  } | null;
  shiftSchedule?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
};

export default function TeacherDirectoryTable({
  teachers,
}: {
  teachers: TeacherItem[];
}) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const FILTER_LABELS: Record<string, string> = {
    ALL:         'All Applicants',
    PENDING:     'Pending Review',
    UNDER_REVIEW: 'Under Review',
    APPROVED:    'Approved',
    REJECTED:    'Rejected',
  };

  const filteredTeachers = teachers.filter((t) => {
    if (filterStatus !== 'ALL' && t.registrationStatus !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.displayName.toLowerCase().includes(q) ||
        t.realFullName.toLowerCase().includes(q) ||
        t.cellphone.includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            color: '#0F766E',
            border: '1px solid rgba(13, 148, 136, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            Approved
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(0, 82, 204, 0.1)',
            color: '#0052CC',
            border: '1px solid rgba(0, 82, 204, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#DC2626',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            Rejected
          </span>
        );
      default:
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            color: '#B45309',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            Pending Review
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map((st) => {
            const isActive = filterStatus === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                  ...(isActive ? { color: '#FFFFFF' } : {}),
                }}
              >
                {FILTER_LABELS[st] ?? st}
              </button>
            );
          })}
        </div>

        <div style={{ width: 260 }}>
          <input
            type="text"
            className="input"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '12px 16px' }}>Teacher / Display Name</th>
              <th style={{ padding: '12px 16px' }}>Real Complete Name</th>
              <th style={{ padding: '12px 16px' }}>Branch</th>
              <th style={{ padding: '12px 16px' }}>Shift (PHT)</th>
              <th style={{ padding: '12px 16px' }}>Contact</th>
              <th style={{ padding: '12px 16px' }}>Dept & Type</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                  No teachers found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredTeachers.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    <Link href={`/dashboard/teachers/${t.id}`} style={{ color: 'var(--primary)' }}>
                      {t.displayName}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{t.realFullName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 82, 204, 0.1)',
                      color: 'var(--ns-blue)',
                      border: '1px solid rgba(0, 82, 204, 0.25)',
                    }}>
                      📍 {t.branch || 'Atimonan'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {t.shiftSchedule ? (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#059669',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        whiteSpace: 'nowrap',
                      }}>
                        🕐 {t.shiftSchedule.name.split(' (')[0]} ({t.shiftSchedule.startTime}–{t.shiftSchedule.endTime})
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontStyle: 'italic' }}>
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--foreground-muted)' }}>{t.cellphone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginRight: '6px' }}>
                      {t.projectType}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                      {t.department}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(t.registrationStatus)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/dashboard/teachers/${t.id}`}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      {t.registrationStatus === 'PENDING' ? 'Review Application →' : 'View Profile'}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

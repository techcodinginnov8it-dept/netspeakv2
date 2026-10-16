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

  const FILTER_CONFIG: Array<{ id: string; label: string }> = [
    { id: 'ALL',          label: 'All Applicants' },
    { id: 'PENDING',      label: 'Pending' },
    { id: 'UNDER_REVIEW', label: 'Under Review' },
    { id: 'APPROVED',     label: 'Approved' },
    { id: 'REJECTED',     label: 'Rejected' },
  ];

  const normalizeStatus = (status?: string | null): string => {
    if (!status) return 'PENDING';
    const s = status.trim().toUpperCase();
    if (s === 'PENDING' || s === 'PENDING REVIEW' || s === 'PENDING_REVIEW') return 'PENDING';
    if (s === 'UNDER_REVIEW' || s === 'UNDER REVIEW') return 'UNDER_REVIEW';
    if (s === 'APPROVED' || s === 'ACTIVE') return 'APPROVED';
    if (s === 'REJECTED') return 'REJECTED';
    return s;
  };

  const matchesStatus = (t: TeacherItem, statusFilter: string): boolean => {
    if (statusFilter === 'ALL') return true;
    return normalizeStatus(t.registrationStatus) === statusFilter;
  };

  const matchesSearch = (t: TeacherItem, query: string): boolean => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return Boolean(
      (t.displayName && t.displayName.toLowerCase().includes(q)) ||
      (t.realFullName && t.realFullName.toLowerCase().includes(q)) ||
      (t.cellphone && t.cellphone.toLowerCase().includes(q)) ||
      (t.branch && t.branch.toLowerCase().includes(q)) ||
      (t.department && t.department.toLowerCase().includes(q)) ||
      (t.projectType && t.projectType.toLowerCase().includes(q)) ||
      (t.user?.username && t.user.username.toLowerCase().includes(q))
    );
  };

  // Live counts for status buttons
  const counts = {
    ALL: teachers.filter(t => matchesSearch(t, searchQuery)).length,
    PENDING: teachers.filter(t => matchesStatus(t, 'PENDING') && matchesSearch(t, searchQuery)).length,
    UNDER_REVIEW: teachers.filter(t => matchesStatus(t, 'UNDER_REVIEW') && matchesSearch(t, searchQuery)).length,
    APPROVED: teachers.filter(t => matchesStatus(t, 'APPROVED') && matchesSearch(t, searchQuery)).length,
    REJECTED: teachers.filter(t => matchesStatus(t, 'REJECTED') && matchesSearch(t, searchQuery)).length,
  };

  const filteredTeachers = teachers.filter((t) => {
    return matchesStatus(t, filterStatus) && matchesSearch(t, searchQuery);
  });

  const getStatusBadge = (status: string) => {
    const s = normalizeStatus(status);
    switch (s) {
      case 'APPROVED':
        return (
          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            ✓ Approved
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            🔍 Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            ✕ Rejected
          </span>
        );
      default:
        return (
          <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            ⏳ Pending
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTER_CONFIG.map(({ id: st, label }) => {
            const isActive = filterStatus === st;
            const count = counts[st as keyof typeof counts] ?? 0;
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  ...(isActive ? { color: '#FFFFFF' } : {}),
                }}
              >
                <span>{label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                    color: isActive ? '#FFFFFF' : 'var(--foreground-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <input
            type="text"
            className="input"
            placeholder="Search by name, phone, branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 30px 6px 12px', fontSize: '0.85rem', width: '100%' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--foreground-muted)',
                fontSize: '0.85rem',
                padding: '2px',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Teacher / Display Name</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Real Complete Name</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Branch</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Contact</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Dept & Type</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                  No teachers found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredTeachers.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, verticalAlign: 'middle' }}>
                    <Link href={`/dashboard/teachers/${t.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                      {t.displayName}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{t.realFullName}</td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 9px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 82, 204, 0.08)',
                      color: 'var(--ns-blue)',
                      border: '1px solid rgba(0, 82, 204, 0.2)',
                    }}>
                      📍 {t.branch || 'Atimonan'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--foreground-muted)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {t.cellphone}
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginRight: '6px', fontWeight: 600 }}>
                      {t.projectType}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                      {t.department}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {getStatusBadge(t.registrationStatus)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <Link
                      href={`/dashboard/teachers/${t.id}`}
                      className="btn btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
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

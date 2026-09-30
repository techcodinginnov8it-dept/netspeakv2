'use client';

import React, { useState } from 'react';

export interface LessonFeeEntry {
  portalUsername: string;
  teacherName?: string;
  completedLessons: number;
  unattendedLessons: number;
  studentNoShow: number;
  totalLessonFeePhp: number;
  bonusFeePhp: number;
}

interface MatchResult extends LessonFeeEntry {
  matchedTeacherName?: string;
  matchedRealName?: string;
  isMatched: boolean;
}

interface Props {
  knownTeachers: {
    portalUsername: string;
    teacherName: string;
    realFullName: string;
  }[];
}

export default function LessonFeeSyncDesk({ knownTeachers }: Props) {
  const [entries, setEntries] = useState<MatchResult[]>([]);
  const [rawText, setRawText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');

  // Parse CSV / TSV text
  const parseData = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    // Detect header
    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('username') ||
      firstLineLower.includes('teacher') ||
      firstLineLower.includes('lesson') ||
      firstLineLower.includes('fee')
    ) {
      startIndex = 1;
    }

    const parsed: MatchResult[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Delimiter: comma or tab
      const parts = line.includes('\t')
        ? line.split('\t').map((p) => p.trim())
        : line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));

      if (parts.length >= 2) {
        const portalUsername = parts[0];
        const completedLessons = Number(parts[1]) || 0;
        const unattendedLessons = Number(parts[2]) || 0;
        const studentNoShow = Number(parts[3]) || 0;
        const totalLessonFeePhp = Number(parts[4]) || completedLessons * 55; // Default standard rate if unstated
        const bonusFeePhp = Number(parts[5]) || 0;

        // Attempt lookup in known teachers
        const matched = knownTeachers.find(
          (t) =>
            t.portalUsername.toLowerCase() === portalUsername.toLowerCase() ||
            t.teacherName.toLowerCase() === portalUsername.toLowerCase()
        );

        parsed.push({
          portalUsername,
          teacherName: matched?.teacherName,
          completedLessons,
          unattendedLessons,
          studentNoShow,
          totalLessonFeePhp,
          bonusFeePhp,
          matchedTeacherName: matched?.teacherName,
          matchedRealName: matched?.realFullName,
          isMatched: !!matched,
        });
      }
    }

    setEntries(parsed);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setRawText(content);
        parseData(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const filteredEntries = entries.filter((item) => {
    if (filter === 'MATCHED') return item.isMatched;
    if (filter === 'UNMATCHED') return !item.isMatched;
    return true;
  });

  const totalLessons = entries.reduce((acc, curr) => acc + curr.completedLessons, 0);
  const totalPayout = entries.reduce((acc, curr) => acc + curr.totalLessonFeePhp + curr.bonusFeePhp, 0);
  const matchedCount = entries.filter((e) => e.isMatched).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Upload & Instructions Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
              Lesson Fee Cut-Off Sync Desk (§5, Phase 4.2)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Reconcile platform lesson audit logs and external teaching portal payouts with teacher roster records.
            </p>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'var(--bg-surface)', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
            Expected Columns: <code>Portal Username, Completed, Unattended, No-Show, Payout (₱), Bonus (₱)</code>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          style={{
            marginTop: '1.25rem',
            border: `2px dashed ${dragActive ? 'var(--ns-blue)' : 'var(--border-color)'}`,
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            background: dragActive ? 'rgba(0, 82, 204, 0.04)' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onClick={() => {
            const input = document.getElementById('lesson-fee-csv-input') as HTMLInputElement;
            input?.click();
          }}
        >
          <input
            id="lesson-fee-csv-input"
            type="file"
            accept=".csv, .txt, .tsv"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem', fontSize: '0.95rem' }}>
            Drag and drop your Lesson Fee CSV here, or click to browse
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
            Supports standard CSV and TSV exported from external ESL booking systems
          </p>
        </div>

        {/* Or Paste Raw Text */}
        <div style={{ marginTop: '1rem' }}>
          <details style={{ fontSize: '0.85rem' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--ns-blue)', fontWeight: 600 }}>
              Or paste raw CSV text directly...
            </summary>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="teacher01, 140, 2, 0, 7700, 500&#10;teacher02, 95, 0, 1, 5225, 0"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                }}
              />
              <button
                type="button"
                onClick={() => parseData(rawText)}
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.4rem 1rem',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Parse CSV Text
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* KPI Overview (If data loaded) */}
      {entries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Reconciled Records
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {entries.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ns-green)', marginTop: '0.25rem' }}>
              {matchedCount} matched ({Math.round((matchedCount / entries.length) * 100)}%)
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Completed Lessons
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
              {totalLessons.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Billed units</div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Lesson Payout
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ns-green)', marginTop: '0.25rem' }}>
              ₱{totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Base + performance bonuses</div>
          </div>
        </div>
      )}

      {/* Reconciled Table */}
      {entries.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setFilter('ALL')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: filter === 'ALL' ? 'var(--accent)' : 'var(--bg-surface)',
                  color: filter === 'ALL' ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                All ({entries.length})
              </button>
              <button
                onClick={() => setFilter('MATCHED')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: filter === 'MATCHED' ? 'var(--ns-green)' : 'var(--bg-surface)',
                  color: filter === 'MATCHED' ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Matched ({matchedCount})
              </button>
              <button
                onClick={() => setFilter('UNMATCHED')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: filter === 'UNMATCHED' ? '#EF4444' : 'var(--bg-surface)',
                  color: filter === 'UNMATCHED' ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Unmatched ({entries.length - matchedCount})
              </button>
            </div>

            <button
              onClick={() => {
                const headers = ['Portal Username', 'System Teacher Name', 'Real Name', 'Status', 'Completed', 'Unattended', 'No-Show', 'Fee (Php)', 'Bonus (Php)', 'Total (Php)'];
                const rows = filteredEntries.map((e) => [
                  `"${e.portalUsername}"`,
                  `"${e.matchedTeacherName || ''}"`,
                  `"${e.matchedRealName || ''}"`,
                  `"${e.isMatched ? 'MATCHED' : 'UNMATCHED'}"`,
                  e.completedLessons,
                  e.unattendedLessons,
                  e.studentNoShow,
                  e.totalLessonFeePhp,
                  e.bonusFeePhp,
                  e.totalLessonFeePhp + e.bonusFeePhp,
                ]);
                const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                const link = document.createElement('a');
                link.setAttribute('href', encodeURI(csv));
                link.setAttribute('download', `Reconciled_Lesson_Fees_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              📥 Export Reconciled CSV
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Portal Username</th>
                  <th style={{ padding: '0.75rem' }}>System Match</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Completed</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Unattended</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>No Show</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Lesson Fee</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Bonus</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Payout</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--bg-surface)',
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {row.portalUsername}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {row.isMatched ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ns-green-dark)' }}>
                            ✓ {row.matchedTeacherName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {row.matchedRealName}
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#DC2626',
                            fontWeight: 600,
                          }}
                        >
                          Unmatched
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                      {row.completedLessons}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: row.unattendedLessons > 0 ? '#DC2626' : 'var(--text-dim)' }}>
                      {row.unattendedLessons}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                      {row.studentNoShow}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      ₱{row.totalLessonFeePhp.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: row.bonusFeePhp > 0 ? 'var(--ns-green)' : 'var(--text-dim)' }}>
                      ₱{row.bonusFeePhp.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₱{(row.totalLessonFeePhp + row.bonusFeePhp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

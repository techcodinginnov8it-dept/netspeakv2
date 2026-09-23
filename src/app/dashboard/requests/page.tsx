import React from 'react';
import { requireAuth, hasPermission, hasRole, PERMISSIONS, ROLES } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import SRDRequestForm from '@/components/requests/SRDRequestForm';
import ETORequestForm from '@/components/requests/ETORequestForm';
import RequestsApprovalQueue from '@/components/requests/RequestsApprovalQueue';

export const metadata = {
  title: 'Self-Service Requests | Netspeak Portal',
};

export default async function RequestsPage() {
  const user = await requireAuth();

  const canSubmit = hasPermission(user, PERMISSIONS.REQUESTS_SUBMIT);
  const canApprove = hasPermission(user, PERMISSIONS.REQUESTS_APPROVE);

  // For submitting teachers: load their own request history
  let mySRDRequests: any[] = [];
  let myETORequests: any[] = [];
  let teacherProfile: any = null;

  if (canSubmit) {
    teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
    });

    if (teacherProfile) {
      [mySRDRequests, myETORequests] = await Promise.all([
        prisma.switchRestDayRequest.findMany({
          where: { teacherId: teacherProfile.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.earlyTimeOffRequest.findMany({
          where: { teacherId: teacherProfile.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);
    }
  }

  // For managers: load all pending/recent requests
  let allSRDRequests: any[] = [];
  let allETORequests: any[] = [];

  if (canApprove) {
    [allSRDRequests, allETORequests] = await Promise.all([
      prisma.switchRestDayRequest.findMany({
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          teacher: {
            select: { displayName: true, realFullName: true },
          },
        },
        take: 100,
      }),
      prisma.earlyTimeOffRequest.findMany({
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          teacher: {
            select: { displayName: true, realFullName: true },
          },
        },
        take: 100,
      }),
    ]);
  }

  // Summary stats
  const pendingSRD = allSRDRequests.filter((r) => r.status === 'PENDING').length;
  const pendingETO = allETORequests.filter((r) => r.status === 'PENDING').length;

  const sectionHeader = (title: string, subtitle?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{subtitle}</p>
      )}
    </div>
  );

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '1.5rem',
  };

  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function statusBadgeInline(status: string) {
    const map: Record<string, { color: string; label: string }> = {
      PENDING: { color: '#fcd34d', label: 'Pending' },
      APPROVED: { color: '#34d399', label: 'Approved' },
      AUTO_APPROVED: { color: '#34d399', label: 'Auto-Approved' },
      REJECTED: { color: '#f87171', label: 'Rejected' },
    };
    const s = map[status] || { color: 'var(--text-dim)', label: status };
    return (
      <span style={{ color: s.color, fontWeight: 600, fontSize: '0.8rem' }}>{s.label}</span>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          Self-Service Requests
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          Submit schedule change requests or review pending approvals.
        </p>
      </div>

      {/* Manager: KPI summary */}
      {canApprove && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ ...cardStyle, borderLeft: '4px solid #fcd34d' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending SRD
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '4px', color: '#fcd34d' }}>
              {pendingSRD}
            </div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending ETO
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '4px', color: 'var(--color-primary)' }}>
              {pendingETO}
            </div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '4px solid #34d399' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total SRD Requests
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '4px', color: '#34d399' }}>
              {allSRDRequests.length}
            </div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '4px solid #a78bfa' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total ETO Requests
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '4px', color: '#a78bfa' }}>
              {allETORequests.length}
            </div>
          </div>
        </div>
      )}

      {/* Manager: Approval Queue */}
      {canApprove && (
        <div style={cardStyle}>
          {sectionHeader(
            '🗂 Approval Queue',
            'Review and act on pending Switch Rest Day and Early Time-Off requests from the team.'
          )}
          <RequestsApprovalQueue srdRequests={allSRDRequests} etoRequests={allETORequests} />
        </div>
      )}

      {/* Teacher: Submit Forms */}
      {canSubmit && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
          {/* SRD Form */}
          <div style={cardStyle}>
            {sectionHeader(
              '🔄 Switch Rest Day (SRD)',
              'Request to swap your scheduled rest day with a specific work date.'
            )}
            <SRDRequestForm />
          </div>

          {/* ETO Form */}
          <div style={cardStyle}>
            {sectionHeader(
              '🚪 Early Time-Off (ETO)',
              'Request permission to leave before your shift ends. Subject to 30-minute auto-approval window.'
            )}
            <ETORequestForm />
          </div>
        </div>
      )}

      {/* Teacher: Own request history */}
      {canSubmit && teacherProfile && (
        <div style={cardStyle}>
          {sectionHeader(
            '📋 My Request History',
            'Your submitted SRD and ETO requests and their current status.'
          )}

          {/* SRD History */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Switch Rest Day Requests
            </div>
            {mySRDRequests.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem', padding: '1rem 0' }}>
                No SRD requests submitted yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {['Date Not Working', 'Will Work On', 'Rest Day', 'Reason', 'Submitted', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mySRDRequests.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>{fmtDate(r.dateNotWorking)}</td>
                        <td style={{ padding: '10px 12px' }}>{fmtDate(r.switchedWorkDate)}</td>
                        <td style={{ padding: '10px 12px' }}>{r.originalRestDay}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '160px' }}>
                          {r.reason.length > 50 ? r.reason.slice(0, 50) + '…' : r.reason}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ padding: '10px 12px' }}>{statusBadgeInline(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ETO History */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Early Time-Off Requests
            </div>
            {myETORequests.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem', padding: '1rem 0' }}>
                No ETO requests submitted yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {['Shift Date', 'Leave At', 'Reason', 'Submitted', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myETORequests.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>{fmtDate(r.shiftDate)}</td>
                        <td style={{ padding: '10px 12px' }}>{new Date(r.timeOffStart).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '160px' }}>
                          {r.reason.length > 50 ? r.reason.slice(0, 50) + '…' : r.reason}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ padding: '10px 12px' }}>{statusBadgeInline(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No access */}
      {!canSubmit && !canApprove && (
        <div
          style={{
            ...cardStyle,
            textAlign: 'center',
            padding: '3rem',
            color: 'var(--text-dim)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem' }}>Access Restricted</div>
          <div style={{ fontSize: '0.875rem' }}>You do not have permission to submit or review requests.</div>
        </div>
      )}
    </div>
  );
}

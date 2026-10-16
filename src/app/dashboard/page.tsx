import { Suspense } from 'react';
import { requireAuth, hasPermission, hasRole, PERMISSIONS, ROLES } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import TeacherAttendanceWidget from '@/components/attendance/TeacherAttendanceWidget';
import DashboardAnalyticsCharts, { DashboardChartsData } from '@/components/dashboard/DashboardAnalyticsCharts';
import TeacherDirectoryTable from '@/components/teachers/TeacherDirectoryTable';
import TeacherBirthdayBanner from '@/components/teachers/TeacherBirthdayBanner';
import { getTodayBirthdaysAction } from '@/actions/incentives';
import Link from 'next/link';

export const metadata = {
  title: 'Dashboard — Netspeak Portal',
};

function normalizeDate(d = new Date()) {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/* ----------------------------------------------------------------
   Stat card sub-component
   ---------------------------------------------------------------- */
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  href,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent: 'blue' | 'green' | 'gold' | 'violet' | 'red' | 'teal';
  href?: string;
}) {
  const accents = {
    blue:   { border: 'var(--ns-blue)',   bg: 'rgba(0,82,204,0.08)',    text: 'var(--ns-blue)' },
    green:  { border: 'var(--ns-green)',  bg: 'rgba(23,185,120,0.08)',  text: 'var(--ns-green)' },
    gold:   { border: 'var(--ns-gold)',   bg: 'rgba(244,196,48,0.10)',  text: 'var(--ns-gold-dark)' },
    violet: { border: 'var(--ns-violet)', bg: 'rgba(154,138,239,0.08)', text: 'var(--ns-violet-dark)' },
    red:    { border: '#ef4444',          bg: 'rgba(239,68,68,0.08)',   text: '#dc2626' },
    teal:   { border: '#0d9488',          bg: 'rgba(13,148,136,0.08)',  text: '#0f766e' },
  };
  const a = accents[accent];

  const inner = (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.2rem 1.35rem',
      border: `1px solid var(--border-light)`,
      borderLeft: `3px solid ${a.border}`,
      boxShadow: '0 2px 12px rgba(15, 33, 88, 0.06), 0 1px 3px rgba(15, 33, 88, 0.04)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'box-shadow 0.18s ease, transform 0.18s ease',
      cursor: href ? 'pointer' : 'default',
      textDecoration: 'none',
      height: '100%',
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: 'var(--radius-sm)',
        background: a.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        flexShrink: 0,
        border: `1px solid ${a.border}22`,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-heading)',
          marginBottom: '0.2rem',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-heading)',
          lineHeight: 1.1,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  }
  return inner;
}

/* ----------------------------------------------------------------
   Skeleton fallback for stats section (used in Suspense)
   ---------------------------------------------------------------- */
function StatsSkeleton() {
  return (
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: '20px', width: '140px', borderRadius: 'var(--radius-sm)' }} />
        <div style={{ height: '1px', flex: 1, background: 'var(--border-light)' }} />
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ padding: '1.2rem 1.35rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: 'var(--radius-lg)' }}>
              <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div className="skeleton" style={{ height: '10px', width: '70%' }} />
                <div className="skeleton" style={{ height: '24px', width: '50%' }} />
                <div className="skeleton" style={{ height: '10px', width: '90%' }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function ChartsSkeleton() {
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ height: '18px', width: '180px' }} />
        <div className="skeleton" style={{ height: '24px', width: '100px', borderRadius: 'var(--radius-full)' }} />
      </div>
      <div className="skeleton" style={{ height: '220px', width: '100%', borderRadius: 'var(--radius-md)' }} />
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: '20px', width: '160px' }} />
        <div style={{ height: '1px', flex: 1, background: 'var(--border-light)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="skeleton" style={{ height: '52px', borderRadius: 'var(--radius-sm)' }} />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   Async sub-components for streaming
   ---------------------------------------------------------------- */
async function AdminStatsSection({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return null;

  const today = normalizeDate();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    teacherProfileGroups,
    todayAttendanceGroups,
    past7DaysAttendance,
    openConcerns,
    pendingETO,
    pendingSRD,
    activeResignations,
    inProgressOnboarding,
    workstationGroups,
    activeAnnouncementsCount,
    openIncidents,
  ] = await Promise.all([
    // Grouped 1-query aggregation for all TeacherProfile stats (replaces 9 queries)
    prisma.teacherProfile.groupBy({
      by: ['registrationStatus', 'department', 'projectType'],
      _count: { id: true },
    }),
    // Grouped 1-query aggregation for today's attendance (replaces 3 queries)
    prisma.teacherAttendance.groupBy({
      by: ['status'],
      where: { date: today },
      _count: { id: true },
    }),
    prisma.teacherAttendance.findMany({
      where: { date: { gte: sevenDaysAgo, lte: today } },
      select: { date: true, status: true, isLate: true },
    }),
    prisma.teacherConcernTicket.count({ where: { status: { in: ['SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW'] } } }),
    prisma.earlyTimeOffRequest.count({ where: { status: 'PENDING' } }),
    prisma.switchRestDayRequest.count({ where: { status: 'PENDING' } }),
    prisma.teacherResignation.count({ where: { status: { notIn: ['DEACTIVATED', 'WITHDRAWN'] } } }),
    prisma.newHireRecord.count({ where: { status: 'IN_PROGRESS' } }),
    // Grouped 1-query aggregation for workstation seats (replaces 4 queries)
    prisma.workstation.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.announcement.count({ where: { isActive: true } }),
    prisma.incidentReportTicket.count({ where: { status: { in: ['REPORTED', 'INVESTIGATING'] } } }),
  ]);

  // Derive teacher metrics in-memory from the consolidated group data
  let totalTeachers = 0;
  let approvedTeachers = 0;
  let pendingTeachers = 0;
  let underReviewTeachers = 0;
  let domesticTeachers = 0;
  let overseasTeachers = 0;
  let ftTeachers = 0;
  let ftexTeachers = 0;
  let ttpTeachers = 0;

  for (const g of teacherProfileGroups) {
    const c = g._count.id;
    totalTeachers += c;
    if (g.registrationStatus === 'APPROVED') {
      approvedTeachers += c;
      if (g.department === 'DOMESTIC') domesticTeachers += c;
      if (g.department === 'OVERSEAS') overseasTeachers += c;
      if (g.projectType === 'FT') ftTeachers += c;
      if (g.projectType === 'FTEX') ftexTeachers += c;
      if (g.projectType === 'TTP') ttpTeachers += c;
    } else if (g.registrationStatus === 'PENDING') {
      pendingTeachers += c;
    } else if (g.registrationStatus === 'UNDER_REVIEW') {
      underReviewTeachers += c;
    }
  }

  // Derive today's attendance in-memory from grouped counts
  let todayPresentCount = 0;
  let todayLateCount = 0;
  let todayAbsentCount = 0;

  for (const a of todayAttendanceGroups) {
    const c = a._count.id;
    if (a.status === 'PRESENT') todayPresentCount += c;
    else if (a.status === 'LATE') todayLateCount += c;
    else if (a.status === 'ABSENT_VALID' || a.status === 'ABSENT_INVALID') todayAbsentCount += c;
  }

  // Derive workstation counts in-memory from grouped counts
  let occupiedSeats = 0;
  let totalSeats = 0;
  let pendingReformatSeats = 0;
  let availableSeats = 0;

  for (const w of workstationGroups) {
    const c = w._count.id;
    totalSeats += c;
    if (w.status === 'OCCUPIED') occupiedSeats += c;
    else if (w.status === 'PENDING_REFORMAT') pendingReformatSeats += c;
    else if (w.status === 'AVAILABLE') availableSeats += c;
  }

  const totalPresentOrLate = todayPresentCount + todayLateCount;

  // Build 7-day attendance trend
  const daysMap: Record<string, { day: string; date: string; present: number; late: number; total: number }> = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    daysMap[dateKey] = { day: dayNames[d.getDay()], date: dateKey, present: 0, late: 0, total: 0 };
  }
  past7DaysAttendance.forEach((rec) => {
    const dStr = new Date(rec.date).toISOString().split('T')[0];
    if (daysMap[dStr]) {
      if (rec.status === 'LATE' || rec.isLate) daysMap[dStr].late += 1;
      else if (rec.status === 'PRESENT') daysMap[dStr].present += 1;
      daysMap[dStr].total += 1;
    }
  });

  const chartsData: DashboardChartsData = {
    departmentBreakdown: [
      { label: 'Domestic', count: domesticTeachers, color: 'var(--ns-blue)' },
      { label: 'Overseas', count: overseasTeachers, color: 'var(--ns-violet)' },
    ],
    projectBreakdown: [
      { label: 'Full Time (FT)', count: ftTeachers, color: 'var(--ns-blue)' },
      { label: 'FT Experienced (FTEX)', count: ftexTeachers, color: 'var(--ns-green)' },
      { label: 'TTP Trainee (TTP)', count: ttpTeachers, color: 'var(--ns-gold-dark)' },
    ],
    statusBreakdown: [
      { label: 'Approved', count: approvedTeachers, color: 'var(--ns-green)' },
      { label: 'Pending Review', count: pendingTeachers, color: '#f59e0b' },
      { label: 'Under Review', count: underReviewTeachers, color: 'var(--ns-blue)' },
    ],
    attendanceBreakdown: [
      { label: 'Present On-Time', count: todayPresentCount, color: 'var(--ns-green)' },
      { label: 'Late Arrival', count: todayLateCount, color: '#f59e0b' },
      { label: 'Reported Absent', count: todayAbsentCount, color: '#ef4444' },
    ],
    todayPresentCount: totalPresentOrLate,
    totalTeachers,
    occupiedSeats,
    availableSeats,
    pendingReformatSeats,
    totalSeats,
    concernBreakdown: [
      { label: 'Teacher Concerns', count: openConcerns, color: 'var(--ns-gold-dark)' },
      { label: 'Incidents Under Investigation', count: openIncidents, color: '#ef4444' },
    ],
    openConcerns,
    openIncidents,
    attendanceTrend: Object.values(daysMap),
  };

  return (
    <>
      {/* Section header */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
          📊 System Overview
        </h2>
        <div style={{ height: '1px', flex: 1, background: 'var(--border-light)' }} />
      </div>

      {/* Teacher stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <StatCard icon="🧑‍🏫" label="Total Teachers"    value={totalTeachers}    sub="All registration statuses"     accent="blue"   href="/dashboard/teachers" />
        <StatCard icon="✅" label="Active Teachers"    value={approvedTeachers}  sub="Approved & operational"        accent="green"  href="/dashboard/teachers" />
        <StatCard icon="⏳" label="Pending Approval"   value={pendingTeachers}   sub="Awaiting review"               accent="gold"   href="/dashboard/teachers" />
        <StatCard icon="🌏" label="Domestic / Overseas" value={`${domesticTeachers} / ${overseasTeachers}`} sub="Approved by department" accent="violet" />
      </div>

      {/* Operational stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <StatCard icon="🕐" label="Present Today"      value={totalPresentOrLate} sub="Present or late today"         accent="teal"   href="/dashboard/attendance" />
        <StatCard icon="🎫" label="Open Concerns"      value={openConcerns}      sub="Unresolved concern tickets"    accent="gold"   href="/dashboard/concerns/manage" />
        <StatCard icon="📋" label="Pending Requests"   value={pendingETO + pendingSRD} sub={`${pendingETO} ETO · ${pendingSRD} SRD`} accent="violet" href="/dashboard/requests" />
        <StatCard icon="🚨" label="Open Incidents"     value={openIncidents}     sub="Reported or investigating"     accent="red"    href="/dashboard/concerns/manage" />
      </div>

      {/* Pipeline stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '0.85rem', marginBottom: '1.75rem' }}>
        <StatCard icon="📤" label="Active Resignations" value={activeResignations}   sub="In offboarding pipeline"   accent="red"    href="/dashboard/resignation/monitoring" />
        <StatCard icon="🎓" label="Onboarding Active"   value={inProgressOnboarding} sub="New hire checklist in progress" accent="blue" href="/dashboard/onboarding/manage" />
        <StatCard icon="💻" label="Seats Occupied"      value={`${occupiedSeats} / ${totalSeats}`} sub={`${pendingReformatSeats} pending reformat`} accent="teal" href="/dashboard/seating/manage" />
        <StatCard icon="📢" label="Announcements"       value={activeAnnouncementsCount} sub="Active notices"        accent="gold"   href="/dashboard/announcements" />
      </div>

      {/* Analytics Charts */}
      <DashboardAnalyticsCharts data={chartsData} />
    </>
  );
}

async function TeacherDirectorySection({ canReadUsers }: { canReadUsers: boolean }) {
  if (!canReadUsers) return null;

  const teacherDirectoryList = await prisma.teacherProfile.findMany({
    take: 25,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { username: true, isActive: true },
      },
    },
  });

  if (teacherDirectoryList.length === 0) return null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>
            👩‍🏫 Teacher Directory
          </h2>
          <div style={{ height: '1px', flex: 1, background: 'var(--border-light)' }} />
        </div>
        <Link
          href="/dashboard/teachers"
          style={{ fontSize: '0.8rem', color: 'var(--ns-blue)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          View Full Management →
        </Link>
      </div>
      <TeacherDirectoryTable teachers={teacherDirectoryList} />
    </div>
  );
}

/* ================================================================
   DASHBOARD PAGE — with streaming via Suspense
   ================================================================ */
export default async function DashboardPage() {
  const user = await requireAuth();

  const canReadUsers   = hasPermission(user, PERMISSIONS.USERS_READ);
  const canGrantIncentives = hasPermission(user, PERMISSIONS.TEACHERS_REVIEW);

  const isTeacherUser = user.roles.includes(ROLES.TEACHER);
  let teacherProfile: any = null;
  let todayAttendance: any = null;
  let todayDailyOutput: any = null;
  let activeAnnouncements: any[] = [];

  if (isTeacherUser) {
    try {
      teacherProfile = await prisma.teacherProfile.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { contactEmail: { equals: user.email, mode: 'insensitive' } },
          ],
        },
        include: { shiftSchedule: true, newHireRecord: true },
      });

      if (teacherProfile) {
        [todayAttendance, todayDailyOutput, activeAnnouncements] = await Promise.all([
          prisma.teacherAttendance.findUnique({
            where: { teacherId_date: { teacherId: teacherProfile.id, date: normalizeDate() } },
          }),
          prisma.dailyOutput.findUnique({
            where: { teacherId_date: { teacherId: teacherProfile.id, date: normalizeDate() } },
          }),
          prisma.announcement.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          }),
        ]);
      }
    } catch (err) {
      console.error('[DashboardPage] Failed to fetch teacher data:', err);
    }
  }

  const todayBirthdays = await getTodayBirthdaysAction();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user.fullName.split(' ')[0];

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', animation: 'fadeInUp 0.35s ease' }}>

      {/* ── Birthday Recognition Banner ── */}
      <TeacherBirthdayBanner
        teachers={todayBirthdays}
        canGrantIncentive={canGrantIncentives}
      />

      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1240a8 0%, #1a56db 50%, #0ea579 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.9rem 2.25rem',
        marginBottom: '1.75rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(26, 86, 219, 0.28)',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', right: '100px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(245,166,35,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600,
              textTransform: 'uppercase' as const, letterSpacing: '0.1em',
              marginBottom: '0.35rem', fontFamily: 'var(--font-heading)',
            }}>
              {greeting}
            </div>
            <h1 style={{
              fontSize: '1.9rem', fontWeight: 800, color: '#fff',
              fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
              lineHeight: 1.1, marginBottom: '0.6rem',
            }}>
              {firstName}! 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {user.email} · {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignSelf: 'center' }}>
            {user.roles.map((r) => (
              <span key={r} style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.28)',
                color: '#fff',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                backdropFilter: 'blur(8px)',
              }}>
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Teacher Onboarding Progress Banner ── */}
      {teacherProfile?.newHireRecord && (!teacherProfile.newHireRecord.slotsEligible || teacherProfile.newHireRecord.status !== 'COMPLETED') && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,82,204,0.08) 0%, rgba(16,185,129,0.08) 100%)',
          border: '1px solid rgba(0,82,204,0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎓</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                New Hire Onboarding in Progress ({teacherProfile.newHireRecord.completionPct}% complete)
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Complete all 18 requirements and 3-day minimum compliance window to qualify for class slot opening.
            </p>
          </div>
          <Link
            href="/dashboard/onboarding"
            style={{
              background: 'var(--ns-blue)',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>📋</span> View My Onboarding &rarr;
          </Link>
        </div>
      )}

      {/* ── Teacher Attendance Widget ── */}
      {teacherProfile && (
        <div style={{ marginBottom: '1.75rem' }}>
          <TeacherAttendanceWidget
            shiftName={teacherProfile.shiftSchedule?.name || 'Standard Operation (08:00 - 17:00)'}
            startTime={teacherProfile.shiftSchedule?.startTime || '08:00'}
            endTime={teacherProfile.shiftSchedule?.endTime || '17:00'}
            initialAttendance={todayAttendance}
            initialDailyOutput={todayDailyOutput}
            announcements={activeAnnouncements}
          />
        </div>
      )}

      {/* ── Summary Stats + Charts (streamed) ── */}
      {canReadUsers && (
        <Suspense fallback={
          <>
            <StatsSkeleton />
            <ChartsSkeleton />
          </>
        }>
          <AdminStatsSection userId={user.id} />
        </Suspense>
      )}

      {/* ── Teacher Directory (streamed separately) ── */}
      {canReadUsers && (
        <Suspense fallback={<DirectorySkeleton />}>
          <TeacherDirectorySection canReadUsers={canReadUsers} />
        </Suspense>
      )}
    </div>
  );
}

import { requireAuth, hasPermission, hasRole, PERMISSIONS, ROLES } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db';
import TeacherAttendanceWidget from '@/components/attendance/TeacherAttendanceWidget';
import DashboardAnalyticsCharts, { DashboardChartsData } from '@/components/dashboard/DashboardAnalyticsCharts';
import TeacherDirectoryTable from '@/components/teachers/TeacherDirectoryTable';
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
      padding: '1.25rem 1.4rem',
      border: `1px solid var(--border-light)`,
      borderLeft: `4px solid ${a.border}`,
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'box-shadow 0.18s ease, transform 0.18s ease',
      cursor: href ? 'pointer' : 'default',
      textDecoration: 'none',
      height: '100%',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: 'var(--radius-md)',
        background: a.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.3rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
          fontFamily: 'var(--font-heading)',
          marginBottom: '0.2rem',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '1.55rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-heading)',
          lineHeight: 1.1,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
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

/* ================================================================
   DASHBOARD PAGE
   ================================================================ */
export default async function DashboardPage() {
  const user = await requireAuth();

  const canReadUsers   = hasPermission(user, PERMISSIONS.USERS_READ);

  const isTeacherUser = user.roles.includes(ROLES.TEACHER);
  let teacherProfile: any = null;
  let todayAttendance: any = null;
  let todayDailyOutput: any = null;
  let activeAnnouncements: any[] = [];

  if (isTeacherUser) {
    teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
      include: { shiftSchedule: true },
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
  }

  // ── Summary stats (only for admins / managers with canReadUsers) ──
  let summaryStats: {
    totalTeachers: number;
    approvedTeachers: number;
    pendingTeachers: number;
    domesticTeachers: number;
    overseasTeachers: number;
    todayPresentCount: number;
    openConcerns: number;
    pendingETO: number;
    pendingSRD: number;
    activeResignations: number;
    inProgressOnboarding: number;
    occupiedSeats: number;
    totalSeats: number;
    pendingReformatSeats: number;
    activeAnnouncementsCount: number;
    openIncidents: number;
  } | null = null;

  let teacherDirectoryList: any[] = [];
  let chartsData: DashboardChartsData | null = null;

  if (canReadUsers) {
    const today = normalizeDate();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [
      totalTeachers,
      approvedTeachers,
      pendingTeachers,
      underReviewTeachers,
      domesticTeachers,
      overseasTeachers,
      ftTeachers,
      ftexTeachers,
      ttpTeachers,
      todayPresentCount,
      todayLateCount,
      todayAbsentCount,
      past7DaysAttendance,
      openConcerns,
      pendingETO,
      pendingSRD,
      activeResignations,
      inProgressOnboarding,
      occupiedSeats,
      totalSeats,
      pendingReformatSeats,
      availableSeats,
      activeAnnouncementsCount,
      openIncidents,
      teacherDirectoryFetch,
    ] = await Promise.all([
      prisma.teacherProfile.count(),
      prisma.teacherProfile.count({ where: { registrationStatus: 'APPROVED' } }),
      prisma.teacherProfile.count({ where: { registrationStatus: 'PENDING' } }),
      prisma.teacherProfile.count({ where: { registrationStatus: 'UNDER_REVIEW' } }),
      prisma.teacherProfile.count({ where: { department: 'DOMESTIC', registrationStatus: 'APPROVED' } }),
      prisma.teacherProfile.count({ where: { department: 'OVERSEAS', registrationStatus: 'APPROVED' } }),
      prisma.teacherProfile.count({ where: { projectType: 'FT', registrationStatus: 'APPROVED' } }),
      prisma.teacherProfile.count({ where: { projectType: 'FTEX', registrationStatus: 'APPROVED' } }),
      prisma.teacherProfile.count({ where: { projectType: 'TTP', registrationStatus: 'APPROVED' } }),
      prisma.teacherAttendance.count({
        where: { date: today, status: 'PRESENT' },
      }),
      prisma.teacherAttendance.count({
        where: { date: today, status: 'LATE' },
      }),
      prisma.teacherAttendance.count({
        where: { date: today, status: { in: ['ABSENT_VALID', 'ABSENT_INVALID'] } },
      }),
      prisma.teacherAttendance.findMany({
        where: { date: { gte: sevenDaysAgo, lte: today } },
        select: { date: true, status: true, isLate: true },
      }),
      prisma.teacherConcernTicket.count({
        where: { status: { in: ['SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW'] } },
      }),
      prisma.earlyTimeOffRequest.count({ where: { status: 'PENDING' } }),
      prisma.switchRestDayRequest.count({ where: { status: 'PENDING' } }),
      prisma.teacherResignation.count({
        where: { status: { notIn: ['DEACTIVATED', 'WITHDRAWN'] } },
      }),
      prisma.newHireRecord.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.workstation.count({ where: { status: 'OCCUPIED' } }),
      prisma.workstation.count(),
      prisma.workstation.count({ where: { status: 'PENDING_REFORMAT' } }),
      prisma.workstation.count({ where: { status: 'AVAILABLE' } }),
      prisma.announcement.count({ where: { isActive: true } }),
      prisma.incidentReportTicket.count({ where: { status: { in: ['REPORTED', 'INVESTIGATING'] } } }),
      prisma.teacherProfile.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { username: true, isActive: true },
          },
        },
      }),
    ]);

    const totalPresentOrLate = todayPresentCount + todayLateCount;

    summaryStats = {
      totalTeachers, approvedTeachers, pendingTeachers,
      domesticTeachers, overseasTeachers, todayPresentCount: totalPresentOrLate,
      openConcerns, pendingETO, pendingSRD, activeResignations,
      inProgressOnboarding, occupiedSeats, totalSeats,
      pendingReformatSeats, activeAnnouncementsCount, openIncidents,
    };
    teacherDirectoryList = teacherDirectoryFetch;

    // Build 7-day attendance trend data
    const daysMap: Record<string, { day: string; date: string; present: number; late: number; total: number }> = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      daysMap[dateKey] = {
        day: dayNames[d.getDay()],
        date: dateKey,
        present: 0,
        late: 0,
        total: 0,
      };
    }

    past7DaysAttendance.forEach((rec) => {
      const dStr = new Date(rec.date).toISOString().split('T')[0];
      if (daysMap[dStr]) {
        if (rec.status === 'LATE' || rec.isLate) {
          daysMap[dStr].late += 1;
        } else if (rec.status === 'PRESENT') {
          daysMap[dStr].present += 1;
        }
        daysMap[dStr].total += 1;
      }
    });

    const attendanceTrend = Object.values(daysMap);

    chartsData = {
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
      attendanceTrend,
    };
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user.fullName.split(' ')[0];

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', animation: 'fadeInUp 0.35s ease' }}>

      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'var(--grad-brand)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem 2.25rem',
        marginBottom: '1.75rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-blue)',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30px', right: '120px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(244,196,48,0.1)', pointerEvents: 'none' }} />

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

      {/* ── Summary Stats ── */}
      {summaryStats && (
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
            <StatCard icon="🧑‍🏫" label="Total Teachers"    value={summaryStats.totalTeachers}    sub="All registration statuses"     accent="blue"   href="/dashboard/teachers" />
            <StatCard icon="✅" label="Active Teachers"    value={summaryStats.approvedTeachers}  sub="Approved & operational"        accent="green"  href="/dashboard/teachers" />
            <StatCard icon="⏳" label="Pending Approval"   value={summaryStats.pendingTeachers}   sub="Awaiting review"               accent="gold"   href="/dashboard/teachers" />
            <StatCard icon="🌏" label="Domestic / Overseas" value={`${summaryStats.domesticTeachers} / ${summaryStats.overseasTeachers}`} sub="Approved by department" accent="violet" />
          </div>

          {/* Operational stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
            <StatCard icon="🕐" label="Present Today"      value={summaryStats.todayPresentCount} sub="Present or late today"         accent="teal"   href="/dashboard/attendance" />
            <StatCard icon="🎫" label="Open Concerns"      value={summaryStats.openConcerns}      sub="Unresolved concern tickets"    accent="gold"   href="/dashboard/concerns" />
            <StatCard icon="📋" label="Pending Requests"   value={summaryStats.pendingETO + summaryStats.pendingSRD} sub={`${summaryStats.pendingETO} ETO · ${summaryStats.pendingSRD} SRD`} accent="violet" href="/dashboard/requests" />
            <StatCard icon="🚨" label="Open Incidents"     value={summaryStats.openIncidents}     sub="Reported or investigating"     accent="red"    href="/dashboard/concerns" />
          </div>

          {/* Pipeline stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '0.85rem', marginBottom: '1.75rem' }}>
            <StatCard icon="📤" label="Active Resignations" value={summaryStats.activeResignations}   sub="In offboarding pipeline"   accent="red"    href="/dashboard/resignation" />
            <StatCard icon="🎓" label="Onboarding Active"   value={summaryStats.inProgressOnboarding} sub="New hire checklist in progress" accent="blue" href="/dashboard/onboarding" />
            <StatCard icon="💻" label="Seats Occupied"      value={`${summaryStats.occupiedSeats} / ${summaryStats.totalSeats}`} sub={`${summaryStats.pendingReformatSeats} pending reformat`} accent="teal" href="/dashboard/seating" />
            <StatCard icon="📢" label="Announcements"       value={summaryStats.activeAnnouncementsCount} sub="Active notices"        accent="gold"   href="/dashboard/announcements" />
          </div>
        </>
      )}

      {/* ── Analytics Visual Graphs ── */}
      {chartsData && <DashboardAnalyticsCharts data={chartsData} />}

      {/* ── Teacher Directory ── */}
      {canReadUsers && teacherDirectoryList.length > 0 && (
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
              style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              View Full Management →
            </Link>
          </div>
          <TeacherDirectoryTable teachers={teacherDirectoryList} />
        </div>
      )}
    </div>
  );
}

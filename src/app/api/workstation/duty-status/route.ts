import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { ROLES } from '@/lib/auth/types';

import { getManilaToday } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let user = await getCurrentUser();

    // If caller has no browser cookie (e.g. background PowerShell daemon on localhost or LAN IP),
    // identify active session on this IP address
    if (!user) {
      const clientIp =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1';

      // Find most recent active teacher session from this machine (localhost or same IP)
      const ipMatch = [clientIp, '127.0.0.1', '::1', '::ffff:127.0.0.1'];
      const activeTeacherSession = await prisma.session.findFirst({
        where: {
          expiresAt: { gt: new Date() },
          user: {
            isActive: true,
            userRoles: {
              some: {
                role: { name: ROLES.TEACHER },
              },
            },
          },
          OR: [
            { ipAddress: { in: ipMatch } },
            { ipAddress: clientIp },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      if (activeTeacherSession) {
        user = {
          id: activeTeacherSession.user.id,
          fullName: activeTeacherSession.user.fullName,
          email: activeTeacherSession.user.email,
          username: '',
          isActive: true,
          roles: [ROLES.TEACHER],
          permissions: [],
          branch: null,
        };
      }
    }

    if (!user) {
      return NextResponse.json({ authenticated: false, isDutyLocked: false });
    }

    if (!user.roles.includes(ROLES.TEACHER)) {
      return NextResponse.json({
        authenticated: true,
        isTeacher: false,
        isDutyLocked: false,
        user: { fullName: user.fullName, email: user.email },
      });
    }

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId: user.id },
      select: { id: true, displayName: true },
    });

    if (!teacher) {
      return NextResponse.json({
        authenticated: true,
        isTeacher: true,
        isDutyLocked: false,
      });
    }

    // Find today's attendance record (or active shift where timeIn exists and timeOut is null)
    let attendance = await prisma.teacherAttendance.findFirst({
      where: {
        teacherId: teacher.id,
        timeIn: { not: null },
        timeOut: null,
      },
      orderBy: { date: 'desc' },
      select: { timeIn: true, timeOut: true, status: true },
    });

    if (!attendance) {
      attendance = await prisma.teacherAttendance.findFirst({
        where: {
          teacherId: teacher.id,
        },
        orderBy: { date: 'desc' },
        select: { timeIn: true, timeOut: true, status: true },
      });
    }

    const isDutyLocked = !!attendance?.timeIn && !attendance?.timeOut;

    return NextResponse.json({
      authenticated: true,
      isTeacher: true,
      teacherName: teacher.displayName,
      isDutyLocked,
      timeIn: attendance?.timeIn || null,
      status: attendance?.status || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { evaluateScheduledAlertsInternal } from '@/actions/scheduledJobs';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET is not configured.' },
      { status: 500 }
    );
  }

  const isValid = authHeader === `Bearer ${expectedSecret}` || authHeader === expectedSecret;

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const result = await evaluateScheduledAlertsInternal();
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Cron alert evaluation failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Cron evaluation failed.' },
      { status: 500 }
    );
  }
}

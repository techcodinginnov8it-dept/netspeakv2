import { prisma } from '@/lib/db';
import { SubscriptionStatus } from '@prisma/client';

export interface SubscriptionCheckResult {
  isLocked: boolean;
  isGracePeriod: boolean;
  daysRemaining: number;
  graceDaysRemaining: number;
  dueDate: Date;
  gracePeriodEnd: Date;
  status: SubscriptionStatus;
  monthlyFeePhp: number;
  organizationName: string;
}

/**
 * Returns or initializes the singleton system subscription record.
 */
export async function getOrCreateSystemSubscription() {
  let sub = await prisma.systemSubscription.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!sub) {
    const now = new Date();
    // Default: 30 days from now
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const graceEnd = new Date(periodEnd.getTime() + 5 * 24 * 60 * 60 * 1000);

    sub = await prisma.systemSubscription.create({
      data: {
        organizationName: 'Netspeak Learning Inc.',
        planName: 'Netspeak Portal Monthly Enterprise',
        monthlyFeePhp: 15000.0,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        gracePeriodDays: 5,
        gracePeriodEnd: graceEnd,
        nextBillingDate: periodEnd,
        paymentInstructions:
          'Bank: BDO Unibank Inc.\nAccount Name: Netspeak Learning Inc.\nAccount Number: 0012-3456-7890\n\nGCash / Maya: 0917-123-4567 (Billing Ops)',
      },
    });
  }

  return sub;
}

/**
 * Evaluate subscription state against current time.
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionCheckResult> {
  const sub = await getOrCreateSystemSubscription();
  const now = new Date();

  let status: SubscriptionStatus = sub.status;

  // Compute days
  const msToDueDate = sub.currentPeriodEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msToDueDate / (1000 * 60 * 60 * 24));

  const msToGraceEnd = sub.gracePeriodEnd.getTime() - now.getTime();
  const graceDaysRemaining = Math.ceil(msToGraceEnd / (1000 * 60 * 60 * 24));

  // Determine state
  if (sub.status === SubscriptionStatus.SUSPENDED || sub.status === SubscriptionStatus.LOCKED) {
    status = SubscriptionStatus.LOCKED;
  } else if (now > sub.gracePeriodEnd) {
    status = SubscriptionStatus.LOCKED;
  } else if (now > sub.currentPeriodEnd) {
    status = SubscriptionStatus.GRACE_PERIOD;
  } else {
    status = SubscriptionStatus.ACTIVE;
  }

  // Auto-sync status to database if state changed
  if (status !== sub.status) {
    await prisma.systemSubscription.update({
      where: { id: sub.id },
      data: { status },
    });
  }

  return {
    isLocked: status === SubscriptionStatus.LOCKED,
    isGracePeriod: status === SubscriptionStatus.GRACE_PERIOD,
    daysRemaining,
    graceDaysRemaining,
    dueDate: sub.currentPeriodEnd,
    gracePeriodEnd: sub.gracePeriodEnd,
    status,
    monthlyFeePhp: Number(sub.monthlyFeePhp),
    organizationName: sub.organizationName,
  };
}

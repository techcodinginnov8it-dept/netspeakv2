'use server';

import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { ROLES } from '@/lib/auth/types';
import { PaymentProofStatus, SubscriptionStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getOrCreateSystemSubscription } from '@/lib/subscription';

export async function submitPaymentProof(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: 'User session required' };
  }

  const sub = await getOrCreateSystemSubscription();

  const paymentMethod = formData.get('paymentMethod') as string;
  const referenceNumber = formData.get('referenceNumber') as string;
  const amountPaidPhp = parseFloat(formData.get('amountPaid') as string || '0');
  const proofImageUrl = (formData.get('proofImageUrl') as string) || null;
  const notes = (formData.get('notes') as string) || null;

  if (!paymentMethod || !referenceNumber || isNaN(amountPaidPhp) || amountPaidPhp <= 0) {
    return { success: false, error: 'Please provide valid payment details and reference number.' };
  }

  try {
    const payment = await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        amountPaidPhp,
        proofImageUrl,
        notes,
        status: PaymentProofStatus.PENDING,
        submittedByUserId: user.id,
      },
    });

    revalidatePath('/subscription-locked');
    revalidatePath('/dashboard');
    return { success: true, paymentId: payment.id };
  } catch (err: any) {
    console.error('[submitPaymentProof] Error:', err);
    return { success: false, error: 'Failed to record payment submission. Reference number may already exist.' };
  }
}

/**
 * Super Admin or Ops Manager approves a payment and extends subscription by months
 */
export async function approvePaymentAndExtend(paymentId: string, monthsToExtend: number = 1) {
  const user = await getCurrentUser();
  if (!user || (!user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) && !user.roles.includes(ROLES.ADMIN))) {
    return { success: false, error: 'Unauthorized: Admin privileges required.' };
  }

  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { subscription: true },
  });

  if (!payment) {
    return { success: false, error: 'Payment not found.' };
  }

  const sub = payment.subscription;
  const baseDate = sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();

  // Add months
  const newPeriodEnd = new Date(baseDate);
  newPeriodEnd.setMonth(newPeriodEnd.getMonth() + monthsToExtend);

  const graceDays = sub.gracePeriodDays || 5;
  const newGraceEnd = new Date(newPeriodEnd.getTime() + graceDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: PaymentProofStatus.VERIFIED,
        verifiedByUserId: user.id,
        verifiedAt: new Date(),
        periodExtendedMonths: monthsToExtend,
      },
    }),
    prisma.systemSubscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: baseDate,
        currentPeriodEnd: newPeriodEnd,
        gracePeriodEnd: newGraceEnd,
        nextBillingDate: newPeriodEnd,
        lastPaymentDate: new Date(),
      },
    }),
  ]);

  revalidatePath('/subscription-locked');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/subscription');
  return { success: true };
}

/**
 * Super Admin rejects a submitted payment proof
 */
export async function rejectPaymentProof(paymentId: string, rejectionReason: string) {
  const user = await getCurrentUser();
  if (!user || (!user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) && !user.roles.includes(ROLES.ADMIN))) {
    return { success: false, error: 'Unauthorized: Admin privileges required.' };
  }

  try {
    await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: PaymentProofStatus.REJECTED,
        verifiedByUserId: user.id,
        verifiedAt: new Date(),
        rejectionReason: rejectionReason || 'Payment verification failed',
      },
    });

    revalidatePath('/subscription-locked');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/subscription');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reject payment' };
  }
}

/**
 * Super Admin manually adjusts subscription settings, status, or due date
 */
export async function updateSubscriptionConfig(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (!user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) && !user.roles.includes(ROLES.ADMIN))) {
    return { success: false, error: 'Unauthorized: Admin privileges required.' };
  }

  const sub = await getOrCreateSystemSubscription();

  const status = formData.get('status') as SubscriptionStatus;
  const monthlyFeePhp = parseFloat(formData.get('monthlyFeePhp') as string || '15000');
  const gracePeriodDays = parseInt(formData.get('gracePeriodDays') as string || '5', 10);
  const paymentInstructions = (formData.get('paymentInstructions') as string) || '';
  const currentPeriodEndStr = formData.get('currentPeriodEnd') as string;

  let currentPeriodEnd = sub.currentPeriodEnd;
  if (currentPeriodEndStr) {
    currentPeriodEnd = new Date(currentPeriodEndStr);
  }

  const gracePeriodEnd = new Date(currentPeriodEnd.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

  try {
    await prisma.systemSubscription.update({
      where: { id: sub.id },
      data: {
        status: status || sub.status,
        monthlyFeePhp,
        gracePeriodDays,
        currentPeriodEnd,
        gracePeriodEnd,
        nextBillingDate: currentPeriodEnd,
        paymentInstructions,
      },
    });

    revalidatePath('/subscription-locked');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/subscription');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update subscription settings' };
  }
}


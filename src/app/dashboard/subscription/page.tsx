import { requireAuth } from '@/lib/auth/rbac';
import { ROLES } from '@/lib/auth/types';
import { prisma } from '@/lib/db';
import { getOrCreateSystemSubscription, checkSubscriptionStatus } from '@/lib/subscription';
import { redirect } from 'next/navigation';
import SubscriptionDashboardClient from './SubscriptionDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Subscription & Billing Dashboard | Netspeak Admin',
};

export default async function AdminSubscriptionPage() {
  const user = await requireAuth();

  const isSuperAdmin = user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) || user.roles.includes(ROLES.ADMIN);
  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  const sub = await getOrCreateSystemSubscription();
  const subStatus = await checkSubscriptionStatus();

  // Load all payment submissions
  const payments = await prisma.subscriptionPayment.findMany({
    where: { subscriptionId: sub.id },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate high-level financial metrics
  const totalVerifiedRevenue = payments
    .filter((p) => p.status === 'VERIFIED')
    .reduce((acc, p) => acc + Number(p.amountPaidPhp), 0);

  const pendingApprovalsCount = payments.filter((p) => p.status === 'PENDING').length;

  return (
    <SubscriptionDashboardClient
      sub={{
        id: sub.id,
        organizationName: sub.organizationName,
        planName: sub.planName,
        monthlyFeePhp: Number(sub.monthlyFeePhp),
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        gracePeriodDays: sub.gracePeriodDays,
        gracePeriodEnd: sub.gracePeriodEnd.toISOString(),
        nextBillingDate: sub.nextBillingDate.toISOString(),
        lastPaymentDate: sub.lastPaymentDate ? sub.lastPaymentDate.toISOString() : null,
        paymentInstructions: sub.paymentInstructions || '',
      }}
      subStatus={subStatus}
      payments={payments.map((p) => ({
        id: p.id,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        amountPaidPhp: Number(p.amountPaidPhp),
        status: p.status,
        notes: p.notes,
        rejectionReason: p.rejectionReason,
        periodExtendedMonths: p.periodExtendedMonths,
        createdAt: p.createdAt.toISOString(),
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      }))}
      totalVerifiedRevenue={totalVerifiedRevenue}
      pendingApprovalsCount={pendingApprovalsCount}
      adminName={user.fullName}
    />
  );
}

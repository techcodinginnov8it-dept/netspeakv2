import { requireAuth } from '@/lib/auth/rbac';
import { ROLES } from '@/lib/auth/types';
import { checkSubscriptionStatus, getOrCreateSystemSubscription } from '@/lib/subscription';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import SubscriptionLockClient from './SubscriptionLockClient';

export const metadata = {
  title: 'Subscription Status | Netspeak Portal',
};

export default async function SubscriptionLockedPage() {
  const user = await requireAuth();
  const subStatus = await checkSubscriptionStatus();
  const sub = await getOrCreateSystemSubscription();

  const isSuperAdmin = user.roles.includes(ROLES.SYSTEM_ADMINISTRATOR) || user.roles.includes(ROLES.ADMIN);

  // If subscription is not locked and not past due, send users back to dashboard
  if (!subStatus.isLocked && !subStatus.isGracePeriod && !isSuperAdmin) {
    redirect('/dashboard');
  }

  // Fetch recent payments for display / admin approval
  const recentPayments = await prisma.subscriptionPayment.findMany({
    where: { subscriptionId: sub.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <SubscriptionLockClient
      subStatus={subStatus}
      instructions={sub.paymentInstructions || ''}
      recentPayments={recentPayments.map((p) => ({
        id: p.id,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        amountPaidPhp: Number(p.amountPaidPhp),
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      }))}
      isSuperAdmin={isSuperAdmin}
      userName={user.fullName}
    />
  );
}

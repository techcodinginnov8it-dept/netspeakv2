import { prisma } from '../src/lib/db';
import { SubscriptionStatus } from '@prisma/client';

async function setStatus() {
  const target = process.argv[2] || 'LOCKED';
  const sub = await prisma.systemSubscription.findFirst();
  if (!sub) {
    console.error('No subscription record found');
    return;
  }

  if (target === 'LOCKED') {
    await prisma.systemSubscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.LOCKED,
        currentPeriodEnd: new Date(Date.now() - 10 * 86400000),
        gracePeriodEnd: new Date(Date.now() - 5 * 86400000),
      },
    });
    console.log('SYSTEM SET TO LOCKED: Due date passed, grace period expired.');
  } else if (target === 'GRACE_PERIOD') {
    await prisma.systemSubscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.GRACE_PERIOD,
        currentPeriodEnd: new Date(Date.now() - 2 * 86400000),
        gracePeriodEnd: new Date(Date.now() + 3 * 86400000),
      },
    });
    console.log('SYSTEM SET TO GRACE_PERIOD: Due date passed, 3 days grace remain.');
  } else {
    await prisma.systemSubscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        gracePeriodEnd: new Date(Date.now() + 35 * 86400000),
      },
    });
    console.log('SYSTEM RESTORED TO ACTIVE: Normal operations.');
  }
}

setStatus()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });

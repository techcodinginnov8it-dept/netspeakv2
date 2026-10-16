import { prisma } from '../src/lib/db';

async function main() {
  const subs = await prisma.systemSubscription.findMany({
    include: { paymentSubmissions: true },
  });
  console.log('=== SUPABASE SUBSCRIPTION DATA ===');
  console.log('Total subscription records:', subs.length);
  for (const s of subs) {
    console.log('Organization:', s.organizationName);
    console.log('Plan:', s.planName);
    console.log('Current Status:', s.status);
    console.log('Due Date:', s.currentPeriodEnd.toISOString());
    console.log('Grace Period End:', s.gracePeriodEnd.toISOString());
    console.log('Submissions:', s.paymentSubmissions.length);
    for (const p of s.paymentSubmissions) {
      console.log(` -> Ref: ${p.referenceNumber} | Status: ${p.status} | Method: ${p.paymentMethod} | Amount: ₱${p.amountPaidPhp}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });

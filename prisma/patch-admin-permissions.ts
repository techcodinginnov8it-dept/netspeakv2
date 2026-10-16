/**
 * Patch script: Add missing permissions to ADMIN role
 * Run: npx tsx prisma/patch-admin-permissions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MISSING_ADMIN_PERMS = [
  'requests:approve',
  'teachers:approve',
  'attendance:manage',
  'referrals:manage',
  'slots:manage',
  'incentives:manage',
];

async function main() {
  console.log('Patching ADMIN role permissions...');

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    console.error('ADMIN role not found in DB');
    process.exit(1);
  }

  for (const permName of MISSING_ADMIN_PERMS) {
    const perm = await prisma.permission.findUnique({ where: { name: permName } });
    if (!perm) {
      console.warn(`  Permission "${permName}" not found, skipping`);
      continue;
    }

    const existing = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
    });

    if (existing) {
      console.log(`  Already has: ${permName}`);
    } else {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: perm.id },
      });
      console.log(`  Added: ${permName}`);
    }
  }

  console.log('\nDone! ADMIN role permissions are now up to date.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

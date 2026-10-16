import { prisma } from '../src/lib/db';

async function main() {
  const count = await prisma.auditLog.count();
  console.log('AuditLog total count:', count);

  const logs = await prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log('Sample logs:', JSON.stringify(logs, null, 2));

  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  for (const r of roles) {
    const hasAudit = r.rolePermissions.some((rp) => rp.permission.name === 'audit:view');
    console.log(`Role [${r.name}] has audit:view: ${hasAudit}`);
  }

  const distinctModules = await prisma.auditLog.findMany({
    select: { module: true },
    distinct: ['module'],
  });
  console.log('Distinct modules in AuditLog:', distinctModules.map(m => m.module));

  const distinctActions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ['action'],
  });
  console.log('Distinct actions in AuditLog:', distinctActions.map(a => a.action));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

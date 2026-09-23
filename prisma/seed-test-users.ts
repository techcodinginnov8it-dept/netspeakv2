/**
 * seed-test-users.ts
 * Creates one test account per role for QA / dashboard testing.
 * Run: npx tsx prisma/seed-test-users.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'Netspeak2026!';

const TEST_USERS = [
  {
    username: 'test_sysadmin',
    email: 'sysadmin@netspeak.test',
    fullName: 'Test SysAdmin',
    roleName: 'SYSTEM_ADMINISTRATOR',
  },
  {
    username: 'test_admin',
    email: 'admin2@netspeak.test',
    fullName: 'Test Center Admin',
    roleName: 'ADMIN',
  },
  {
    username: 'test_opsmanager',
    email: 'opsmanager@netspeak.test',
    fullName: 'Test Operations Manager',
    roleName: 'OPERATIONS_MANAGER',
  },
  {
    username: 'test_teacher',
    email: 'teacher@netspeak.test',
    fullName: 'Test Teacher',
    roleName: 'TEACHER',
  },
  {
    username: 'test_it',
    email: 'it@netspeak.test',
    fullName: 'Test IT Staff',
    roleName: 'IT',
  },
  {
    username: 'test_management',
    email: 'management@netspeak.test',
    fullName: 'Test Management',
    roleName: 'MANAGEMENT',
  },
];

async function main() {
  const hash = await bcrypt.hash(TEST_PASSWORD, 12);

  for (const u of TEST_USERS) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) {
      console.error(`Role ${u.roleName} not found — run the main seed first.`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: hash, isActive: true, fullName: u.fullName, email: u.email },
      create: {
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        passwordHash: hash,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    // Create TeacherProfile for the TEACHER test user
    if (u.roleName === 'TEACHER') {
      await prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          displayName: 'TestTeacher01',
          realFullName: 'Test Teacher',
          birthday: new Date('1995-06-15'),
          cellphone: '09100000001',
          emergencyContactName: 'Test Emergency Contact',
          emergencyContactPhone: '09100000002',
          address: '123 Test St, Manila',
          schoolAttended: 'University of the Philippines',
          course: 'Education',
          major: 'English',
          projectType: 'FT',
          department: 'DOMESTIC',
          assignedRestDay: 'Sunday',
          registrationStatus: 'APPROVED',
        },
      });
    }

    // Create StaffProfile for ADMIN and IT test users
    if (u.roleName === 'ADMIN' || u.roleName === 'IT') {
      await prisma.staffProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          roleType: u.roleName as 'ADMIN' | 'IT',
          branch: 'Main Branch',
          department: u.roleName === 'IT' ? 'Information Technology' : 'Operations & Center Admin',
        },
      });
    }

    console.log(`[OK] ${u.username} (${u.roleName}) — ready`);
  }

  console.log('\n----------------------------------------------------');
  console.log('TEST CREDENTIALS (all use the same password)');
  console.log('----------------------------------------------------');
  for (const u of TEST_USERS) {
    console.log(`  [${u.roleName.padEnd(22)}]  ${u.username.padEnd(18)} / ${TEST_PASSWORD}`);
  }
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

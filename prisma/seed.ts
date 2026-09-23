import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const ROLES = [
  { name: 'SYSTEM_ADMINISTRATOR', description: 'System Administrator with full access' },
  { name: 'ADMIN', description: 'Center and Operations Admin' },
  { name: 'OPERATIONS_MANAGER', description: 'Operations Manager with approval authority' },
  { name: 'TEACHER', description: 'Teacher account' },
  { name: 'IT', description: 'IT Support and Equipment Specialist' },
  { name: 'MANAGEMENT', description: 'Executive and Management reporting access' },
];

const PERMISSIONS = [
  { name: 'users:read', module: 'users', action: 'read', description: 'View users list' },
  { name: 'users:create', module: 'users', action: 'create', description: 'Create user accounts' },
  { name: 'users:update', module: 'users', action: 'update', description: 'Update user status and info' },
  { name: 'users:delete', module: 'users', action: 'delete', description: 'Delete user accounts' },
  { name: 'roles:assign', module: 'roles', action: 'assign', description: 'Assign roles to users' },
  { name: 'dashboard:view', module: 'dashboard', action: 'view', description: 'View dashboard' },
  { name: 'system:settings', module: 'system', action: 'manage', description: 'Manage system settings' },
  { name: 'teachers:read', module: 'teachers', action: 'read', description: 'View teacher profiles and list' },
  { name: 'teachers:create', module: 'teachers', action: 'create', description: 'Register or create teacher profiles' },
  { name: 'teachers:update', module: 'teachers', action: 'update', description: 'Update teacher operational details' },
  { name: 'teachers:review', module: 'teachers', action: 'review', description: 'Review teacher pending registrations' },
  { name: 'teachers:approve', module: 'teachers', action: 'approve', description: 'Approve or reject teacher registrations' },
  { name: 'attendance:read', module: 'attendance', action: 'read', description: 'View attendance records and roster' },
  { name: 'attendance:record', module: 'attendance', action: 'record', description: 'Record time-in, freshness check and time-out' },
  { name: 'attendance:verify', module: 'attendance', action: 'verify', description: 'Verify and reconcile teacher attendance' },
  { name: 'attendance:manage', module: 'attendance', action: 'manage', description: 'Manage shift schedules and attendance rules' },
  { name: 'output:submit', module: 'output', action: 'submit', description: 'Submit and edit shift daily output' },
  { name: 'output:read', module: 'output', action: 'read', description: 'View daily output reports' },
  { name: 'requests:submit', module: 'requests', action: 'submit', description: 'Submit SRD and Early Time-off requests' },
  { name: 'requests:approve', module: 'requests', action: 'approve', description: 'Approve or reject self-service requests' },
  { name: 'announcements:create', module: 'announcements', action: 'create', description: 'Create announcements and policy notices' },
  { name: 'announcements:manage', module: 'announcements', action: 'manage', description: 'Edit, deactivate, and delete announcements' },
  { name: 'resignation:submit', module: 'resignation', action: 'submit', description: 'Submit teacher resignation' },
  { name: 'resignation:view', module: 'resignation', action: 'view', description: 'View resignation records and monitoring dashboard' },
  { name: 'resignation:manage', module: 'resignation', action: 'manage', description: 'Manage resignation workflows, reviews, and deactivations' },
  { name: 'exit_interview:manage', module: 'exit_interview', action: 'manage', description: 'Open, book, and evaluate exit interview slots' },
  { name: 'concerns:submit', module: 'concerns', action: 'submit', description: 'Submit teacher concern tickets' },
  { name: 'concerns:manage', module: 'concerns', action: 'manage', description: 'Assign, investigate, and resolve teacher concern tickets' },
  { name: 'incidents:report', module: 'incidents', action: 'report', description: 'Create and submit formal incident reports' },
  { name: 'incidents:manage', module: 'incidents', action: 'manage', description: 'Investigate, escalate, and resolve incident reports' },
  { name: 'seating:read', module: 'seating', action: 'read', description: 'View own seat assignment' },
  { name: 'seating:manage', module: 'seating', action: 'manage', description: 'Manage workstations and teacher seat assignments' },
  { name: 'newhire:view', module: 'newhire', action: 'view', description: 'View own onboarding progress and requirements' },
  { name: 'newhire:manage', module: 'newhire', action: 'manage', description: 'Create and manage new hire onboarding records' },
  { name: 'management:dashboard', module: 'management', action: 'dashboard', description: 'Access executive management analytics dashboard' },
  { name: 'operations:record', module: 'operations', action: 'record', description: 'Record Admin and IT staff Time In, Checklist, and Time Out' },
  { name: 'operations:manage', module: 'operations', action: 'manage', description: 'Manage staff operations, verify staff attendance and checklists' },
  { name: 'simulations:manage', module: 'simulations', action: 'manage', description: 'Schedule and record Internet/Power/Genset simulations' },
  { name: 'notifications:read', module: 'notifications', action: 'read', description: 'View personal in-app notifications' },
  { name: 'notifications:broadcast', module: 'notifications', action: 'broadcast', description: 'Broadcast notifications to staff or teachers' },
  { name: 'system:jobs', module: 'system', action: 'jobs', description: 'Trigger and evaluate scheduled monitoring alerts' },
  { name: 'reports:view', module: 'reports', action: 'view', description: 'Access cut-off and consolidated reports' },
  { name: 'reports:export', module: 'reports', action: 'export', description: 'Export operational and cut-off reports data' },
  { name: 'audit:view', module: 'audit', action: 'view', description: 'Inspect system-wide audit activity logs' },
];

async function main() {
  console.log('Seeding announcement...');
  await prisma.announcement.upsert({
    where: { id: 'default-announcement-1' },
    update: {
      title: 'Mandatory Policy: Class Slot Opening & Shift Punctuality',
      content: 'All teachers are reminded that class slots must be opened 1 month in advance. Shift departure requires daily output entry submission prior to sign-off.',
      isActive: true,
    },
    create: {
      id: 'default-announcement-1',
      title: 'Mandatory Policy: Class Slot Opening & Shift Punctuality',
      content: 'All teachers are reminded that class slots must be opened 1 month in advance. Shift departure requires daily output entry submission prior to sign-off.',
      isActive: true,
    },
  });

  console.log('Seeding shift schedules...');
  const shifts = [
    {
      name: 'Morning Shift (08:00 - 17:00)',
      startTime: '08:00',
      endTime: '17:00',
      description: 'Standard daytime operation shift (PHT)',
    },
    {
      name: 'Mid Shift (10:00 - 19:00)',
      startTime: '10:00',
      endTime: '19:00',
      description: 'Mid-day shift bridging morning and afternoon blocks (PHT)',
    },
    {
      name: 'Afternoon Shift (13:00 - 22:00)',
      startTime: '13:00',
      endTime: '22:00',
      description: 'Peak afternoon/evening ESL teaching shift (PHT)',
    },
    {
      name: 'Mid-Afternoon Shift (15:00 - 00:00)',
      startTime: '15:00',
      endTime: '00:00',
      description: 'Starts 3PM, ends midnight — covers peak Chinese prime-time ESL (PHT)',
    },
    {
      name: 'Evening Shift (17:00 - 02:00)',
      startTime: '17:00',
      endTime: '02:00',
      description: 'Evening shift for overseas/night ESL classes (PHT)',
    },
    {
      name: 'Graveyard Shift (22:00 - 07:00)',
      startTime: '22:00',
      endTime: '07:00',
      description: 'Graveyard overnight shift for North American ESL (PHT)',
    },
  ];

  for (const shift of shifts) {
    await prisma.shiftSchedule.upsert({
      where: { name: shift.name },
      update: { startTime: shift.startTime, endTime: shift.endTime, description: shift.description },
      create: shift,
    });
  }

  console.log('Seeding roles...');
  const roleMap = new Map<string, string>();
  for (const role of ROLES) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    roleMap.set(r.name, r.id);
  }

  console.log('Seeding permissions...');
  const permMap = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
      create: {
        name: perm.name,
        module: perm.module,
        action: perm.action,
        description: perm.description,
      },
    });
    permMap.set(p.name, p.id);
  }

  // Assign all permissions to SYSTEM_ADMINISTRATOR role
  const adminRoleId = roleMap.get('SYSTEM_ADMINISTRATOR')!;
  for (const permId of permMap.values()) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRoleId,
          permissionId: permId,
        },
      },
      update: {},
      create: {
        roleId: adminRoleId,
        permissionId: permId,
      },
    });
  }

  // Assign permissions to ADMIN role
  const standardAdminRoleId = roleMap.get('ADMIN')!;
  const adminPerms = [
    'users:read',
    'users:create',
    'users:update',
    'dashboard:view',
    'teachers:read',
    'teachers:review',
    'teachers:update',
    'attendance:read',
    'attendance:verify',
    'output:read',
    'requests:submit',
    'announcements:create',
    'announcements:manage',
    'resignation:view',
    'resignation:manage',
    'exit_interview:manage',
    'concerns:manage',
    'incidents:report',
    'incidents:manage',
    'seating:manage',
    'newhire:manage',
    'operations:record',
    'operations:manage',
    'simulations:manage',
    'notifications:read',
    'notifications:broadcast',
    'system:jobs',
    'reports:view',
    'reports:export',
    'audit:view',
  ];
  for (const pName of adminPerms) {
    const pId = permMap.get(pName);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: standardAdminRoleId,
            permissionId: pId,
          },
        },
        update: {},
        create: {
          roleId: standardAdminRoleId,
          permissionId: pId,
        },
      });
    }
  }

  // Assign permissions to OPERATIONS_MANAGER role
  const opManagerRoleId = roleMap.get('OPERATIONS_MANAGER')!;
  const opManagerPerms = [
    'users:read',
    'dashboard:view',
    'teachers:read',
    'teachers:review',
    'teachers:approve',
    'teachers:update',
    'attendance:read',
    'attendance:verify',
    'attendance:manage',
    'output:read',
    'requests:submit',
    'requests:approve',
    'announcements:create',
    'announcements:manage',
    'resignation:view',
    'resignation:manage',
    'exit_interview:manage',
    'concerns:manage',
    'incidents:report',
    'incidents:manage',
    'seating:manage',
    'newhire:manage',
    'operations:record',
    'operations:manage',
    'simulations:manage',
    'notifications:read',
    'notifications:broadcast',
    'system:jobs',
    'reports:view',
    'reports:export',
    'audit:view',
  ];
  for (const pName of opManagerPerms) {
    const pId = permMap.get(pName);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: opManagerRoleId,
            permissionId: pId,
          },
        },
        update: {},
        create: {
          roleId: opManagerRoleId,
          permissionId: pId,
        },
      });
    }
  }

  // Assign permissions to IT role
  const itRoleId = roleMap.get('IT')!;
  const itPerms = [
    'dashboard:view',
    'concerns:manage',
    'incidents:report',
    'seating:manage',
    'operations:record',
    'operations:manage',
    'simulations:manage',
    'notifications:read',
  ];
  for (const pName of itPerms) {
    const pId = permMap.get(pName);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: itRoleId, permissionId: pId } },
        update: {},
        create: { roleId: itRoleId, permissionId: pId },
      });
    }
  }

  // Assign permissions to TEACHER role
  const teacherRoleId = roleMap.get('TEACHER')!;
  const teacherPerms = [
    'dashboard:view',
    'attendance:record',
    'attendance:read',
    'output:submit',
    'output:read',
    'requests:submit',
    'resignation:submit',
    'concerns:submit',
    'seating:read',
    'newhire:view',
    'notifications:read',
  ];
  for (const pName of teacherPerms) {
    const pId = permMap.get(pName);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: teacherRoleId,
            permissionId: pId,
          },
        },
        update: {},
        create: {
          roleId: teacherRoleId,
          permissionId: pId,
        },
      });
    }
  }

  // Assign permissions to MANAGEMENT role
  const managementRoleId = roleMap.get('MANAGEMENT')!;
  const managementPerms = [
    'dashboard:view',
    'management:dashboard',
    'teachers:read',
    'attendance:read',
    'output:read',
    'resignation:view',
    'newhire:manage',
    'operations:manage',
    'simulations:manage',
    'notifications:read',
    'reports:view',
    'reports:export',
    'audit:view',
  ];
  for (const pName of managementPerms) {
    const pId = permMap.get(pName);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managementRoleId, permissionId: pId } },
        update: {},
        create: { roleId: managementRoleId, permissionId: pId },
      });
    }
  }

  console.log('Seeding initial System Administrator user...');
  const defaultAdminPassword = 'Netspeak2026!';
  const passwordHash = await bcrypt.hash(defaultAdminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      isActive: true,
      fullName: 'System Administrator',
      email: 'admin@netspeak.com',
    },
    create: {
      username: 'admin',
      email: 'admin@netspeak.com',
      fullName: 'System Administrator',
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRoleId,
    },
  });

  console.log('Seeding sample workstations (Milestone 8)...');
  const mainBranchWorkstations = [
    { workstationNo: 'PC-01', seatNo: 'Seat 1' },
    { workstationNo: 'PC-02', seatNo: 'Seat 2' },
    { workstationNo: 'PC-03', seatNo: 'Seat 3' },
    { workstationNo: 'PC-04', seatNo: 'Seat 4' },
    { workstationNo: 'PC-05', seatNo: 'Seat 5' },
    { workstationNo: 'PC-06', seatNo: 'Seat 6' },
    { workstationNo: 'PC-07', seatNo: 'Seat 7' },
    { workstationNo: 'PC-08', seatNo: 'Seat 8' },
    { workstationNo: 'PC-09', seatNo: 'Seat 9' },
    { workstationNo: 'PC-10', seatNo: 'Seat 10' },
  ];
  for (const ws of mainBranchWorkstations) {
    await prisma.workstation.upsert({
      where: { branch_workstationNo: { branch: 'Main Branch', workstationNo: ws.workstationNo } },
      update: { seatNo: ws.seatNo },
      create: {
        branch: 'Main Branch',
        workstationNo: ws.workstationNo,
        seatNo: ws.seatNo,
        status: 'AVAILABLE',
      },
    });
  }

  const branch2Workstations = [
    { workstationNo: 'PC-01', seatNo: 'Seat 1' },
    { workstationNo: 'PC-02', seatNo: 'Seat 2' },
    { workstationNo: 'PC-03', seatNo: 'Seat 3' },
    { workstationNo: 'PC-04', seatNo: 'Seat 4' },
    { workstationNo: 'PC-05', seatNo: 'Seat 5' },
    { workstationNo: 'PC-06', seatNo: 'Seat 6' },
    { workstationNo: 'PC-07', seatNo: 'Seat 7' },
    { workstationNo: 'PC-08', seatNo: 'Seat 8' },
  ];
  for (const ws of branch2Workstations) {
    await prisma.workstation.upsert({
      where: { branch_workstationNo: { branch: 'Branch 2', workstationNo: ws.workstationNo } },
      update: { seatNo: ws.seatNo },
      create: {
        branch: 'Branch 2',
        workstationNo: ws.workstationNo,
        seatNo: ws.seatNo,
        status: 'AVAILABLE',
      },
    });
  }

  console.log('Seeding initial System Settings...');
  const defaultSettings = [
    {
      key: 'SHIFT_GRACE_PERIOD_MINS',
      value: '5',
      category: 'ATTENDANCE',
      description: 'Grace period minutes after scheduled shift start before tardiness penalty kicks in (§17)',
    },
    {
      key: 'SLOT_ADVANCE_DEADLINE_DAYS',
      value: '30',
      category: 'OPERATIONS',
      description: 'Days in advance teachers must open class teaching slots (§24)',
    },
    {
      key: 'PENALTY_INVALID_ABSENCE_PHP',
      value: '500',
      category: 'PENALTY',
      description: 'Configurable penalty deduction in PHP for unexcused/invalid teacher absence (§27)',
    },
    {
      key: 'PENALTY_NO_LOGOUT_PHP',
      value: '150',
      category: 'PENALTY',
      description: 'Configurable penalty deduction in PHP for failure to record Time Out on active shift day (§17, §27)',
    },
    {
      key: 'CUTOFF_PERIOD_CYCLE',
      value: 'SEMI_MONTHLY',
      category: 'OPERATIONS',
      description: 'Cut-off schedule: 1st-15th and 16th-End of Month (§29-30)',
    },
    {
      key: 'MAINTENANCE_MODE',
      value: 'false',
      category: 'GENERAL',
      description: 'System-wide maintenance mode lockdown toggle',
    },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {
        category: s.category,
        description: s.description,
      },
      create: {
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description,
      },
    });
  }

  console.log('Seeding 6 Branches and Branch Admin accounts...');
  const BRANCHES_DATA = [
    { name: 'Atimonan', code: 'ATN', username: 'admin_atimonan', email: 'atimonan.admin@netspeak.com', fullName: 'Atimonan Center Admin' },
    { name: 'Lopez', code: 'LPZ', username: 'admin_lopez', email: 'lopez.admin@netspeak.com', fullName: 'Lopez Center Admin' },
    { name: 'Sto. Tomas', code: 'STO', username: 'admin_stotomas', email: 'stotomas.admin@netspeak.com', fullName: 'Sto. Tomas Center Admin' },
    { name: 'Mauban', code: 'MBN', username: 'admin_mauban', email: 'mauban.admin@netspeak.com', fullName: 'Mauban Center Admin' },
    { name: 'San Pablo', code: 'SPB', username: 'admin_sanpablo', email: 'sanpablo.admin@netspeak.com', fullName: 'San Pablo Center Admin' },
    { name: 'Gumaca', code: 'GMC', username: 'admin_gumaca', email: 'gumaca.admin@netspeak.com', fullName: 'Gumaca Center Admin' },
  ];

  for (const b of BRANCHES_DATA) {
    // 1. Upsert Branch
    await prisma.branch.upsert({
      where: { name: b.name },
      update: { code: b.code, isActive: true },
      create: { name: b.name, code: b.code, isActive: true },
    });

    // 2. Upsert Branch Admin User
    const branchAdminUser = await prisma.user.upsert({
      where: { username: b.username },
      update: {
        email: b.email,
        fullName: b.fullName,
        passwordHash,
        isActive: true,
      },
      create: {
        username: b.username,
        email: b.email,
        fullName: b.fullName,
        passwordHash,
        isActive: true,
      },
    });

    // 3. Assign ADMIN role
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: branchAdminUser.id,
          roleId: standardAdminRoleId,
        },
      },
      update: {},
      create: {
        userId: branchAdminUser.id,
        roleId: standardAdminRoleId,
      },
    });

    // 4. Upsert StaffProfile with branch assignment
    await prisma.staffProfile.upsert({
      where: { userId: branchAdminUser.id },
      update: {
        branch: b.name,
        roleType: 'ADMIN',
      },
      create: {
        userId: branchAdminUser.id,
        branch: b.name,
        roleType: 'ADMIN',
      },
    });
  }

  console.log('Seed completed successfully.');
  console.log('----------------------------------------------------');
  console.log('System Admin: admin (Netspeak2026!)');
  console.log('Branch Admins: admin_atimonan, admin_lopez, admin_stotomas, admin_mauban, admin_sanpablo, admin_gumaca');
  console.log('Default Password for all: Netspeak2026!');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

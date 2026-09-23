'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission, ROLES } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/password';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Registration schema for incoming submissions
const TeacherRegistrationSchema = z.object({
  displayName: z.string().min(2, 'Display Name must be at least 2 characters'),
  realFullName: z.string().min(2, 'Real Complete Name must be at least 2 characters'),
  birthday: z.string().min(1, 'Birthday is required'),
  cellphone: z.string().min(7, 'Valid cellphone number is required'),
  emergencyContactName: z.string().min(2, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(7, 'Emergency contact phone is required'),
  address: z.string().min(5, 'Complete address is required'),
  schoolAttended: z.string().min(2, 'School attended is required'),
  course: z.string().min(2, 'Course is required'),
  major: z.string().min(2, 'Major is required'),
  projectType: z.enum(['FTEX', 'FT', 'TTP']).default('FT'),
  department: z.enum(['DOMESTIC', 'OVERSEAS']).default('DOMESTIC'),
  assignedRestDay: z.string().default('Sunday'),
  portalUsername: z.string().optional(),
  portalPassword: z.string().optional(),
});

export type TeacherRegistrationState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  registrationId?: string;
};

/**
 * Public teacher registration action
 * Enforces strict deduplication:
 * - Real Full Name + Birthday
 * - OR Cellphone Number
 */
export async function registerTeacherAction(
  prevState: TeacherRegistrationState | null,
  formData: FormData
): Promise<TeacherRegistrationState> {
  try {
    const rawData = {
      displayName: formData.get('displayName'),
      realFullName: formData.get('realFullName'),
      birthday: formData.get('birthday'),
      cellphone: formData.get('cellphone'),
      emergencyContactName: formData.get('emergencyContactName'),
      emergencyContactPhone: formData.get('emergencyContactPhone'),
      address: formData.get('address'),
      schoolAttended: formData.get('schoolAttended'),
      course: formData.get('course'),
      major: formData.get('major'),
      projectType: formData.get('projectType') || 'FT',
      department: formData.get('department') || 'DOMESTIC',
      assignedRestDay: formData.get('assignedRestDay') || 'Sunday',
      portalUsername: formData.get('portalUsername') || undefined,
      portalPassword: formData.get('portalPassword') || undefined,
    };

    const parsed = TeacherRegistrationSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        error: 'Validation failed. Please check the form errors.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      displayName,
      realFullName,
      birthday,
      cellphone,
      emergencyContactName,
      emergencyContactPhone,
      address,
      schoolAttended,
      course,
      major,
      projectType,
      department,
      assignedRestDay,
      portalUsername,
      portalPassword,
    } = parsed.data;

    const parsedBirthday = new Date(birthday);
    if (isNaN(parsedBirthday.getTime())) {
      return {
        error: 'Invalid birthday date format.',
      };
    }

    // Clean cellphone for comparison
    const cleanedCellphone = cellphone.trim();
    const cleanedFullName = realFullName.trim();

    // 1. Strict Deduplication Check: Real Complete Name + Birthday
    // To be precise, check date range for that calendar day
    const startOfDay = new Date(parsedBirthday);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedBirthday);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const duplicateNameAndBirthday = await prisma.teacherProfile.findFirst({
      where: {
        realFullName: {
          equals: cleanedFullName,
          mode: 'insensitive',
        },
        birthday: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (duplicateNameAndBirthday) {
      return {
        error: 'Duplicate registration rejected: An applicant with this Real Complete Name and Birthday already exists.',
      };
    }

    // 2. Strict Deduplication Check: Cellphone Number
    const duplicateCellphone = await prisma.teacherProfile.findUnique({
      where: {
        cellphone: cleanedCellphone,
      },
    });

    if (duplicateCellphone) {
      return {
        error: 'Duplicate registration rejected: An applicant with this Cellphone Number is already registered.',
      };
    }

    // Create TeacherProfile in PENDING state
    const profile = await prisma.teacherProfile.create({
      data: {
        displayName: displayName.trim(),
        realFullName: cleanedFullName,
        birthday: parsedBirthday,
        cellphone: cleanedCellphone,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        address: address.trim(),
        schoolAttended: schoolAttended.trim(),
        course: course.trim(),
        major: major.trim(),
        projectType,
        department,
        assignedRestDay,
        portalUsername: portalUsername ? portalUsername.trim() : null,
        portalPassword: portalPassword ? portalPassword.trim() : null,
        registrationStatus: 'PENDING',
      },
    });

    revalidatePath('/dashboard/teachers');
    return {
      success: true,
      registrationId: profile.id,
    };
  } catch (err: any) {
    console.error('Teacher registration error:', err);
    return {
      error: err.message || 'An unexpected error occurred during registration. Please try again.',
    };
  }
}

/**
 * Admin action: Mark registration as Under Review
 */
export async function reviewTeacherRegistrationAction(teacherProfileId: string, notes?: string) {
  const currentUser = await requirePermission('teachers:review');

  const profile = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
  });

  if (!profile) {
    throw new Error('Teacher registration profile not found.');
  }

  if (profile.registrationStatus !== 'PENDING') {
    throw new Error(`Cannot review profile currently in ${profile.registrationStatus} state.`);
  }

  await prisma.teacherProfile.update({
    where: { id: teacherProfileId },
    data: {
      registrationStatus: 'UNDER_REVIEW',
      reviewedById: currentUser.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/teachers');
  revalidatePath(`/dashboard/teachers/${teacherProfileId}`);
  return { success: true };
}

/**
 * Operations Manager / Admin Action: Final Approval & Account Activation
 * Creates User account, links TeacherProfile, assigns TEACHER role, and generates initial credentials.
 */
export async function approveTeacherRegistrationAction(teacherProfileId: string) {
  const currentUser = await requirePermission('teachers:approve');

  const profile = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
  });

  if (!profile) {
    throw new Error('Teacher registration profile not found.');
  }

  if (profile.registrationStatus === 'APPROVED') {
    throw new Error('This teacher registration has already been approved.');
  }

  // Generate unique username based on real name or display name
  const sanitizedName = profile.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const generatedUsername = `tch_${sanitizedName || 'user'}_${randomSuffix}`;
  const generatedEmail = `${generatedUsername}@teacher.netspeak.internal`;
  
  // Temporary initial password (e.g. Netspeak + 4 random digits + !)
  const tempPassword = `Netspeak${Math.floor(1000 + Math.random() * 9000)}!`;
  const passwordHash = await hashPassword(tempPassword);

  // Retrieve TEACHER role
  const teacherRole = await prisma.role.findUnique({
    where: { name: ROLES.TEACHER },
  });

  if (!teacherRole) {
    throw new Error('TEACHER role definition not found in system.');
  }

  // Create User and link to Profile in transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: generatedUsername,
        email: generatedEmail,
        fullName: profile.realFullName,
        passwordHash,
        isActive: true,
      },
    });

    await tx.userRole.create({
      data: {
        userId: newUser.id,
        roleId: teacherRole.id,
      },
    });

    await tx.teacherProfile.update({
      where: { id: teacherProfileId },
      data: {
        userId: newUser.id,
        registrationStatus: 'APPROVED',
        approvedById: currentUser.id,
        approvedAt: new Date(),
        // If not set during registration, default launchDate to today
        launchDate: profile.launchDate || new Date(),
      },
    });

    return newUser;
  });

  revalidatePath('/dashboard/teachers');
  revalidatePath(`/dashboard/teachers/${teacherProfileId}`);

  return {
    success: true,
    credentials: {
      username: generatedUsername,
      temporaryPassword: tempPassword,
      email: generatedEmail,
      userId: user.id,
    },
  };
}

/**
 * Reject registration with reason
 */
export async function rejectTeacherRegistrationAction(teacherProfileId: string, reason: string) {
  const currentUser = await requirePermission('teachers:review');

  if (!reason || reason.trim().length < 3) {
    throw new Error('A valid reason is required to reject a registration.');
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
  });

  if (!profile) {
    throw new Error('Teacher registration profile not found.');
  }

  await prisma.teacherProfile.update({
    where: { id: teacherProfileId },
    data: {
      registrationStatus: 'REJECTED',
      rejectionReason: reason.trim(),
      reviewedById: currentUser.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath('/dashboard/teachers');
  revalidatePath(`/dashboard/teachers/${teacherProfileId}`);
  return { success: true };
}

/**
 * Update teacher operational details (launch date, project type, department, 51talk credentials)
 */
export async function updateTeacherOperationalAction(
  teacherProfileId: string,
  data: {
    launchDate?: string;
    projectType?: 'FTEX' | 'FT' | 'TTP';
    department?: 'DOMESTIC' | 'OVERSEAS';
    assignedRestDay?: string;
    portalUsername?: string;
    portalPassword?: string;
  }
) {
  await requirePermission('teachers:update');

  await prisma.teacherProfile.update({
    where: { id: teacherProfileId },
    data: {
      launchDate: data.launchDate ? new Date(data.launchDate) : undefined,
      projectType: data.projectType,
      department: data.department,
      assignedRestDay: data.assignedRestDay,
      portalUsername: data.portalUsername,
      portalPassword: data.portalPassword,
    },
  });

  revalidatePath('/dashboard/teachers');
  revalidatePath(`/dashboard/teachers/${teacherProfileId}`);
  return { success: true };
}

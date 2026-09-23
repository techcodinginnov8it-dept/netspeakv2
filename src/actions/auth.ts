'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, invalidateSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginActionState = {
  error?: string;
  success?: boolean;
};

/**
 * Server Action for User Login
 */
export async function loginAction(
  prevState: LoginActionState | null,
  formData: FormData
): Promise<LoginActionState> {
  const rawData = {
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  };

  const parsed = LoginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid form input' };
  }

  const { identifier, password } = parsed.data;

  // Query user by email OR username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() },
      ],
    },
  });

  if (!user) {
    return { error: 'Invalid credentials. Please verify your username/email and password.' };
  }

  if (!user.isActive) {
    return { error: 'Your account is deactivated. Please contact your administrator.' };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return { error: 'Invalid credentials. Please verify your username/email and password.' };
  }

  // Create session
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || undefined;
  const ipAddress =
    headerList.get('x-forwarded-for') ||
    headerList.get('x-real-ip') ||
    undefined;

  await createSession(user.id, userAgent, ipAddress);

  redirect('/dashboard');
}

/**
 * Server Action for User Logout
 */
export async function logoutAction(): Promise<void> {
  await invalidateSession();
  redirect('/login');
}

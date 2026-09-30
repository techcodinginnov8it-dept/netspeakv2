'use server';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email/smtp';

export type PasswordResetResult = {
  success: boolean;
  message: string;
};

export async function requestPasswordResetAction(
  usernameOrEmail: string
): Promise<PasswordResetResult> {
  const query = usernameOrEmail?.trim();
  if (!query) {
    return { success: false, message: 'Please enter your username or email address.' };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: query, mode: 'insensitive' } },
          { email: { equals: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    // Timing-safe response: always give the same message to avoid user enumeration
    if (!user || !user.isActive || !user.email) {
      return {
        success: true,
        message: 'If an active account exists with that identifier, a reset link has been dispatched to your registered email.',
      };
    }

    // Generate high-entropy token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate prior unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Save token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    // Dispatch email
    try {
      await sendPasswordResetEmail({
        recipient: user.email,
        fullName: user.fullName,
        resetUrl,
      });
    } catch (mailError) {
      console.error('[PasswordReset] Failed to send email:', mailError);
      // In development/test environments where SMTP might not be configured:
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[PasswordReset DEV ONLY] Reset URL: ${resetUrl}`);
      }
    }

    return {
      success: true,
      message: 'If an active account exists with that identifier, a reset link has been dispatched to your registered email.',
    };
  } catch (error) {
    console.error('[requestPasswordResetAction] Error:', error);
    return {
      success: false,
      message: 'An error occurred while processing your request. Please try again later.',
    };
  }
}

export async function resetPasswordAction(
  rawToken: string,
  newPassword: string
): Promise<PasswordResetResult> {
  const token = rawToken?.trim();
  const password = newPassword?.trim();

  if (!token) {
    return { success: false, message: 'Invalid or missing reset token.' };
  }

  if (!password || password.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters long.' };
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!resetRecord || !resetRecord.user || !resetRecord.user.isActive) {
      return {
        success: false,
        message: 'This password reset link is invalid or has expired. Please request a new one.',
      };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and invalidate all active user sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);

    return {
      success: true,
      message: 'Your password has been successfully reset. You may now sign in with your new password.',
    };
  } catch (error) {
    console.error('[resetPasswordAction] Error:', error);
    return {
      success: false,
      message: 'Unable to reset password. Please try again.',
    };
  }
}

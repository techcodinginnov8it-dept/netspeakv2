import 'server-only';

import nodemailer from 'nodemailer';

type MailConfiguration = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

function getMailConfiguration(): MailConfiguration {
  const configuredHost = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!configuredHost || !user || !password || !from || !Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.');
  }

  const normalizedHost = configuredHost.includes('@') ? 'smtp.gmail.com' : configuredHost;
  if (!normalizedHost.includes('.')) {
    throw new Error('SMTP_HOST must be a valid SMTP server hostname such as smtp.gmail.com.');
  }

  return {
    host: normalizedHost,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    user,
    password,
    from,
  };
}

function getTransport() {
  const configuration = getMailConfiguration();

  return nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    auth: {
      user: configuration.user,
      pass: configuration.password,
    },
  });
}

export async function verifySmtpConnection() {
  await getTransport().verify();
}

export async function sendTeacherCredentialsEmail({
  recipient,
  fullName,
  username,
  temporaryPassword,
}: {
  recipient: string;
  fullName: string;
  username: string;
  temporaryPassword: string;
}) {
  const configuration = getMailConfiguration();
  const loginUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/login`;

  await getTransport().sendMail({
    from: configuration.from,
    to: recipient,
    subject: 'Your Netspeak Portal account is ready',
    text: [
      `Hello ${fullName},`,
      '',
      'Your Netspeak Portal registration has been approved.',
      `Username: ${username}`,
      `Temporary password: ${temporaryPassword}`,
      `Sign in: ${loginUrl}`,
      '',
      'For your security, change your temporary password as soon as a password-change workflow is available.',
    ].join('\n'),
  });
}

export async function sendPasswordResetEmail({
  recipient,
  fullName,
  resetUrl,
}: {
  recipient: string;
  fullName: string;
  resetUrl: string;
}) {
  const configuration = getMailConfiguration();

  await getTransport().sendMail({
    from: configuration.from,
    to: recipient,
    subject: 'Reset your Netspeak Portal password',
    text: [
      `Hello ${fullName},`,
      '',
      'A password reset request was requested for your Netspeak Portal account.',
      '',
      `Please use the following link to reset your password (valid for 1 hour):`,
      resetUrl,
      '',
      'If you did not request this, please disregard this email. Your password will remain unchanged.',
    ].join('\n'),
  });
}


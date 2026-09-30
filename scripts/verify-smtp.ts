import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';

const requiredVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const;

async function getEnvironmentValue(name: string) {
  if (process.env[name]) return process.env[name];

  try {
    const envFile = await readFile(resolve('.env'), 'utf8');
    const match = envFile.match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^\\r\\n"']*)`, 'm'));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const configuration = Object.fromEntries(
  await Promise.all(requiredVariables.map(async (name) => [name, await getEnvironmentValue(name)] as const))
) as Record<(typeof requiredVariables)[number], string | undefined>;
const missing = requiredVariables.filter((name) => !configuration[name]);

if (missing.length > 0) {
  console.error(`SMTP is not configured. Add ${missing.join(' and ')} to .env.`);
  process.exitCode = 1;
} else if (configuration.SMTP_HOST!.includes('@')) {
  console.error('SMTP_HOST must be an SMTP server hostname such as smtp.gmail.com. Put the sending email address in SMTP_USER.');
  process.exitCode = 1;
} else {
  const secure = (await getEnvironmentValue('SMTP_SECURE')) === 'true';
  const transport = nodemailer.createTransport({
    host: configuration.SMTP_HOST!,
    port: Number(configuration.SMTP_PORT!),
    secure,
    auth: { user: configuration.SMTP_USER!, pass: configuration.SMTP_PASSWORD! },
  });

  await transport.verify();
  console.log('SMTP authentication and transport verification passed.');
}

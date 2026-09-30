import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const requiredVariables = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const buckets = ['freshness-checks', 'ticket-evidence'] as const;

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

const values = await Promise.all(requiredVariables.map(async (name) => [name, await getEnvironmentValue(name)] as const));
const configuration = Object.fromEntries(values) as Record<(typeof requiredVariables)[number], string | undefined>;
const missing = requiredVariables.filter((name) => !configuration[name]);

if (missing.length > 0) {
  console.error(`Supabase Storage is not configured. Add ${missing.join(' and ')} to .env.`);
  process.exitCode = 1;
} else {
  const supabase = createClient(configuration.NEXT_PUBLIC_SUPABASE_URL!, configuration.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let failed = false;
  for (const bucket of buckets) {
    const { error } = await supabase.storage.getBucket(bucket);
    if (error) {
      console.warn(`${bucket}: not available yet (${error.message}). The application will create it on its first upload.`);
    } else {
      console.log(`${bucket}: available`);
    }
  }

  if (failed) process.exitCode = 1;
}

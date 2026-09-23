import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Build the DATABASE_URL with PgBouncer-safe connection parameters.
 * Supabase pooler (port 6543) uses PgBouncer in transaction mode.
 * These params prevent Prisma from hanging on dropped idle connections:
 *   - connect_timeout   — abort connection attempt after N seconds
 *   - pool_timeout      — abort wait for an available connection after N seconds
 *   - socket_timeout    — abort an idle socket after N seconds
 *   - connection_limit  — cap Prisma's own internal pool (1 = safe for serverless)
 */
function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? '';
  if (!base) return base;

  try {
    const url = new URL(base);
    // Only add if not already present
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '15');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30');
    }
    if (!url.searchParams.has('socket_timeout')) {
      url.searchParams.set('socket_timeout', '30');
    }
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '10');
    }
    return url.toString();
  } catch {
    return base;
  }
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

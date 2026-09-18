import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";

/**
 * Database client.
 *
 * - Works with any Postgres: local, Supabase, Neon, Railway, Docker, etc.
 * - SSL is switched on automatically for remote hosts (Supabase/Neon require it)
 *   and off for localhost / Docker networks. Override with `?sslmode=` in the URL:
 *     sslmode=disable      → no SSL (e.g. Postgres inside a Coolify/Docker network)
 *     sslmode=require      → encrypted, certificate not verified (default for remote)
 *     sslmode=verify-full  → encrypted + certificate verified
 * - The pool is created lazily, so `next build` succeeds even when DATABASE_URL
 *   is not set yet (it is only needed at runtime).
 */

type Db = NodePgDatabase;

const globalForDb = globalThis as typeof globalThis & {
  __workpulsePool?: Pool;
  __workpulseDb?: Db;
};

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "host.docker.internal"];

function poolConfig(raw: string): PoolConfig {
  const hostPart = raw.split("@").pop() ?? "";
  const isLocal = LOCAL_HOSTS.some((h) => hostPart.startsWith(h));

  const match = raw.match(/[?&]sslmode=([^&]*)/);
  const sslmode = (match?.[1] || process.env.PGSSLMODE || (isLocal ? "disable" : "require")).toLowerCase();

  // Remove sslmode from the URL so pg doesn't override the explicit `ssl` option below.
  const connectionString = match
    ? raw.replace(/([?&])sslmode=[^&]*&/, "$1").replace(/[?&]sslmode=[^&]*$/, "")
    : raw;

  const ssl: PoolConfig["ssl"] =
    sslmode === "disable"
      ? false
      : sslmode === "verify-full" || sslmode === "verify-ca"
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false };

  return {
    connectionString,
    ssl,
    max: isLocal ? 10 : 5, // keep the pool small on serverless hosts
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_000,
  };
}

export function getPool(): Pool {
  if (globalForDb.__workpulsePool) return globalForDb.__workpulsePool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env for local development or to your host's environment variables (Vercel → Settings → Environment Variables)."
    );
  }
  const pool = new Pool(poolConfig(url));
  pool.on("error", (err) => console.error("Postgres pool error:", err.message));
  globalForDb.__workpulsePool = pool;
  return pool;
}

export function getDb(): Db {
  if (!globalForDb.__workpulseDb) {
    globalForDb.__workpulseDb = drizzle(getPool());
  }
  return globalForDb.__workpulseDb;
}

// Lazy proxy so importing this module never requires DATABASE_URL (e.g. during `next build`).
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});

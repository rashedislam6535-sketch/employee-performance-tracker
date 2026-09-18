import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getMemoryStore } from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getMemoryStore();
  let dbStatus = "not_configured";
  let dbError: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      await db.execute(sql`select 1`);
      dbStatus = "connected";
    } catch (err: any) {
      dbStatus = "authentication_or_network_failed";
      dbError = err.message || "Database connection error";
    }
  }

  return NextResponse.json({
    ok: true,
    status: dbStatus === "connected" ? "healthy" : "degraded_local_fallback",
    database: {
      status: dbStatus,
      configured: Boolean(process.env.DATABASE_URL),
      error: dbError,
    },
    localStore: {
      active: true,
      persistedToDisk: true,
      usersCount: store.users.length,
      activitiesCount: store.activities.length,
      attendanceCount: store.attendance.length,
      reportsCount: store.reports.length,
    },
    timestamp: new Date().toISOString(),
  });
}

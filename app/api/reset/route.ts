import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyUpdates, reports, attendanceCheckIns, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Deletes every entry, report, check-in and notification for a user. The profile is kept. */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const id = Number(userId);
    await db.delete(dailyUpdates).where(eq(dailyUpdates.userId, id));
    await db.delete(reports).where(eq(reports.userId, id));
    await db.delete(attendanceCheckIns).where(eq(attendanceCheckIns.userId, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

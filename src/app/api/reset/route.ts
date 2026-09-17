import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyUpdates, reports, attendanceCheckIns, notifications, activities, attendance } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveEmployee } from "@/lib/data";

/** Deletes every entry, activity, report, attendance record and notification for a user. The profile is kept. */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const { user, employee } = await resolveEmployee(userId);

    await db.delete(dailyUpdates).where(eq(dailyUpdates.userId, user.id));
    await db.delete(activities).where(eq(activities.employeeId, employee.id));
    await db.delete(attendance).where(eq(attendance.employeeId, employee.id)); // breaks cascade
    await db.delete(reports).where(eq(reports.userId, user.id));
    await db.delete(attendanceCheckIns).where(eq(attendanceCheckIns.userId, user.id));
    await db.delete(notifications).where(eq(notifications.userId, user.id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

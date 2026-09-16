import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceCheckIns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { toDateStr } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, status, note, date, checkInTime } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const dateStr =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toDateStr(new Date());
    const timeStr =
      typeof checkInTime === "string" && checkInTime.trim()
        ? checkInTime.trim()
        : new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const existing = await db
      .select()
      .from(attendanceCheckIns)
      .where(and(eq(attendanceCheckIns.userId, Number(userId)), eq(attendanceCheckIns.date, dateStr)));

    if (existing.length > 0) {
      const updated = await db
        .update(attendanceCheckIns)
        .set({
          status: status || existing[0].status,
          note: note !== undefined ? note : existing[0].note,
        })
        .where(eq(attendanceCheckIns.id, existing[0].id))
        .returning();
      return NextResponse.json({ success: true, checkIn: updated[0] });
    }

    const inserted = await db
      .insert(attendanceCheckIns)
      .values({
        userId: Number(userId),
        date: dateStr,
        checkInTime: timeStr,
        status: status || "present",
        note: note || null,
      })
      .returning();

    return NextResponse.json({ success: true, checkIn: inserted[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

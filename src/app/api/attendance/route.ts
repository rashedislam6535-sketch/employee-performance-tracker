import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, breaks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { resolveEmployee, buildAttendanceRecord } from "@/lib/data";
import { toDateStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

const validDate = (s: unknown) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : toDateStr(new Date()));

async function loadDay(employeeId: number, date: string) {
  const rec = (await db.select().from(attendance).where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, date))))[0];
  if (!rec) return null;
  const brks = await db.select().from(breaks).where(eq(breaks.attendanceId, rec.id));
  return buildAttendanceRecord(rec, brks);
}

/** GET ?userId=&date= → today's attendance record (or null). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { employee } = await resolveEmployee(searchParams.get("userId"));
    const date = validDate(searchParams.get("date"));
    return NextResponse.json({ attendance: await loadDay(employee.id, date) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST { userId, action: "check-in" | "check-out" | "break-start" | "break-end", date, location?, device? }
 * Working time = check-out − check-in − total breaks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, location, device } = body;
    const date = validDate(body.date);
    const now = new Date();

    const { employee } = await resolveEmployee(userId);
    const existing = (await db.select().from(attendance).where(and(eq(attendance.employeeId, employee.id), eq(attendance.date, date))))[0];
    const fail = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

    if (action === "check-in") {
      if (existing?.checkIn) return fail("You are already checked in for this day.");
      if (existing) {
        await db
          .update(attendance)
          .set({ checkIn: now, location: location || null, device: device || null, checkOut: null, workingMinutes: null })
          .where(eq(attendance.id, existing.id));
      } else {
        await db.insert(attendance).values({
          employeeId: employee.id,
          date,
          checkIn: now,
          location: typeof location === "string" && location.trim() ? location.trim().slice(0, 80) : null,
          device: typeof device === "string" && device.trim() ? device.trim().slice(0, 80) : null,
        });
      }
      return NextResponse.json({ success: true, attendance: await loadDay(employee.id, date) });
    }

    if (!existing?.checkIn) return fail("Check in first.");
    if (existing.checkOut) return fail("You have already checked out for this day.");

    const openBreaks = await db.select().from(breaks).where(eq(breaks.attendanceId, existing.id));
    const open = openBreaks.find((b) => !b.endTime);

    if (action === "break-start") {
      if (open) return fail("A break is already running.");
      await db.insert(breaks).values({ attendanceId: existing.id, startTime: now });
      return NextResponse.json({ success: true, attendance: await loadDay(employee.id, date) });
    }

    if (action === "break-end") {
      if (!open) return fail("No break is running.");
      const minutes = Math.max(0, Math.round((now.getTime() - new Date(open.startTime).getTime()) / 60000));
      await db.update(breaks).set({ endTime: now, durationMinutes: minutes }).where(eq(breaks.id, open.id));
      return NextResponse.json({ success: true, attendance: await loadDay(employee.id, date) });
    }

    if (action === "check-out") {
      if (open) {
        const minutes = Math.max(0, Math.round((now.getTime() - new Date(open.startTime).getTime()) / 60000));
        await db.update(breaks).set({ endTime: now, durationMinutes: minutes }).where(eq(breaks.id, open.id));
      }
      const all = await db.select().from(breaks).where(eq(breaks.attendanceId, existing.id));
      const breakMinutes = all.reduce((a, b) => a + (b.durationMinutes ?? 0), 0);
      const elapsed = Math.round((now.getTime() - new Date(existing.checkIn).getTime()) / 60000);
      await db
        .update(attendance)
        .set({ checkOut: now, workingMinutes: Math.max(0, elapsed - breakMinutes) })
        .where(eq(attendance.id, existing.id));
      return NextResponse.json({ success: true, attendance: await loadDay(employee.id, date) });
    }

    return fail("Unknown action.");
  } catch (error: any) {
    console.error("Attendance API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

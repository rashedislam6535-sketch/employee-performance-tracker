import { db } from "@/db";
import { users, employees, dailyUpdates, activities, attendance, breaks } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { ensureSeedData } from "@/db/seed";
import { activityLabel, dateKey, emptyTotals, num, taskTypeToActivityType, Totals } from "@/lib/utils";
import type { AttendanceRecord, Entry, EmployeeProfile, User } from "@/types";

export const publicUser = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  department: users.department,
  avatar: users.avatar,
};

type EmployeeRow = typeof employees.$inferSelect;

export function toProfile(e: EmployeeRow): EmployeeProfile {
  return {
    id: e.id,
    userId: e.userId,
    name: e.name,
    nickname: e.nickname,
    photo: e.photo,
    dob: e.dob ? dateKey(e.dob) : null,
    phone: e.phone,
    bloodGroup: e.bloodGroup,
    email: e.email,
    department: e.department,
    designation: e.designation,
    employeeCode: e.employeeCode,
    availability: e.availability,
  };
}

/** Finds the user (or falls back to the first one) and guarantees an employee profile exists. */
export async function resolveEmployee(userIdParam?: string | number | null): Promise<{ user: User; employee: EmployeeProfile }> {
  await ensureSeedData();
  let user = userIdParam
    ? (await db.select(publicUser).from(users).where(eq(users.id, Number(userIdParam))))[0]
    : undefined;
  if (!user) user = (await db.select(publicUser).from(users).orderBy(users.id).limit(1))[0];
  if (!user) throw new Error("No user found");

  let emp = (await db.select().from(employees).where(eq(employees.userId, user.id)).limit(1))[0];
  if (!emp) {
    emp = (
      await db
        .insert(employees)
        .values({ userId: user.id, name: user.name, email: user.email, department: user.department })
        .returning()
    )[0];
  }
  return { user: user as User, employee: toProfile(emp) };
}

/* ---------- Entries (both log tables, normalised) ---------- */

export async function loadEntries(userId: number, employeeId: number): Promise<Entry[]> {
  const [updates, acts] = await Promise.all([
    db.select().from(dailyUpdates).where(eq(dailyUpdates.userId, userId)),
    db.select().from(activities).where(eq(activities.employeeId, employeeId)),
  ]);

  const list: Entry[] = [];

  for (const u of updates) {
    list.push({
      id: `update-${u.id}`,
      source: "update",
      rawId: u.id,
      date: dateKey(u.date),
      type: taskTypeToActivityType(u.taskType),
      label: u.taskType,
      description: u.description,
      tickets: num(u.tickets),
      chats: num(u.chats),
      kyc: num(u.kyc),
      calls: num(u.calls),
      emails: num(u.emails),
      trainingHours: num(u.trainingHours),
      quantity: null,
      country: null,
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      attachmentName: u.attachmentName ?? null,
      createdAt: new Date(u.createdAt).toISOString(),
    });
  }

  for (const a of acts) {
    const qty = num(a.quantity);
    const t = emptyTotals();
    if (a.type === "kyc") t.kyc = qty;
    else if (a.type === "ticket") t.tickets = qty || 1;
    else if (a.type === "chat") t.chats = qty;
    else if (a.type === "call") t.calls = qty;
    else if (a.type === "email") t.emails = qty;
    else if (a.type === "training") t.trainingHours = qty;
    list.push({
      id: `activity-${a.id}`,
      source: "activity",
      rawId: a.id,
      date: dateKey(a.date),
      type: a.type,
      label: activityLabel(a.type),
      description: a.description ?? "",
      ...t,
      quantity: qty,
      country: a.country,
      accountId: a.accountId,
      ticketCategory: a.ticketCategory,
      priority: a.priority,
      status: a.status,
      attachmentName: null,
      createdAt: new Date(a.createdAt).toISOString(),
    });
  }

  list.sort((x, y) => (x.date === y.date ? y.createdAt.localeCompare(x.createdAt) : y.date.localeCompare(x.date)));
  return list;
}

export function sumEntries(list: Entry[]): Totals & { count: number } {
  const t = { ...emptyTotals(), count: 0 };
  for (const e of list) {
    t.tickets += e.tickets;
    t.chats += e.chats;
    t.kyc += e.kyc;
    t.calls += e.calls;
    t.emails += e.emails;
    t.trainingHours += e.trainingHours;
    t.count += 1;
  }
  t.trainingHours = Number(t.trainingHours.toFixed(2));
  return t;
}

export function groupByDate<T extends { date: string }>(list: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const e of list) (map[e.date] ||= []).push(e);
  return map;
}

/* ---------- Attendance ---------- */

type AttendanceRow = typeof attendance.$inferSelect;
type BreakRow = typeof breaks.$inferSelect;

const toIso = (v: Date | string | null | undefined) => (v ? new Date(v).toISOString() : null);

export function buildAttendanceRecord(rec: AttendanceRow, brks: BreakRow[], now = new Date()): AttendanceRecord {
  const checkIn = rec.checkIn ? new Date(rec.checkIn) : null;
  const checkOut = rec.checkOut ? new Date(rec.checkOut) : null;

  const breakList = brks
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map((b) => {
      const start = new Date(b.startTime);
      const end = b.endTime ? new Date(b.endTime) : null;
      const minutes =
        b.durationMinutes ?? Math.max(0, Math.round(((end ?? now).getTime() - start.getTime()) / 60000));
      return { id: b.id, startTime: start.toISOString(), endTime: end ? end.toISOString() : null, durationMinutes: minutes, ongoing: !end };
    });

  const breakMinutes = breakList.reduce((a, b) => a + b.durationMinutes, 0);
  let workingMinutes = rec.workingMinutes;
  if ((workingMinutes === null || workingMinutes === undefined) && checkIn) {
    const end = checkOut ?? now;
    workingMinutes = Math.max(0, Math.round((end.getTime() - checkIn.getTime()) / 60000) - breakMinutes);
  }
  const onBreak = breakList.some((b) => b.ongoing);

  return {
    id: rec.id,
    date: dateKey(rec.date),
    checkIn: toIso(checkIn),
    checkOut: toIso(checkOut),
    location: rec.location,
    device: rec.device,
    breaks: breakList,
    breakMinutes,
    workingMinutes: workingMinutes ?? 0,
    onBreak,
    status: !checkIn ? "not_checked_in" : checkOut ? "checked_out" : onBreak ? "on_break" : "working",
  };
}

export async function loadAttendance(employeeId: number): Promise<AttendanceRecord[]> {
  const rows = await db.select().from(attendance).where(eq(attendance.employeeId, employeeId)).orderBy(desc(attendance.date));
  if (rows.length === 0) return [];
  const brks = await db.select().from(breaks).where(inArray(breaks.attendanceId, rows.map((r) => r.id)));
  const byAtt: Record<number, BreakRow[]> = {};
  for (const b of brks) (byAtt[b.attendanceId] ||= []).push(b);
  const now = new Date();
  return rows.map((r) => buildAttendanceRecord(r, byAtt[r.id] || [], now));
}

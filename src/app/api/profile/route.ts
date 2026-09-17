import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveEmployee, toProfile } from "@/lib/data";
import { AVAILABILITY_OPTIONS, BLOOD_GROUPS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 400_000; // ~300 KB image as base64

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { employee } = await resolveEmployee(searchParams.get("userId"));
    return NextResponse.json({ employee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH { userId, name?, nickname?, dob?, phone?, bloodGroup?, email?, department?, designation?, employeeCode?, availability?, photo? }
 * photo: data URL to set, null to remove, undefined to keep.
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { employee } = await resolveEmployee(body.userId);

    const text = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) || null : undefined);
    const set: Partial<typeof employees.$inferInsert> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      const name = text(body.name);
      if (!name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
      set.name = name;
    }
    if (body.nickname !== undefined) set.nickname = text(body.nickname, 60);
    if (body.phone !== undefined) set.phone = text(body.phone, 40);
    if (body.email !== undefined) set.email = text(body.email, 160);
    if (body.department !== undefined) set.department = text(body.department);
    if (body.designation !== undefined) set.designation = text(body.designation);
    if (body.employeeCode !== undefined) set.employeeCode = text(body.employeeCode, 40);
    if (body.dob !== undefined) {
      const dob = typeof body.dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dob) ? body.dob : null;
      set.dob = dob;
    }
    if (body.bloodGroup !== undefined) {
      const bg = text(body.bloodGroup, 5);
      if (bg && !BLOOD_GROUPS.includes(bg)) return NextResponse.json({ error: "Invalid blood group." }, { status: 400 });
      set.bloodGroup = bg;
    }
    if (body.availability !== undefined) {
      if (!AVAILABILITY_OPTIONS.some((a) => a.id === body.availability)) {
        return NextResponse.json({ error: "Invalid availability status." }, { status: 400 });
      }
      set.availability = body.availability;
    }
    if (body.photo !== undefined) {
      if (body.photo === null || body.photo === "") {
        set.photo = null;
      } else if (typeof body.photo === "string" && body.photo.startsWith("data:image/")) {
        if (body.photo.length > MAX_PHOTO_BYTES) return NextResponse.json({ error: "Photo is too large. Please choose a smaller image." }, { status: 400 });
        set.photo = body.photo;
      } else {
        return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
      }
    }

    const [row] = await db.update(employees).set(set).where(eq(employees.id, employee.id)).returning();

    // Keep the legacy users table in sync (name / department are shown across the app).
    if (set.name || set.department !== undefined) {
      await db
        .update(users)
        .set({ ...(set.name ? { name: set.name } : {}), ...(set.department ? { department: set.department } : {}) })
        .where(eq(users.id, employee.userId));
    }

    const user = (await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, department: users.department, avatar: users.avatar }).from(users).where(eq(users.id, employee.userId)))[0];
    return NextResponse.json({ success: true, employee: toProfile(row), user });
  } catch (error: any) {
    console.error("Profile PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

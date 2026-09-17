import { NextResponse } from "next/server";
import { resolveEmployee, loadEntries, loadAttendance } from "@/lib/data";

export const dynamic = "force-dynamic";

/** GET ?userId= → every log entry (both tables, normalised) plus the attendance history. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { user, employee } = await resolveEmployee(searchParams.get("userId"));
    const [entries, attendance] = await Promise.all([loadEntries(user.id, employee.id), loadAttendance(employee.id)]);
    return NextResponse.json({ entries, attendance, employee });
  } catch (error: any) {
    console.error("Entries API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

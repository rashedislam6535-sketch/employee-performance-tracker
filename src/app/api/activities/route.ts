import { NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveEmployee } from "@/lib/data";
import { ACTIVITY_TYPES, KYC_COUNTRIES, PRIORITIES, TICKET_CATEGORIES, TICKET_STATUSES, toDateStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Payload = {
  date?: string;
  type?: string;
  quantity?: number | string;
  country?: string | null;
  accountId?: string | null;
  ticketCategory?: string | null;
  priority?: string | null;
  status?: string | null;
  description?: string | null;
};

const str = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Validates and normalises an activity payload. Returns an error message or the clean values. */
function normalise(p: Payload): { error?: string; values?: Omit<typeof activities.$inferInsert, "employeeId"> } {
  const type = String(p.type || "");
  if (!ACTIVITY_TYPES.some((t) => t.id === type)) return { error: "Choose an activity type." };
  const date = typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : toDateStr(new Date());
  const description = str(p.description, 2000);
  let quantity = Number(p.quantity);

  if (type === "kyc") {
    if (!Number.isInteger(quantity) || quantity < 1) return { error: "Enter how many verifications you completed." };
    const country = str(p.country, 60);
    if (!country || !KYC_COUNTRIES.includes(country)) return { error: "Select a country." };
    return { values: { date, type, quantity: String(quantity), country, description } };
  }

  if (type === "ticket") {
    const accountId = str(p.accountId, 40);
    if (!accountId) return { error: "Enter the MT Account ID." };
    const ticketCategory = str(p.ticketCategory, 60);
    if (!ticketCategory || !TICKET_CATEGORIES.includes(ticketCategory)) return { error: "Select a ticket type." };
    const priority = str(p.priority, 10) ?? "Medium";
    if (!(PRIORITIES as readonly string[]).includes(priority)) return { error: "Select a priority." };
    const status = str(p.status, 20) ?? "Pending";
    if (!(TICKET_STATUSES as readonly string[]).includes(status)) return { error: "Select a status." };
    return { values: { date, type, quantity: "1", accountId, ticketCategory, priority, status, description } };
  }

  if (type === "chat" || type === "call" || type === "email") {
    if (!Number.isInteger(quantity) || quantity < 1) return { error: "Enter a quantity of at least 1." };
    return { values: { date, type, quantity: String(quantity), description } };
  }

  if (type === "training" || type === "meeting") {
    if (!Number.isFinite(quantity) || quantity <= 0) quantity = type === "meeting" ? 0.5 : 0;
    if (type === "training" && quantity <= 0) return { error: "Enter the number of training hours." };
    if (type === "meeting" && !description) return { error: "Describe the meeting." };
    return { values: { date, type, quantity: quantity.toFixed(2), description } };
  }

  // other
  if (!description) return { error: "Add a short description." };
  if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;
  return { values: { date, type, quantity: String(quantity), description } };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { employee } = await resolveEmployee(searchParams.get("userId"));
    const rows = await db.select().from(activities).where(eq(activities.employeeId, employee.id));
    return NextResponse.json({ activities: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload & { userId?: number };
    const { employee } = await resolveEmployee(body.userId);
    const { error, values } = normalise(body);
    if (error || !values) return NextResponse.json({ error }, { status: 400 });
    const [row] = await db.insert(activities).values({ ...values, employeeId: employee.id }).returning();
    return NextResponse.json({ success: true, activity: row });
  } catch (error: any) {
    console.error("Activities POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Payload & { id?: number };
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const current = (await db.select().from(activities).where(eq(activities.id, Number(body.id))))[0];
    if (!current) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    const merged: Payload = {
      date: body.date ?? String(current.date),
      type: body.type ?? current.type,
      quantity: body.quantity ?? current.quantity,
      country: body.country !== undefined ? body.country : current.country,
      accountId: body.accountId !== undefined ? body.accountId : current.accountId,
      ticketCategory: body.ticketCategory !== undefined ? body.ticketCategory : current.ticketCategory,
      priority: body.priority !== undefined ? body.priority : current.priority,
      status: body.status !== undefined ? body.status : current.status,
      description: body.description !== undefined ? body.description : current.description,
    };
    const { error, values } = normalise(merged);
    if (error || !values) return NextResponse.json({ error }, { status: 400 });
    const [row] = await db.update(activities).set(values).where(eq(activities.id, current.id)).returning();
    return NextResponse.json({ success: true, activity: row });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(activities).where(eq(activities.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

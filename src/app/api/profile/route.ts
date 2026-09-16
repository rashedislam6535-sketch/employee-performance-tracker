import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, department } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanDept = typeof department === "string" ? department.trim() : "";
    if (!cleanName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set({ name: cleanName, department: cleanDept || "General" })
      .where(eq(users.id, Number(userId)))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        avatar: users.avatar,
      });

    if (!updated[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: updated[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

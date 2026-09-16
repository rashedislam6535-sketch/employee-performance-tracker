import { NextResponse } from "next/server";
import { ensureSeedData } from "@/db/seed";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST() {
  try {
    await ensureSeedData();
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      department: users.department,
      avatar: users.avatar,
    }).from(users);

    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
